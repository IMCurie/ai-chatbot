import {
  dynamicTool,
  jsonSchema,
  type JSONSchema7,
  type ToolSet,
} from "ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport, SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export interface McpHttpHeader {
  key: string;
  value: string;
}

export interface McpServerRuntimeConfig {
  id: string;
  url: string;
  headers?: McpHttpHeader[];
}

export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface McpCallToolOptions {
  server: McpServerRuntimeConfig;
  toolName: string;
  input?: unknown;
}

export interface McpCallToolResult {
  toolName: string;
  result: unknown;
}

export interface McpChatServerConfig extends McpServerRuntimeConfig {
  enabledTools?: string[];
}

export interface McpToolSummary {
  name: string;
  serverId: string;
  description?: string;
}

export interface LoadedMcpTools {
  tools: ToolSet;
  toolSummaries: McpToolSummary[];
  cleanup: () => Promise<void>;
  warnings: string[];
}

class StreamableHTTPConnectionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamableHTTPConnectionTimeoutError";
  }
}

interface McpClientConnection {
  client: Client;
  transport: "streamable-http" | "sse";
  cleanup: () => Promise<void>;
}

const MCP_CLIENT_INFO = {
  name: "ai-chatbot",
  version: "0.1.0",
} as const;

const MCP_CAPABILITIES = {
  tools: {},
} as const;

const STREAMABLE_HTTP_CONNECT_TIMEOUT_MS = 5_000;

export class McpTransportError extends Error {
  public readonly status: number;

  constructor(message: string, options?: { cause?: unknown; status?: number }) {
    super(message);
    this.name = "McpTransportError";
    this.status = options?.status ?? 500;

    if (options?.cause) {
      try {
        (this as Error).cause = options.cause;
      } catch {
        // ignore if assigning cause fails (older runtimes)
      }
    }
  }
}

const buildHeaderRecord = (headers?: McpHttpHeader[]) => {
  const record: Record<string, string> = {};

  if (!Array.isArray(headers)) {
    return record;
  }

  headers.forEach(({ key, value }) => {
    if (typeof key !== "string") {
      return;
    }

    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }

    record[normalizedKey] = typeof value === "string" ? value : "";
  });

  return record;
};

const headersInitFromRecord = (headers: Record<string, string>) =>
  Object.keys(headers).length > 0 ? (headers as HeadersInit) : undefined;

const mapMcpErrorCodeToStatus = (code: number | undefined) => {
  switch (code) {
    case ErrorCode.InvalidRequest:
    case ErrorCode.InvalidParams:
      return 400;
    case ErrorCode.MethodNotFound:
      return 404;
    case ErrorCode.RequestTimeout:
      return 504;
    case ErrorCode.ConnectionClosed:
      return 502;
    case ErrorCode.InternalError:
    case ErrorCode.ParseError:
    default:
      return 502;
  }
};

const mapHttpCodeToStatus = (code: number | undefined) => {
  if (typeof code === "number" && Number.isFinite(code) && code >= 400 && code <= 599) {
    return code;
  }

  return 502;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const shouldFallbackToSse = (error: unknown) => {
  if (error instanceof StreamableHTTPError) {
    return (
      typeof error.code !== "number" ||
      (error.code >= 400 && error.code <= 599)
    );
  }

  if (error instanceof StreamableHTTPConnectionTimeoutError) {
    return true;
  }

  return false;
};

const toMcpTransportError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof McpTransportError) {
    return error;
  }

  if (error instanceof McpError) {
    return new McpTransportError(`${fallbackMessage}: ${error.message}`, {
      cause: error,
      status: mapMcpErrorCodeToStatus(error.code),
    });
  }

  if (error instanceof StreamableHTTPError || error instanceof SseError) {
    return new McpTransportError(`${fallbackMessage}: ${error.message}`, {
      cause: error,
      status: mapHttpCodeToStatus(error.code),
    });
  }

  if (error instanceof StreamableHTTPConnectionTimeoutError) {
    return new McpTransportError(`${fallbackMessage}: ${error.message}`, {
      cause: error,
      status: 504,
    });
  }

  if (error instanceof Error) {
    return new McpTransportError(`${fallbackMessage}: ${error.message}`, {
      cause: error,
      status: 502,
    });
  }

  return new McpTransportError(fallbackMessage, {
    cause: error,
    status: 502,
  });
};

