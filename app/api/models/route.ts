import "@/lib/configure-proxy-fetch";
import { NextRequest } from "next/server";
import { Model, ModelProvider } from "@/lib/models";

type ModelsRequestBody = {
  apiKeys?: Record<string, string>;
};

interface OpenAIModelsResponse {
  data: Array<{ id: string }>;
}

interface AnthropicModelsResponse {
  data: Array<{ id: string; display_name?: string }>;
}

interface GoogleModelsResponse {
  models?: Array<{
    name: string;
    supportedGenerationMethods?: string[];
  }>;
}

interface OpenRouterModelsResponse {
  data: Array<{ id: string; name?: string }>;
}

interface XaiModelsResponse {
  data: Array<{ id: string }>;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}

// Basic fetch timeout helper to avoid hanging on slow providers
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let userKeys: Record<string, string> = {};
    if (body && typeof body === "object" && "apiKeys" in body) {
      const candidate = (body as ModelsRequestBody).apiKeys;
      if (isStringRecord(candidate)) {
        userKeys = candidate;
      }
    }
    const effectiveKeys: Record<string, string> = { ...(userKeys || {}) };

    if (!effectiveKeys || Object.keys(effectiveKeys).length === 0) {
      return Response.json({ error: "API keys are required" }, { status: 400 });
    }

    const allModels: Model[] = [];
    const errors: Record<string, string> = {};

    // 并行获取所有提供商的模型
    const fetchPromises = Object.entries(effectiveKeys).map(
      async ([provider, apiKey]) => {
        if (!apiKey || typeof apiKey !== "string") return;

        try {
          const models = await fetchModelsForProvider(
            provider as ModelProvider,
            apiKey
          );
          allModels.push(...models);
        } catch (error) {
          errors[provider] =
            error instanceof Error ? error.message : "Failed to fetch models";
        }
      }
    );

    await Promise.allSettled(fetchPromises);

    return Response.json({
      models: allModels,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function fetchModelsForProvider(
  provider: ModelProvider,
  apiKey: string
): Promise<Model[]> {
  switch (provider) {
    case "openai":
      return await fetchOpenAIModels(apiKey);
    case "anthropic":
      return await fetchAnthropicModels(apiKey);
    case "google":
      return await fetchGoogleModels(apiKey);
    case "openrouter":
      return await fetchOpenRouterModels(apiKey);
    case "grok":
      return await fetchXAIModels(apiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<Model[]> {
  const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIModelsResponse;

  return data.data.map((model) => ({
    id: model.id,
    name: model.id,
    provider: "openai" as ModelProvider,
  }));
}

async function fetchAnthropicModels(apiKey: string): Promise<Model[]> {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/models",
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as AnthropicModelsResponse;

  return data.data.map((model) => ({
    id: model.id,
    name: model.display_name || model.id,
    provider: "anthropic" as ModelProvider,
  }));
}

async function fetchGoogleModels(apiKey: string): Promise<Model[]> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`Google AI API error: ${response.status}`);
  }

  const data = (await response.json()) as GoogleModelsResponse;
  const googleModels = data.models ?? [];

  return googleModels
    .filter((model) =>
      model.supportedGenerationMethods?.includes("generateContent")
    )
    .map((model) => {
      // 从 "models/gemini-1.5-pro" 格式中提取模型名称
      const modelId = model.name.replace("models/", "");
      return {
        id: modelId,
        name: modelId
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase()),
        provider: "google" as ModelProvider,
      };
    });
}

async function fetchOpenRouterModels(apiKey: string): Promise<Model[]> {
  const response = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/models",
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenRouterModelsResponse;

  return data.data.map((model) => ({
    id: model.id,
    name: model.name || model.id,
    provider: "openrouter" as ModelProvider,
  }));
}

async function fetchXAIModels(apiKey: string): Promise<Model[]> {
  const response = await fetchWithTimeout("https://api.x.ai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`xAI API error: ${response.status}`);
  }

  const data = (await response.json()) as XaiModelsResponse;

  return data.data.map((model) => ({
    id: model.id,
    name: model.id,
    provider: "grok" as ModelProvider,
  }));
}
