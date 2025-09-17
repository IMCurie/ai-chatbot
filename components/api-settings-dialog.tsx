"use client";

import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  useMemo,
  useTransition,
} from "react";
import {
  Cog,
  Eye,
  EyeOff,
  Globe,
  Infinity,
  MessageSquare,
  Palette,
  Puzzle,
  RefreshCw,
  Loader2,
  Router,
  Server,
  Workflow,
  Ellipsis,
  type LucideIcon,
  Sparkle,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelProvider, getModelsByProvider } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { ModelList } from "@/components/model-list";

import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsSectionId =
  | "general"
  | "appearance"
  | "providers"
  | "prompts"
  | "mcp"
  | "extensions"
  | "advanced";

type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: ReactNode;
  icon: LucideIcon;
};

const settingsSections: SettingsSection[] = [
  {
    id: "general",
    label: "General",
    description: "Configure application language and interaction behaviour",
    icon: Cog,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Adjust theme, density, and editor preferences",
    icon: Palette,
  },
  {
    id: "providers",
    label: "Providers",
    description: "Manage API keys and endpoints for connected providers",
    icon: Server,
  },
  {
    id: "prompts",
    label: "Prompts",
    description: "Organise reusable prompt templates for your team",
    icon: MessageSquare,
  },
  {
    id: "mcp",
    label: "MCP",
    description: "Connect Model Context Protocol tools and services",
    icon: Workflow,
  },
  {
    id: "extensions",
    label: "Extensions",
    description: "Discover and manage extensions that expand capabilities",
    icon: Puzzle,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Access debugging, logging, and experimental features",
    icon: Ellipsis,
  },
];

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

const providerMeta: Record<ModelProvider, { label: string; icon: LucideIcon }> =
  {
    openai: { label: "OpenAI", icon: Sparkle },
    anthropic: { label: "Anthropic", icon: Infinity },
    google: { label: "Google AI", icon: Globe },
    openrouter: { label: "OpenRouter", icon: Router },
    grok: { label: "Grok", icon: Bot },
  };

