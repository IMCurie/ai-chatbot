"use client";

import {
  useState,
  useEffect,
  useRef,
  ReactNode,
  useMemo,
  useCallback,
  useTransition,
  type FocusEvent,
  type KeyboardEvent,
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
  HelpCircle,
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

type ExtensionTabId = "search";

type ExtensionTab = {
  id: ExtensionTabId;
  label: string;
  description: string;
};

const extensionTabs: ExtensionTab[] = [
  {
    id: "search",
    label: "Search",
    description: "Configure online search integrations and behaviour",
  },
];

type SearchModelOption = {
  value: string;
  label: string;
};

type SearchModelProviderOption = {
  value: string;
  label: string;
  models: SearchModelOption[];
};

const SEARCH_MODEL_PROVIDERS: SearchModelProviderOption[] = [
  {
    value: "google",
    label: "Google AI",
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },
  {
    value: "openai",
    label: "OpenAI",
    models: [
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
  {
    value: "anthropic",
    label: "Anthropic",
    models: [
      { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-haiku", label: "Claude 3 Haiku" },
      { value: "claude-3-opus", label: "Claude 3 Opus" },
    ],
  },
];

const SEARCH_LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "zh-CN", label: "中文（简体）" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국어" },
  { value: "fr-FR", label: "Français" },
];

const getProviderOption = (value: string) =>
  SEARCH_MODEL_PROVIDERS.find((provider) => provider.value === value);

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
    setTavilyApiKey,
    getTavilyApiKey,
    clearTavilyApiKey,
    setSearchExtensionConfig,
    getSearchExtensionConfig,
    extensionSettings,
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
  const [tavilyKey, setTavilyKey] = useState("");
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingProvider, startProviderTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialSearchConfig = getSearchExtensionConfig();
  const fallbackProvider =
    getProviderOption(initialSearchConfig.queryModelProvider)?.value ??
    (SEARCH_MODEL_PROVIDERS[0]?.value ?? "google");
  const fallbackModel =
    getProviderOption(fallbackProvider)?.models.find(
      (model) => model.value === initialSearchConfig.queryModelId
    )?.value ??
    (getProviderOption(fallbackProvider)?.models[0]?.value ?? "");
  const [activeExtensionTab, setActiveExtensionTab] =
    useState<ExtensionTabId>("search");
  const [searchModelProvider, setSearchModelProvider] =
    useState<string>(fallbackProvider);
  const [searchModelId, setSearchModelId] = useState<string>(fallbackModel);
  const [searchLanguage, setSearchLanguage] = useState<string>(
    initialSearchConfig.queryLanguage
  );
  const [searchExcludeSites, setSearchExcludeSites] = useState<string>(
    initialSearchConfig.excludeWebsites ?? ""
  );
  const [searchMaxResultsInput, setSearchMaxResultsInput] = useState<string>(
    String(initialSearchConfig.maxResults)
  );

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

  useEffect(() => {
    setTavilyKey(getTavilyApiKey() || "");
  }, [getTavilyApiKey]);

  useEffect(() => {
    const config = getSearchExtensionConfig();
    const providerOption =
      getProviderOption(config.queryModelProvider) ??
      getProviderOption(SEARCH_MODEL_PROVIDERS[0]?.value ?? "google");
    const providerValue = providerOption?.value ?? fallbackProvider;
    const modelOptions = providerOption?.models ?? [];
    const modelValue =
      modelOptions.find((model) => model.value === config.queryModelId)?.value ??
      (modelOptions[0]?.value ?? fallbackModel);

    setSearchModelProvider(providerValue);
    setSearchModelId(modelValue);
    setSearchLanguage(config.queryLanguage);
    setSearchExcludeSites(config.excludeWebsites ?? "");
    setSearchMaxResultsInput(String(config.maxResults));
  }, [
    extensionSettings.searchConfig,
    fallbackModel,
    fallbackProvider,
    getSearchExtensionConfig,
  ]);

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

  const handleTavilyKeyChange = (value: string) => {
    setTavilyKey(value);
    setTavilyApiKey(value);
  };

  const handleTavilyKeyClear = () => {
    setTavilyKey("");
    clearTavilyApiKey();
  };

  const handleSearchProviderChange = useCallback(
    (value: string) => {
      const providerOption =
        getProviderOption(value) ??
        getProviderOption(SEARCH_MODEL_PROVIDERS[0]?.value ?? "google");
      const providerValue = providerOption?.value ?? value;
      const modelOptions = providerOption?.models ?? [];
      const preserved = modelOptions.find(
        (model) => model.value === searchModelId
      );
      const fallback = preserved?.value ?? modelOptions[0]?.value ?? "";

      setSearchModelProvider(providerValue);
      setSearchModelId(fallback);

      setSearchExtensionConfig({
        queryModelProvider: providerValue,
        queryModelId: fallback,
      });
    },
    [searchModelId, setSearchExtensionConfig]
  );

  const handleSearchModelChange = useCallback(
    (value: string) => {
      setSearchModelId(value);
      setSearchExtensionConfig({ queryModelId: value });
    },
    [setSearchExtensionConfig]
  );

  const handleSearchLanguageChange = useCallback(
    (value: string) => {
      setSearchLanguage(value);
      setSearchExtensionConfig({ queryLanguage: value });
    },
    [setSearchExtensionConfig]
  );

  const handleSearchExcludeSitesChange = useCallback(
    (value: string) => {
      setSearchExcludeSites(value);
      setSearchExtensionConfig({ excludeWebsites: value });
    },
    [setSearchExtensionConfig]
  );

  const commitSearchMaxResults = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      const next = Number.isFinite(parsed)
        ? Math.max(1, Math.min(50, parsed))
        : getSearchExtensionConfig().maxResults;
      setSearchMaxResultsInput(String(next));
      setSearchExtensionConfig({ maxResults: next });
    },
    [getSearchExtensionConfig, setSearchExtensionConfig]
  );

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

  const renderSearchSettings = () => {
    const hasSavedTavilyKey = Boolean(tavilyKey.trim());
    const providerOption =
      getProviderOption(searchModelProvider) ??
      getProviderOption(SEARCH_MODEL_PROVIDERS[0]?.value ?? "google");
    const providerModels = providerOption?.models ?? [];

    const handleMaxResultsBlur = (event: FocusEvent<HTMLInputElement>) => {
      commitSearchMaxResults(event.target.value);
    };

    const handleMaxResultsKeyDown = (
      event: KeyboardEvent<HTMLInputElement>
    ) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitSearchMaxResults(event.currentTarget.value);
      }
    };

    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h3 className="text-base font-semibold">联网搜索</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            配置 Tavily API 及搜索策略，启用联网搜索时可生成可追溯的参考信息。
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border bg-muted/10 p-6 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tavily-key" className="text-sm font-medium">
                Tavily API Key
              </Label>
            </div>
            <div className="relative">
              <Input
                id="tavily-key"
                type={showTavilyKey ? "text" : "password"}
                value={tavilyKey}
                onChange={(event) => handleTavilyKeyChange(event.target.value)}
                placeholder="tavily_sk_..."
                className="h-9 pr-40"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {hasSavedTavilyKey && (
                  <span className="text-xs font-semibold text-emerald-600">
                    已保存
                  </span>
                )}
                {tavilyKey && (
                  <button
                    type="button"
                    onClick={() => setShowTavilyKey(!showTavilyKey)}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {showTavilyKey ? "隐藏" : "显示"}
                  </button>
                )}
                {hasSavedTavilyKey && (
                  <button
                    type="button"
                    onClick={handleTavilyKeyClear}
                    className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-destructive"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              密钥仅以加密形式保存在本地浏览器中，不会上传到服务器。
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Model for search query generation</span>
                <HelpCircle
                  className="h-3.5 w-3.5 text-muted-foreground"
                  title="当聊天启用联网搜索时，先使用该模型将用户输入改写为搜索关键词"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={searchModelProvider}
                  onChange={(event) =>
                    handleSearchProviderChange(event.target.value)
                  }
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary sm:max-w-[180px]"
                >
                  {SEARCH_MODEL_PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <select
                  value={searchModelId}
                  onChange={(event) =>
                    handleSearchModelChange(event.target.value)
                  }
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  disabled={providerModels.length === 0}
                >
                  {providerModels.length === 0 && (
                    <option value="">暂无可用模型</option>
                  )}
                  {providerModels.map((modelOption) => (
                    <option key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Search query language</span>
                <HelpCircle
                  className="h-3.5 w-3.5 text-muted-foreground"
                  title="优先使用该语言编写搜索语句"
                />
              </div>
              <select
                value={searchLanguage}
                onChange={(event) =>
                  handleSearchLanguageChange(event.target.value)
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary sm:max-w-[220px]"
              >
                {SEARCH_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Exclude websites</span>
                <HelpCircle
                  className="h-3.5 w-3.5 text-muted-foreground"
                  title="以逗号分隔的域名列表，在搜索时排除这些站点"
                />
              </div>
              <Input
                value={searchExcludeSites}
                onChange={(event) =>
                  handleSearchExcludeSitesChange(event.target.value)
                }
                placeholder="a.com,b.com"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Max search results</span>
                <HelpCircle
                  className="h-3.5 w-3.5 text-muted-foreground"
                  title="限制 Tavily 返回的结果条数（1-50）"
                />
              </div>
              <Input
                value={searchMaxResultsInput}
                onChange={(event) => setSearchMaxResultsInput(event.target.value)}
                onBlur={handleMaxResultsBlur}
                onKeyDown={handleMaxResultsKeyDown}
                inputMode="numeric"
                className="h-9 sm:max-w-[140px]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">使用建议</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>控制查询长度（≤400 字符），避免无关信息。</li>
            <li>根据问题复杂度调整最大搜索结果，平衡覆盖率和速度。</li>
            <li>合理维护排除站点列表，减少重复或低质量来源。</li>
            <li>回答前审阅来源内容，必要时提醒用户自行核实。</li>
          </ul>
          <a
            href="https://docs.tavily.com/documentation/best-practices/best-practices-search"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs text-primary transition hover:underline"
          >
            查看 Tavily 搜索最佳实践
          </a>
        </div>
      </div>
    );
  };

  const renderExtensionsSection = () => {
    return (
      <div className="flex h-full min-h-0 bg-background">
        <div className="w-52 border-r bg-muted/30 py-6">
          <div className="px-3 pb-4 space-y-1">
            {extensionTabs.map((tab) => {
              const isSelected = tab.id === activeExtensionTab;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveExtensionTab(tab.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors border border-transparent",
                    isSelected
                      ? "bg-primary/10 text-foreground border-primary/40"
                      : "text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="font-medium">{tab.label}</span>
                  <span className="text-xs text-muted-foreground/80">
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {activeExtensionTab === "search" ? renderSearchSettings() : null}
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
        return renderExtensionsSection();
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
