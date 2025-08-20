import { ModelProvider } from "./models";

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates API key format for different providers
 */
export function validateApiKeyFormat(
  provider: ModelProvider,
  apiKey: string
): ApiKeyValidationResult {
  if (!apiKey || !apiKey.trim()) {
    return { isValid: false, error: "API 密钥不能为空" };
  }

  const key = apiKey.trim();

  switch (provider) {
    case "openai":
      // OpenAI keys typically start with "sk-" or "sk-proj-"
      if (!key.startsWith("sk-")) {
        return { isValid: false, error: "OpenAI API 密钥应以 'sk-' 开头" };
      }
      if (key.length < 20) {
        return { isValid: false, error: "OpenAI API 密钥长度不够" };
      }
      break;

    case "anthropic":
      // Anthropic keys start with "sk-ant-"
      if (!key.startsWith("sk-ant-")) {
        return {
          isValid: false,
          error: "Anthropic API 密钥应以 'sk-ant-' 开头",
        };
      }
      if (key.length < 20) {
        return { isValid: false, error: "Anthropic API 密钥长度不够" };
      }
      break;

    case "google":
      // Google AI keys typically start with "AIza"
      if (!key.startsWith("AIza")) {
        return { isValid: false, error: "Google AI API 密钥应以 'AIza' 开头" };
      }
      if (key.length < 30) {
        return { isValid: false, error: "Google AI API 密钥长度不够" };
      }
      break;

    case "openrouter":
      // OpenRouter keys start with "sk-or-"
      if (!key.startsWith("sk-or-")) {
        return {
          isValid: false,
          error: "OpenRouter API 密钥应以 'sk-or-' 开头",
        };
      }
      if (key.length < 20) {
        return { isValid: false, error: "OpenRouter API 密钥长度不够" };
      }
      break;

    case "grok":
      // xAI/Grok keys start with "xai-"
      if (!key.startsWith("xai-")) {
        return { isValid: false, error: "xAI API 密钥应以 'xai-' 开头" };
      }
      if (key.length < 20) {
        return { isValid: false, error: "xAI API 密钥长度不够" };
      }
      break;

    default:
      return { isValid: false, error: "不支持的服务提供商" };
  }

  // Check for common invalid characters
  if (key.includes(" ")) {
    return { isValid: false, error: "API 密钥不应包含空格" };
  }

  return { isValid: true };
}

/**
 * Tests API key by making a simple request to the provider
 */
export async function testApiKey(
  provider: ModelProvider,
  apiKey: string
): Promise<ApiKeyValidationResult> {
  const formatValidation = validateApiKeyFormat(provider, apiKey);
  if (!formatValidation.isValid) {
    return formatValidation;
  }

  try {
    // Create a simple test request based on provider
    const testModel = getTestModel(provider);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        model: testModel,
        apiKeys: { [provider]: apiKey },
      }),
    });

    if (response.ok) {
      return { isValid: true };
    } else {
      const errorText = await response.text();
      return {
        isValid: false,
        error: `API 密钥测试失败: ${errorText || "未知错误"}`,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: `API 密钥测试失败: ${
        error instanceof Error ? error.message : "网络错误"
      }`,
    };
  }
}

/**
 * Get a simple test model for each provider
 */
function getTestModel(provider: ModelProvider) {
  switch (provider) {
    case "openai":
      return { id: "gpt-3.5-turbo", provider: "openai" };
    case "anthropic":
      return { id: "claude-3-5-haiku-20241022", provider: "anthropic" };
    case "google":
      return { id: "gemini-pro", provider: "google" };
    case "openrouter":
      return { id: "openai/gpt-3.5-turbo", provider: "openrouter" };
    case "grok":
      return { id: "grok-3-mini", provider: "grok" };
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Sanitizes API key for logging (shows only first and last few characters)
 */
export function sanitizeApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return "****";
  }

  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  return `${start}****${end}`;
}