const createClient = () =>
  new Client(MCP_CLIENT_INFO, {
    capabilities: MCP_CAPABILITIES,
  });

const connectWithStreamableHttp = async (
  endpoint: URL,
  headers: HeadersInit | undefined
): Promise<McpClientConnection> => {
  const client = createClient();
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: headers ? { headers } : undefined,
  });

  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        new StreamableHTTPConnectionTimeoutError(
          "Timed out waiting for Streamable HTTP connection"
        )
      );
    }, STREAMABLE_HTTP_CONNECT_TIMEOUT_MS);

    connectPromise.finally(() => {
      clearTimeout(timer);
    });
  });

  try {
    await Promise.race([connectPromise, timeoutPromise]);

    return {
      client,
      transport: "streamable-http",
      cleanup: async () => {
        await client.close();
      },
    };
  } catch (error) {
    await transport.close().catch(() => {
      /* swallow transport close errors */
    });
    throw error;
  }
};

const connectWithSse = async (
  endpoint: URL,
  headers: HeadersInit | undefined
): Promise<McpClientConnection> => {
  const client = createClient();
  const transport = new SSEClientTransport(endpoint, {
    requestInit: headers ? { headers } : undefined,
  });

  try {
    await client.connect(transport);

    return {
      client,
      transport: "sse",
      cleanup: async () => {
        await client.close();
      },
    };
  } catch (error) {
    await transport.close().catch(() => {
      /* swallow transport close errors */
    });
    throw error;
  }
};

const createMcpClientConnection = async (
  server: McpServerRuntimeConfig
): Promise<McpClientConnection> => {
  const headers = buildHeaderRecord(server.headers);
  const headersInit = headersInitFromRecord(headers);
  const endpoint = new URL(server.url);

  try {
    return await connectWithStreamableHttp(endpoint, headersInit);
  } catch (error) {
    if (!shouldFallbackToSse(error)) {
      throw error;
    }
  }

  return connectWithSse(endpoint, headersInit);
};

const assertToolsCapability = (
  connection: McpClientConnection,
  serverId: string
) => {
  const capabilities = connection.client.getServerCapabilities();

  if (!capabilities?.tools) {
    throw new McpTransportError(
      `MCP 服务 ${serverId} 未声明工具能力`,
      {
        status: 400,
      }
    );
  }
};

export async function listMcpTools(
  server: McpServerRuntimeConfig
): Promise<McpToolDescriptor[]> {
  if (!server.url || typeof server.url !== "string") {
    throw new McpTransportError("Missing MCP server URL", { status: 400 });
  }

  let connection: McpClientConnection | null = null;

  try {
    connection = await createMcpClientConnection(server);
    assertToolsCapability(connection, server.id ?? "unknown");

    const listResult = await connection.client.listTools();

    return listResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
    }));
  } catch (error) {
    throw toMcpTransportError(error, "Failed to list MCP tools");
  } finally {
    if (connection) {
      try {
        await connection.cleanup();
      } catch {
        // swallow cleanup errors
      }
    }
  }
}

export async function callMcpTool({
  server,
  toolName,
  input,
}: McpCallToolOptions): Promise<McpCallToolResult> {
  if (!toolName || typeof toolName !== "string") {
    throw new McpTransportError("Tool name is required", { status: 400 });
  }

  if (!server.url || typeof server.url !== "string") {
    throw new McpTransportError("Missing MCP server URL", { status: 400 });
  }

  let connection: McpClientConnection | null = null;

  try {
    connection = await createMcpClientConnection(server);
    assertToolsCapability(connection, server.id ?? "unknown");

    console.info(
      `[MCP] Calling tool ${toolName} on ${server.id ?? "unknown"}`,
      isPlainObject(input) ? { input } : { inputType: typeof input }
    );

    const result = await connection.client.callTool({
      name: toolName,
      arguments: isPlainObject(input) ? input : undefined,
    });

    console.info(
      `[MCP] Tool ${toolName} on ${server.id ?? "unknown"} returned`,
      {
        hasContent: Array.isArray(result.content) && result.content.length > 0,
        hasStructured: Boolean(result.structuredContent),
        isError: Boolean(result.isError),
      }
    );

    return {
      toolName,
      result,
    };
  } catch (error) {
    console.error(
      `[MCP] Tool ${toolName} on ${server.id ?? "unknown"} failed`,
      error
    );
    throw toMcpTransportError(error, "Failed to execute MCP tool");
  } finally {
    if (connection) {
      try {
        await connection.cleanup();
      } catch {
        // swallow cleanup errors
      }
    }
  }
}

