import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { streamText } from "ai";
import { Model } from "@/lib/models";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

function getProvider(model: Model) {
  switch (model.provider) {
    case "openai":
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY || "",
      });
      return openai(model.id);

    case "anthropic":
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || "",
      });
      return anthropic(model.id);

    case "google":
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY || "",
      });
      return google(model.id);

    case "openrouter":
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY || "",
      });
      return openrouter.chat(model.id);

    case "grok":
      const xai = createXai({
        apiKey: process.env.XAI_API_KEY || "",
      });
      return xai(model.id);

    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  if (!model || !model.id || !model.provider) {
    return new Response("Model information is required", { status: 400 });
  }

  try {
    const provider = getProvider(model);

    const result = streamText({
      model: provider,
      system: "You are a helpful assistant.",
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
