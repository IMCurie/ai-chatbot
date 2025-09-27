import { NextResponse } from "next/server";

import {
  listMcpTools,
  McpTransportError,
  type McpHttpHeader,
} from "@/lib/mcp-client";

interface ListToolsRequestBody {
  server?: {
    id?: string;
    url?: string;
    headers?: McpHttpHeader[];
  };
}

export async function POST(request: Request) {
  let payload: ListToolsRequestBody;

  try {
    payload = (await request.json()) as ListToolsRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const server = payload.server;

  if (!server || typeof server.url !== "string" || !server.url.trim()) {
    return NextResponse.json(
      { error: "Missing MCP server configuration" },
      { status: 400 }
    );
  }

  let endpoint: URL;
  try {
    endpoint = new URL(server.url);
  } catch {
    return NextResponse.json(
      { error: "Invalid MCP server URL" },
      { status: 400 }
    );
  }

  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    return NextResponse.json(
      { error: "MCP HTTP transport requires an http(s) URL" },
      { status: 400 }
    );
  }

  try {
    const tools = await listMcpTools({
      id: server.id ?? "runtime",
      url: endpoint.toString(),
      headers: Array.isArray(server.headers)
        ? server.headers.filter(
            (header): header is McpHttpHeader =>
              !!header &&
              typeof header.key === "string" &&
              typeof header.value === "string"
          )
        : undefined,
    });

    return NextResponse.json({ tools });
  } catch (error) {
    if (error instanceof McpTransportError) {
      const causeMessage =
        error.cause && error.cause instanceof Error
          ? error.cause.message
          : undefined;
      const message = causeMessage
        ? `${error.message} (${causeMessage})`
        : error.message;

      return NextResponse.json(
        { error: message },
        { status: error.status }
      );
    }

    console.error("Failed to list MCP tools", error);
    const message =
      error instanceof Error ? error.message : "Failed to list MCP tools";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