export function ApiSettingsDialog() {
  const {
    setApiKey,
    getApiKey,
    setApiBaseUrl,
    getApiBaseUrl,
    allAvailableModels,
    isLoadingModels,
    modelErrors,
    fetchModels,
  } = useChatStore();
  const [selectedProvider, setSelectedProvider] =
    useState<ModelProvider>("openai");
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const [language, setLanguage] = useState("en");
  const [sendMessageWith, setSendMessageWith] = useState("enter");
  const [autoScroll, setAutoScroll] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("http://127.0.0.1:7897");
  const [apiKey, setApiKeyValue] = useState("");
  const [apiBaseUrl, setApiBaseUrlValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingProvider, startProviderTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const providers: ModelProvider[] = [
    "anthropic",
    "openai",
    "google",
    "openrouter",
    "grok",
  ];
  const selectedConfig = providerConfig[selectedProvider];
  const currentKey = getApiKey(selectedProvider);
  const currentBaseUrl = getApiBaseUrl(selectedProvider);

  const providerModels = useMemo(() => {
    return getModelsByProvider(allAvailableModels, selectedProvider);
  }, [allAvailableModels, selectedProvider]);

  useEffect(() => {
    setApiKeyValue(currentKey || "");
    setApiBaseUrlValue(currentBaseUrl || "");
  }, [selectedProvider, currentKey, currentBaseUrl]);

  const handleApiKeyChange = (value: string) => {
    setApiKeyValue(value);
    setApiKey(selectedProvider, value);

    // 如果输入了有效的API Key，防抖后获取模型，避免频繁请求
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (value.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchModels();
      }, 500);
    }
  };

  const handleApiBaseUrlChange = (value: string) => {
    setApiBaseUrlValue(value);
    setApiBaseUrl(selectedProvider, value);
  };

  // 手动刷新模型
  const handleRefreshModels = async () => {
    setIsRefreshing(true);
    try {
      await fetchModels();
    } finally {
      setIsRefreshing(false);
    }
  };

  // 获取当前提供商的模型
  const currentProviderModels = providerModels;
  const currentProviderError = modelErrors[selectedProvider];
  const hasApiKey = !!getApiKey(selectedProvider);
  const showProviderLoading = isLoadingModels || isSwitchingProvider;
  const providerSpinnerActive =
    isRefreshing || isLoadingModels || isSwitchingProvider;

  const activeSectionConfig =
    settingsSections.find((section) => section.id === activeSection) ??
    settingsSections[0];

  const renderGeneralSection = () => {
    return (
      <div className="h-full overflow-y-auto px-8 py-8">
        <div className="rounded-xl border bg-background">
          <div className="divide-y">
            <div className="flex items-center justify-between gap-6 px-6 py-5">
              <div>
                <div className="font-medium">Language</div>
                <p className="text-sm text-muted-foreground">
                  Choose the interface language used across the app
                </p>
              </div>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="border rounded-md bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary min-w-[140px]"
              >
                <option value="en">English</option>
                <option value="zh">简体中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-6 px-6 py-5">
              <div>
                <div className="font-medium">Send message with</div>
                <p className="text-sm text-muted-foreground">
                  Choose the key combination for sending messages
                </p>
              </div>
              <select
                value={sendMessageWith}
                onChange={(event) => setSendMessageWith(event.target.value)}
                className="border rounded-md bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary min-w-[140px]"
              >
                <option value="enter">Enter</option>
                <option value="mod-enter">Ctrl / ⌘ + Enter</option>
                <option value="shift-enter">Shift + Enter</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-6 px-6 py-5">
              <div>
                <div className="font-medium">Scroll chat to bottom</div>
                <p className="text-sm text-muted-foreground">
                  Auto-scroll the conversation while responses stream
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn(
                  "relative inline-flex h-6 w-12 items-center rounded-full transition-colors",
                  autoScroll ? "bg-primary" : "bg-muted"
                )}
                aria-pressed={autoScroll}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-background transition-transform",
                    autoScroll ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            <div className="flex items-start justify-between gap-6 px-6 py-5">
              <div>
                <div className="font-medium">Proxy URL</div>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Supports HTTP and SOCKS5 proxy. Leave empty to connect
                  directly.
                </p>
              </div>
              <div className="flex min-w-[260px] flex-col items-end gap-2">
                <Input
                  value={proxyUrl}
                  onChange={(event) => setProxyUrl(event.target.value)}
                  className="h-9"
                  placeholder="http://127.0.0.1:7897"
                />
                <a
                  href="https://www.socks-proxy.net/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  learn more
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProvidersSection = () => {
    return (
      <div className="flex h-full min-h-0 bg-background">
        <div className="w-52 border-r py-3 bg-muted/30">
          <div className="px-3 pb-4 space-y-1">
            {providers.map((provider) => {
              const meta = providerMeta[provider];
              const isSelected = selectedProvider === provider;

              return (
                <button
                  key={provider}
                  onClick={() => {
                    startProviderTransition(() => {
                      setSelectedProvider(provider);
                    });
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors border border-transparent",
                    isSelected
                      ? "bg-primary/10 text-foreground border-primary/40"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <meta.icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between border-b px-6 py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm">{selectedConfig.name}</h2>
              {providerSpinnerActive && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {hasApiKey && (
              <button
                onClick={handleRefreshModels}
                disabled={providerSpinnerActive}
                className={cn(
                  "flex items-center gap-1 rounded px-3 py-1.5 text-xs",
                  "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  providerSpinnerActive &&
                    "cursor-not-allowed opacity-60"
                )}
              >
                <RefreshCw
                  className={cn(
                    "h-3 w-3",
                    providerSpinnerActive &&
                      "animate-spin"
                  )}
                />
                刷新模型
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-background">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => handleApiKeyChange(event.target.value)}
                  className="h-9 pr-10"
                  placeholder="输入您的 API Key"
                />
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showKey ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-base-url" className="text-sm font-medium">
                API Base URL
              </Label>
              <Input
                id="api-base-url"
                type="text"
                value={apiBaseUrl}
                onChange={(event) => handleApiBaseUrlChange(event.target.value)}
                placeholder={selectedConfig.defaultBaseUrl}
                className="h-9"
              />
            </div>

            {hasApiKey && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">可用模型</Label>
                <div className="rounded-lg border bg-background p-3">
                  <ModelList
                    models={currentProviderModels}
                    isLoading={showProviderLoading}
                    error={currentProviderError}
                  />
                </div>
              </div>
            )}

            {!hasApiKey && (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                输入 API Key 后将自动获取可用模型列表
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceholderSection = (message: string) => {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <p>{message}</p>
        <p>Coming soon.</p>
      </div>
    );
  };

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSection();
      case "providers":
        return renderProvidersSection();
      case "appearance":
        return renderPlaceholderSection(
          "Customize how the interface looks and feels."
        );
      case "prompts":
        return renderPlaceholderSection(
          "Manage shared prompt templates and quick replies."
        );
      case "mcp":
        return renderPlaceholderSection(
          "Connect MCP-compatible tools and data sources."
        );
      case "extensions":
        return renderPlaceholderSection(
          "Install extensions to unlock additional workflows."
        );
      case "advanced":
        return renderPlaceholderSection(
          "Tweak experimental capabilities and developer options."
        );
      default:
        return null;
    }
  };

  return (
    <DialogContent className="max-w-none p-0 sm:max-w-none w-[1040px] h-[720px] gap-0 bg-background overflow-hidden">
      <div className="flex h-full min-h-0 bg-background">
        <aside className="w-48 border-r bg-muted/30">
          <div className="px-3 py-3 uppercase text-center font-bold">
            Settings
          </div>
          <div className="px-3 pb-4 space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors border border-transparent",
                    isActive
                      ? "bg-primary/10 text-foreground border-primary/40"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="flex flex-1 flex-col min-w-0 bg-background">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base font-medium text-foreground">
              {activeSectionConfig.label}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            {renderSection()}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
