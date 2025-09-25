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

interface SearchResultPayload {
  id: string;
  index: number;
  title: string;
  url: string;
  snippet?: string;
  score?: number;
}

interface NetworkSearchPayload {
  provider?: string;
  query: string;
  results?: SearchResultPayload[];
  language?: string;
  maxResults?: number;
  excludeWebsites?: string;
}

interface ChatRequestBody {
  messages?: UIMessage[];
  model?: Model;
  apiKeys?: ApiKeys;
  baseUrls?: ApiBaseUrls;
  search?: NetworkSearchPayload | null;
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function getProvider(
  model: Model,
  userApiKeys?: ApiKeys,
  userBaseUrls?: ApiBaseUrls
): ProviderModelInstance {
  // Helper function to get API key supplied by the user
  const getApiKey = (provider: Model["provider"]) => {
    const userKey = userApiKeys?.[provider];

    if (userKey && userKey.trim()) {
      return userKey.trim();
    }

    throw new Error(
      `No API key found for ${provider}. Please set your API key in settings.`
    );
  };

  // Helper function to get custom base URL (only return if user has set a custom one)
  const getBaseUrl = (provider: string) => {
    const userBaseUrl = userBaseUrls?.[provider as keyof ApiBaseUrls];
    return userBaseUrl && userBaseUrl.trim() ? userBaseUrl.trim() : undefined;
  };

  switch (model.provider) {
    case "openai":
      const openaiConfig: OpenAIProviderSettings = {
        apiKey: getApiKey("openai"),
      };
      const openaiBaseUrl = getBaseUrl("openai");
      if (openaiBaseUrl) {
        openaiConfig.baseURL = openaiBaseUrl;
      }
      const openai = createOpenAI(openaiConfig);
      return openai(model.id);

    case "anthropic":
      const anthropicConfig: AnthropicProviderSettings = {
        apiKey: getApiKey("anthropic"),
      };
      const anthropicBaseUrl = getBaseUrl("anthropic");
      if (anthropicBaseUrl) {
        anthropicConfig.baseURL = anthropicBaseUrl;
      }
      const anthropic = createAnthropic(anthropicConfig);
      return anthropic(model.id);

    case "google":
      const googleConfig: GoogleGenerativeAIProviderSettings = {
        apiKey: getApiKey("google"),
      };
      const googleBaseUrl = getBaseUrl("google");
      if (googleBaseUrl) {
        googleConfig.baseURL = googleBaseUrl;
      }
      const google = createGoogleGenerativeAI(googleConfig);
      return google(model.id);

    case "openrouter":
      const openrouterConfig: OpenRouterProviderSettings = {
        apiKey: getApiKey("openrouter"),
      };
      const openrouterBaseUrl = getBaseUrl("openrouter");
      if (openrouterBaseUrl) {
        openrouterConfig.baseURL = openrouterBaseUrl;
      }
      const openrouter = createOpenRouter(openrouterConfig);
      return openrouter.chat(model.id);

    case "grok":
      const xaiConfig: XaiProviderSettings = {
        apiKey: getApiKey("grok"),
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
  const { messages, model, apiKeys, baseUrls, search } =
    (body ?? {}) as ChatRequestBody;

  if (!model || !model.id || !model.provider) {
    return new Response("Model information is required", { status: 400 });
  }

  try {
    const provider = getProvider(model, apiKeys, baseUrls);

    const uiMessages: UIMessage[] = Array.isArray(messages) ? messages : [];
    const modelMessages = convertToModelMessages(uiMessages);

    const baseSystemPrompt = "You are a helpful assistant.";
    const searchResults = Array.isArray(search?.results)
      ? search.results.filter((result): result is SearchResultPayload => {
          return (
            !!result &&
            typeof result.id === "string" &&
            typeof result.title === "string" &&
            typeof result.url === "string"
          );
        })
      : [];

    let systemPrompt = baseSystemPrompt;

    if (search?.query && searchResults.length > 0) {
      const providerLabel = search.provider?.trim() || "web search";
      const metaParts: string[] = [];
      if (search.language) {
        metaParts.push(`language ${search.language}`);
      }
      if (search.maxResults) {
        metaParts.push(`top ${search.maxResults}`);
      }
      if (search.excludeWebsites) {
        metaParts.push(`excluding ${search.excludeWebsites}`);
      }
      const providerDetails =
        metaParts.length > 0
          ? `${providerLabel} (${metaParts.join(", ")})`
          : providerLabel;
      const formattedRows = searchResults
        .slice(0, 10)
        .map((result, idx) => {
          const ordinal = idx + 1;
          const title = result.title.trim();
          const url = result.url.trim();
          const score =
            typeof result.score === "number" && !Number.isNaN(result.score)
              ? ` (relevance ${result.score.toFixed(2)})`
              : "";
          const snippet = result.snippet
            ?.replace(/\s+/g, " ")
            .trim()
            .slice(0, 320);
          const snippetSuffix = snippet ? ` — ${snippet}` : "";
          return `[${ordinal}] ${title} <${url}>${score}${snippetSuffix}`;
        })
        .join("\n");

      systemPrompt = `${baseSystemPrompt}\n\nYou have access to the following ${providerDetails} results collected for the latest user request "${search.query}". Use them to ground your answer when relevant. Cite sources inline using [index] references, e.g. [1]. If the results are insufficient or conflicting, acknowledge it.\n\nSearch results:\n${formattedRows}`;
    }

    const result = streamText({
      model: provider,
      system: systemPrompt,
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
