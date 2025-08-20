import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { streamText } from "ai";
import { Model } from "@/lib/models";
import { ApiKeys, ApiBaseUrls } from "@/lib/store";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function getProvider(model: Model, userApiKeys?: ApiKeys, userBaseUrls?: ApiBaseUrls) {
  // Helper function to get API key with fallback to environment variable
  const getApiKey = (provider: string, envKey: string) => {
    const userKey = userApiKeys?.[provider as keyof ApiKeys];
    const envValue = process.env[envKey];
    
    if (userKey && userKey.trim()) {
      return userKey.trim();
    }
    
    if (envValue && envValue.trim()) {
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
      const openaiConfig: any = {
        apiKey: getApiKey("openai", "OPENAI_API_KEY"),
      };
      const openaiBaseUrl = getBaseUrl("openai");
      if (openaiBaseUrl) {
        openaiConfig.baseURL = openaiBaseUrl;
      }
      const openai = createOpenAI(openaiConfig);
      return openai(model.id);

    case "anthropic":
      const anthropicConfig: any = {
        apiKey: getApiKey("anthropic", "ANTHROPIC_API_KEY"),
      };
      const anthropicBaseUrl = getBaseUrl("anthropic");
      if (anthropicBaseUrl) {
        anthropicConfig.baseURL = anthropicBaseUrl;
      }
      const anthropic = createAnthropic(anthropicConfig);
      return anthropic(model.id);

    case "google":
      const googleConfig: any = {
        apiKey: getApiKey("google", "GOOGLE_API_KEY"),
      };
      const googleBaseUrl = getBaseUrl("google");
      if (googleBaseUrl) {
        googleConfig.baseURL = googleBaseUrl;
      }
      const google = createGoogleGenerativeAI(googleConfig);
      return google(model.id);

    case "openrouter":
      const openrouterConfig: any = {
        apiKey: getApiKey("openrouter", "OPENROUTER_API_KEY"),
      };
      const openrouterBaseUrl = getBaseUrl("openrouter");
      if (openrouterBaseUrl) {
        openrouterConfig.baseURL = openrouterBaseUrl;
      }
      const openrouter = createOpenRouter(openrouterConfig);
      return openrouter.chat(model.id);

    case "grok":
      const xaiConfig: any = {
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
  const { messages, model, apiKeys, baseUrls } = await req.json();

  if (!model || !model.id || !model.provider) {
    return new Response("Model information is required", { status: 400 });
  }

  try {
    const provider = getProvider(model, apiKeys, baseUrls);

    const result = streamText({
      model: provider,
      system: "You are a helpful assistant.",
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    
    // Return more specific error messages for API key issues
    if (error instanceof Error && error.message.includes("No API key found")) {
      return new Response(error.message, { status: 400 });
    }
    
    return new Response("Internal Server Error", { status: 500 });
  }
}
