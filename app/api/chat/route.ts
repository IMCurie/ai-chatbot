import "@/lib/configure-proxy-fetch";
import { createOpenRouter, type OpenRouterProviderSettings } from "@openrouter/ai-sdk-provider";
import { createOpenAI, type OpenAIProviderSettings } from "@ai-sdk/openai";
import {
  createAnthropic,
  type AnthropicProviderSettings,
} from "@ai-sdk/anthropic";
import {
  createGoogleGenerativeAI,
  type GoogleGenerativeAIProviderSettings,
} from "@ai-sdk/google";
import { createXai, type XaiProviderSettings } from "@ai-sdk/xai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ProviderModelInstance =
  | ReturnType<ReturnType<typeof createOpenAI>>
  | ReturnType<ReturnType<typeof createAnthropic>>
  | ReturnType<ReturnType<typeof createGoogleGenerativeAI>>
  | ReturnType<ReturnType<typeof createXai>>
  | ReturnType<ReturnType<typeof createOpenRouter>["chat"]>;
import { Model } from "@/lib/models";
import { ApiKeys, ApiBaseUrls } from "@/lib/store";

interface ChatRequestBody {
  messages?: UIMessage[];
  model?: Model;
  apiKeys?: ApiKeys;
  baseUrls?: ApiBaseUrls;
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function getProvider(
  model: Model,
  userApiKeys?: ApiKeys,
  userBaseUrls?: ApiBaseUrls
): ProviderModelInstance {
  // Helper function to get API key with fallback to environment variable
  const getApiKey = (provider: string, envKey: string) => {
    const userKey = userApiKeys?.[provider as keyof ApiKeys];
    const envValue = process.env[envKey];
    const isProd = process.env.NODE_ENV === "production";
    
    if (userKey && userKey.trim()) {
      return userKey.trim();
    }
    
    // In development, allow falling back to server env vars for convenience
    if (!isProd && envValue && envValue.trim()) {
      return envValue.trim();
    }
    
    throw new Error(`No API key found for ${provider}. Please set your API key in settings or environment variables.`);
  };

  // Helper function to get custom base URL (only return if user has set a custom one)
  const getBaseUrl = (provider: string) => {
    const userBaseUrl = userBaseUrls?.[provider as keyof ApiBaseUrls];
    return userBaseUrl && userBaseUrl.trim() ? userBaseUrl.trim() : undefined;
  };

  switch (model.provider) {
    case "openai":
      const openaiConfig: OpenAIProviderSettings = {
        apiKey: getApiKey("openai", "OPENAI_API_KEY"),
      };
      const openaiBaseUrl = getBaseUrl("openai");
      if (openaiBaseUrl) {
        openaiConfig.baseURL = openaiBaseUrl;
      }
      const openai = createOpenAI(openaiConfig);
      return openai(model.id);

    case "anthropic":
      const anthropicConfig: AnthropicProviderSettings = {
        apiKey: getApiKey("anthropic", "ANTHROPIC_API_KEY"),
      };
      const anthropicBaseUrl = getBaseUrl("anthropic");
      if (anthropicBaseUrl) {
        anthropicConfig.baseURL = anthropicBaseUrl;
      }
      const anthropic = createAnthropic(anthropicConfig);
      return anthropic(model.id);

    case "google":
      const googleConfig: GoogleGenerativeAIProviderSettings = {
        apiKey: getApiKey("google", "GOOGLE_API_KEY"),
      };
      const googleBaseUrl = getBaseUrl("google");
      if (googleBaseUrl) {
        googleConfig.baseURL = googleBaseUrl;
      }
      const google = createGoogleGenerativeAI(googleConfig);
      return google(model.id);

    case "openrouter":
      const openrouterConfig: OpenRouterProviderSettings = {
        apiKey: getApiKey("openrouter", "OPENROUTER_API_KEY"),
      };
      const openrouterBaseUrl = getBaseUrl("openrouter");
      if (openrouterBaseUrl) {
        openrouterConfig.baseURL = openrouterBaseUrl;
      }
      const openrouter = createOpenRouter(openrouterConfig);
      return openrouter.chat(model.id);

    case "grok":
      const xaiConfig: XaiProviderSettings = {
        apiKey: getApiKey("grok", "XAI_API_KEY"),
      };
      const grokBaseUrl = getBaseUrl("grok");
      if (grokBaseUrl) {
        xaiConfig.baseURL = grokBaseUrl;
      }
      const xai = createXai(xaiConfig);
      return xai(model.id);

    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as unknown;
  const { messages, model, apiKeys, baseUrls } = (body ?? {}) as ChatRequestBody;

  if (!model || !model.id || !model.provider) {
    return new Response("Model information is required", { status: 400 });
  }

  try {
    const provider = getProvider(model, apiKeys, baseUrls);

    const uiMessages: UIMessage[] = Array.isArray(messages) ? messages : [];
    const modelMessages = convertToModelMessages(uiMessages);

    const result = streamText({
      model: provider,
      system: "You are a helpful assistant.",
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    
    // Return more specific error messages for API key issues
    if (error instanceof Error && error.message.includes("No API key found")) {
      return new Response(error.message, { status: 400 });
    }
    
    return new Response("Internal Server Error", { status: 500 });
  }
}