export async function loadMcpToolsForChat(
  servers: McpChatServerConfig[]
): Promise<LoadedMcpTools> {
  const aggregatedTools: ToolSet = {};
  const cleanupCallbacks: Array<() => Promise<void>> = [];
  const warnings: string[] = [];
  const seenNames = new Set<string>();
  const toolSummaries: McpToolSummary[] = [];

  for (const server of servers) {
    if (!server.url || typeof server.url !== "string") {
      warnings.push(`跳过 ${server.id ?? "unknown"}：缺少服务地址`);
      continue;
    }

    let connection: McpClientConnection | null = null;

    try {
      console.info(
        `[MCP] Connecting to ${server.id ?? "unknown"} at ${server.url}`
      );
      connection = await createMcpClientConnection(server);
      const serverId = server.id ?? "unknown";
      assertToolsCapability(connection, serverId);

      if (connection.transport === "sse") {
        warnings.push(
          `MCP 服务 ${serverId} 未启用 Streamable HTTP，已回退至 SSE 连接。`
        );
        console.warn(
          `[MCP] Server ${serverId} using SSE fallback; consider enabling Streamable HTTP.`
        );
      }

      const listResult = await connection.client.listTools();
      const toolSet = listResult.tools;
      const allowedTools = Array.isArray(server.enabledTools)
        ? new Set(server.enabledTools)
        : null;

      console.info(
        `[MCP] Loaded ${toolSet.length} tool(s) from ${serverId}`
      );

      toolSet.forEach((tool) => {
        const { name } = tool;

        if (allowedTools && !allowedTools.has(name)) {
          return;
        }

        if (seenNames.has(name)) {
          warnings.push(
            `工具名称 "${name}" 在多个 MCP 服务中重复，来自 ${serverId} 的版本已被忽略。`
          );
          console.warn(
            `[MCP] Ignoring duplicate tool name ${name} from ${serverId}`
          );
          return;
        }

        seenNames.add(name);
        toolSummaries.push({
          name,
          serverId,
          description: tool.description ?? undefined,
        });
        const baseInputSchema: JSONSchema7 =
          (tool.inputSchema as JSONSchema7 | undefined) ?? {
            type: "object",
            properties: {},
          };
        aggregatedTools[name] = dynamicTool({
          description: tool.description,
          inputSchema: jsonSchema({
            ...baseInputSchema,
            properties:
              (baseInputSchema.properties as JSONSchema7["properties"]) ??
              ({} as JSONSchema7["properties"]),
            additionalProperties: false,
          }),
          execute: async (
            args: unknown,
            options?: { abortSignal?: AbortSignal }
          ) => {
            options?.abortSignal?.throwIfAborted();

            const normalizedArgs = isPlainObject(args) ? args : undefined;
            console.info(
              `[MCP] Executing tool ${name} from ${serverId}`,
              normalizedArgs ? { input: normalizedArgs } : { inputType: typeof args }
            );

            return connection!.client.callTool(
              {
                name,
                arguments: normalizedArgs,
              },
              undefined,
              options?.abortSignal ? { signal: options.abortSignal } : undefined
            ).then((result) => {
              console.info(
                `[MCP] Tool ${name} from ${serverId} returned`,
                {
                  hasContent:
                    Array.isArray(result.content) &&
                    result.content.length > 0,
                  hasStructured: Boolean(result.structuredContent),
                  isError: Boolean(result.isError),
                }
              );
              return result;
            }).catch((error) => {
              console.error(
                `[MCP] Tool ${name} from ${serverId} failed`,
                error
              );
              throw error;
            });
          },
        });
      });

      cleanupCallbacks.push(async () => {
        try {
          await connection!.cleanup();
        } catch {
          // ignore cleanup errors
        }
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.cleanup();
        } catch {
          // ignore cleanup errors for failed client
        }
      }

      const normalizedError = toMcpTransportError(
        error,
        "无法加载 MCP 工具"
      );
      warnings.push(
        `来自 ${(server.id ?? "unknown")} 的工具加载失败：${normalizedError.message}`
      );
    }
  }

  return {
    tools: aggregatedTools,
    toolSummaries,
    warnings,
    cleanup: async () => {
      await Promise.allSettled(cleanupCallbacks.map((fn) => fn()));
    },
  };
}
