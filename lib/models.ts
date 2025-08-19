export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "openrouter"
  | "grok";

export interface Model {
  id: string;
  name: string;
  provider: ModelProvider;
  contextLength: number;
  description?: string;
}

export const models: Model[] = [
  // OpenAI Models
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    contextLength: 128000,
    description: "Most capable GPT-4 model, optimized for speed",
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "openai",
    contextLength: 8192,
    description: "Original GPT-4 model",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    contextLength: 16385,
    description: "Fast and efficient for most tasks",
  },

  // Anthropic Models
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextLength: 200000,
    description: "Most intelligent Claude model",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextLength: 200000,
    description: "Fast and efficient Claude model",
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    contextLength: 200000,
    description: "Powerful model for complex tasks",
  },

  // Google Models
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    contextLength: 1000000,
    description: "Google's most capable model with 1M context",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    contextLength: 1000000,
    description: "Fast and efficient with 1M context",
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "google",
    contextLength: 32768,
    description: "Balanced performance model",
  },

  // OpenRouter Models
  {
    id: "openai/gpt-4.1-mini-2025-04-14",
    name: "GPT-4.1 Mini",
    provider: "openrouter",
    contextLength: 1000000,
    description: "Latest efficient model via OpenRouter",
  },
  {
    id: "openai/gpt-4.1-turbo-2025-04-14",
    name: "GPT-4.1 Turbo",
    provider: "openrouter",
    contextLength: 1000000,
    description: "Latest powerful model via OpenRouter",
  },
  {
    id: "openai/chatgpt-4o-latest",
    name: "ChatGPT-4o",
    provider: "openrouter",
    contextLength: 128000,
    description: "Optimized ChatGPT model",
  },

  // Grok Models (xAI)
  {
    id: "grok-3",
    name: "Grok 3",
    provider: "grok",
    contextLength: 131072,
    description: "Most intelligent xAI model",
  },
  {
    id: "grok-3-fast",
    name: "Grok 3 Fast",
    provider: "grok",
    contextLength: 131072,
    description: "Fast and efficient xAI model",
  },
  {
    id: "grok-3-mini",
    name: "Grok 3 Mini",
    provider: "grok",
    contextLength: 131072,
    description: "Lightweight xAI model",
  },
];

export function getModelsByProvider(provider: ModelProvider): Model[] {
  return models.filter((model) => model.provider === provider);
}

export function getModelById(id: string): Model | undefined {
  return models.find((model) => model.id === id);
}

export function formatContextLength(length: number): string {
  if (length >= 1000000) {
    return `${Math.floor(length / 1000000)}M`;
  } else if (length >= 1000) {
    return `${Math.floor(length / 1000)}K`;
  }
  return length.toString();
}
