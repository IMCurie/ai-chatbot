import "@/lib/configure-proxy-fetch";
import { NextRequest } from "next/server";
import { Model, ModelProvider } from "@/lib/models";

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
    const body = await req.json().catch(() => ({} as any));
    const userKeys =
      body && typeof body === "object" && typeof body.apiKeys === "object"
        ? body.apiKeys
        : {};
    const isProd = process.env.NODE_ENV === "production";

    // In development, allow falling back to server env variables for convenience
    const effectiveKeys: Record<string, string> = { ...(userKeys || {}) };
    if (!isProd) {
      const envKeyMap: Record<string, string | undefined> = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI,
        openrouter: process.env.OPENROUTER_API_KEY,
        grok: process.env.XAI_API_KEY,
      };

      for (const [provider, value] of Object.entries(envKeyMap)) {
        if (!effectiveKeys[provider] && value && value.trim()) {
          effectiveKeys[provider] = value.trim();
        }
      }
    }

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

  const data = await response.json();

  return data.data.map((model: any) => ({
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

  const data = await response.json();

  return data.data.map((model: any) => ({
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

  const data = await response.json();

  return data.models
    .filter((model: any) =>
      model.supportedGenerationMethods?.includes("generateContent")
    )
    .map((model: any) => {
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

  const data = await response.json();

  return data.data.map((model: any) => ({
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

  const data = await response.json();

  return data.data.map((model: any) => ({
    id: model.id,
    name: model.id,
    provider: "grok" as ModelProvider,
  }));
}
