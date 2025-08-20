"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelProvider } from "@/lib/models";
import { useChatStore } from "@/lib/store";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const providerConfig = {
  openai: {
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  anthropic: {
    name: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
  },
  google: {
    name: "Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  openrouter: {
    name: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
  },
  grok: {
    name: "Grok",
    defaultBaseUrl: "https://api.x.ai/v1",
  },
} as const;

export function ApiSettingsDialog() {
  const { setApiKey, getApiKey, setApiBaseUrl, getApiBaseUrl } = useChatStore();
  const [selectedProvider, setSelectedProvider] =
    useState<ModelProvider>("openai");
  const [apiKey, setApiKeyValue] = useState("");
  const [apiBaseUrl, setApiBaseUrlValue] = useState("");
  const [showKey, setShowKey] = useState(false);

  const providers: ModelProvider[] = [
    "openai",
    "anthropic",
    "google",
    "openrouter",
    "grok",
  ];
  const selectedConfig = providerConfig[selectedProvider];
  const currentKey = getApiKey(selectedProvider);
  const currentBaseUrl = getApiBaseUrl(selectedProvider);

  useEffect(() => {
    setApiKeyValue(currentKey || "");
    setApiBaseUrlValue(currentBaseUrl || "");
  }, [selectedProvider, currentKey, currentBaseUrl]);

  const handleApiKeyChange = (value: string) => {
    setApiKeyValue(value);
    setApiKey(selectedProvider, value);
  };

  const handleApiBaseUrlChange = (value: string) => {
    setApiBaseUrlValue(value);
    setApiBaseUrl(selectedProvider, value);
  };

  return (
    <DialogContent className="w-1/2 h-2/3 max-w-none sm:max-w-none p-0 gap-0 flex flex-col">
      <DialogHeader className="px-4 py-4 border-b">
        <DialogTitle className="text-lg">API 设置</DialogTitle>
        <DialogDescription className="text-sm">
          配置您的 AI 模型 API 密钥和基础 URL
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar - Provider List */}
        <div className="w-48 border-r bg-muted/30 flex-shrink-0">
          <div className="p-3">
            <div className="space-y-1">
              {providers.map((provider) => {
                const config = providerConfig[provider];
                const isSelected = selectedProvider === provider;

                return (
                  <button
                    key={provider}
                    onClick={() => {
                      setSelectedProvider(provider);
                    }}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm text-left rounded-md transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="font-medium">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Provider Configuration */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <h2 className="mb-4 border-b py-2 px-4">{selectedConfig.name}</h2>

          <div className="space-y-4 px-4">
            {/* API Key Section */}
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="pr-10 h-9"
                />
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* API Base URL Section */}
            <div className="space-y-2">
              <Label htmlFor="api-base-url" className="text-sm font-medium">
                API Base URL
              </Label>
              <Input
                id="api-base-url"
                type="text"
                value={apiBaseUrl}
                onChange={(e) => handleApiBaseUrlChange(e.target.value)}
                placeholder={selectedConfig.defaultBaseUrl}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
