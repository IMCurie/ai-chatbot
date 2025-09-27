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
  Hammer,
  Ellipsis,
  type LucideIcon,
  Sparkle,
  Bot,
  Plus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelProvider, getModelsByProvider } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { ModelList } from "@/components/model-list";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    icon: Hammer,
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
};

const extensionTabs: ExtensionTab[] = [{ id: "search", label: "Search" }];

const settingsFieldClass =
  "h-9 rounded-lg border border-border/70 bg-card px-3 text-sm text-foreground shadow-xs focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/40";

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
    setSearchExtensionConfig,
    getSearchExtensionConfig,
    extensionSettings,
    mcpSettings,
    setMcpEnabled,
    addMcpServer,
    removeMcpServer,
    updateMcpServerMetadata,
    setMcpServerHeaders,
    setMcpServerTools,
    toggleMcpTool,
    getMcpRuntimeConfig,
    getMcpRuntimeServer,
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
  const [showKey, setShowKey] = useState(true);
  const [tavilyKey, setTavilyKey] = useState("");
  const [showTavilyKey, setShowTavilyKey] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingProvider, startProviderTransition] = useTransition();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialSearchConfig = getSearchExtensionConfig();
  const fallbackProvider =
    getProviderOption(initialSearchConfig.queryModelProvider)?.value ??
    SEARCH_MODEL_PROVIDERS[0]?.value ??
    "google";
  const fallbackModel =
    getProviderOption(fallbackProvider)?.models.find(
      (model) => model.value === initialSearchConfig.queryModelId
    )?.value ??
    getProviderOption(fallbackProvider)?.models[0]?.value ??
    "";
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
  type ServerSyncState = {
    state: "idle" | "loading" | "success" | "error";
    message?: string;
  };
  const [syncStatus, setSyncStatus] = useState<Record<string, ServerSyncState>>(
    {}
  );

  const runtimeMcpConfig = getMcpRuntimeConfig();
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const toggleServerExpanded = useCallback((id: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!mcpSettings.enabled) {
      setSyncStatus({});
    }
  }, [mcpSettings.enabled]);

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
      modelOptions.find((model) => model.value === config.queryModelId)
        ?.value ??
      modelOptions[0]?.value ??
      fallbackModel;

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

  const handleToggleMcpEnabled = useCallback(() => {
    setMcpEnabled(!mcpSettings.enabled);
  }, [mcpSettings.enabled, setMcpEnabled]);

  const updateHeaders = useCallback(
    (
      serverId: string,
      updater: (
        headers: Array<{ id: string; key: string; value: string }>
      ) => Array<{ id?: string; key: string; value: string }>
    ) => {
      const runtime = getMcpRuntimeConfig();
      const target = runtime.servers.find((server) => server.id === serverId);
      const currentHeaders = target?.headers ?? [];
      const nextHeaders = updater(currentHeaders);
      setMcpServerHeaders(serverId, nextHeaders);
    },
    [getMcpRuntimeConfig, setMcpServerHeaders]
  );

  const handleHeaderKeyChange = useCallback(
    (serverId: string, headerId: string, value: string) => {
      updateHeaders(serverId, (headers) =>
        headers.map((header) =>
          header.id === headerId ? { ...header, key: value } : header
        )
      );
    },
    [updateHeaders]
  );

  const handleHeaderValueChange = useCallback(
    (serverId: string, headerId: string, value: string) => {
      updateHeaders(serverId, (headers) =>
        headers.map((header) =>
          header.id === headerId ? { ...header, value } : header
        )
      );
    },
    [updateHeaders]
  );

  const handleAddHeader = useCallback(
    (serverId: string) => {
      updateHeaders(serverId, (headers) => [
        ...headers,
        { id: undefined, key: "", value: "" },
      ]);
    },
    [updateHeaders]
  );

  const handleRemoveHeader = useCallback(
    (serverId: string, headerId: string) => {
      updateHeaders(serverId, (headers) =>
        headers.filter((header) => header.id !== headerId)
      );
    },
    [updateHeaders]
  );

  const handleAddServer = useCallback(() => {
    const index = mcpSettings.servers.length + 1;
    addMcpServer({
      name: `Server ${index}`,
      url: "",
    });
  }, [addMcpServer, mcpSettings.servers.length]);

  const handleRemoveServer = useCallback(
    (serverId: string) => {
      removeMcpServer(serverId);
      setSyncStatus((prev) => {
        const next = { ...prev };
        delete next[serverId];
        return next;
      });
    },
    [removeMcpServer]
  );

  const handleSyncTools = useCallback(
    async (serverId: string) => {
      const target = getMcpRuntimeServer(serverId);

      if (!target) {
        setSyncStatus((prev) => ({
          ...prev,
          [serverId]: {
            state: "error",
            message: "无法读取该服务的配置，请刷新后重试。",
          },
        }));
        return;
      }

      const endpoint = target.url.trim();
      if (!endpoint) {
        setSyncStatus((prev) => ({
          ...prev,
          [serverId]: {
            state: "error",
            message: "请先填写 MCP 服务地址",
          },
        }));
        return;
      }

      setSyncStatus((prev) => ({
        ...prev,
        [serverId]: { state: "loading" },
      }));

      try {
        const response = await fetch("/api/mcp/tools/list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            server: {
              id: serverId,
              url: endpoint,
              headers: target.headers
                .filter((header) => header.key.trim() && header.value.trim())
                .map((header) => ({
                  key: header.key.trim(),
                  value: header.value.trim(),
                })),
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let message = errorText || "同步工具失败";

          try {
            const parsed = JSON.parse(errorText) as { error?: string };
            if (parsed?.error) {
              message = parsed.error;
            }
          } catch {
            // ignore JSON parse errors and fall back to raw response text
          }

          throw new Error(message);
        }

        const payload = (await response.json()) as {
          tools?: Array<{ name: string; description?: string }>;
        };
        const tools = Array.isArray(payload.tools) ? payload.tools : [];

        setMcpServerTools(
          serverId,
          tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            lastSyncedAt: new Date().toISOString(),
          }))
        );

        setSyncStatus((prev) => ({
          ...prev,
          [serverId]: {
            state: "success",
            message:
              tools.length > 0
                ? `已同步 ${tools.length} 个工具`
                : "未从服务获取到工具",
          },
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "同步工具失败";
        setSyncStatus((prev) => ({
          ...prev,
          [serverId]: {
            state: "error",
            message,
          },
        }));
      }
    },
    [getMcpRuntimeServer, setMcpServerTools]
  );

  const handleToggleTool = useCallback(
    (serverId: string, toolName: string, enabled: boolean) => {
      toggleMcpTool(serverId, toolName, enabled);
    },
    [toggleMcpTool]
  );

  const formatTimestamp = useCallback((value?: string) => {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return date.toLocaleString();
  }, []);

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
      <div className="h-full overflow-y-auto px-6 py-5">
        <div className="divide-y divide-border/60">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Language</p>
              <p className="text-xs text-muted-foreground">
                Choose the interface language used across the app.
              </p>
            </div>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={cn(settingsFieldClass, "min-w-[150px]")}
            >
              <option value="en">English</option>
              <option value="zh">简体中文</option>
              <option value="ja">日本語</option>
            </select>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Send message with
              </p>
              <p className="text-xs text-muted-foreground">
                Pick the key combination that submits messages by default.
              </p>
            </div>
            <select
              value={sendMessageWith}
              onChange={(event) => setSendMessageWith(event.target.value)}
              className={cn(settingsFieldClass, "min-w-[150px]")}
            >
              <option value="enter">Enter</option>
              <option value="mod-enter">Ctrl / ⌘ + Enter</option>
              <option value="shift-enter">Shift + Enter</option>
            </select>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Scroll chat to bottom
              </p>
              <p className="text-xs text-muted-foreground">
                Automatically follow responses as they stream in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full border border-border/70 transition-colors",
                autoScroll ? "bg-primary/90" : "bg-muted"
              )}
              aria-pressed={autoScroll}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-card transition-transform",
                  autoScroll ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-3.5">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Proxy URL</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Supports HTTP and SOCKS5 proxy endpoints. Leave blank to connect
                directly.
              </p>
            </div>
            <div className="flex min-w-[240px] flex-col items-end gap-2">
              <Input
                value={proxyUrl}
                onChange={(event) => setProxyUrl(event.target.value)}
                className={cn(settingsFieldClass)}
                placeholder="http://127.0.0.1:7897"
              />
              <a
                href="https://www.socks-proxy.net/"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                Learn more
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProvidersSection = () => {
    return (
      <div className="flex h-full min-h-0 bg-card">
        <div className="flex w-44 flex-col border-r border-sidebar-border bg-sidebar py-3">
          <div className="flex-1 space-y-1 px-2">
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
                    "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                  )}
                >
                  <meta.icon className="h-4 w-4 shrink-0" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-2.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {selectedConfig.name}
              </h2>
              {providerSpinnerActive && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {hasApiKey && (
              <button
                onClick={handleRefreshModels}
                disabled={providerSpinnerActive}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  providerSpinnerActive && "cursor-not-allowed opacity-60"
                )}
              >
                <RefreshCw
                  className={cn(
                    "h-3 w-3",
                    providerSpinnerActive && "animate-spin"
                  )}
                />
                刷新模型
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 px-5 py-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "password" : "text"}
                  value={apiKey}
                  onChange={(event) => handleApiKeyChange(event.target.value)}
                  className={cn(settingsFieldClass, "pr-10")}
                  placeholder="输入您的 API Key"
                />
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api-base-url" className="text-sm font-medium">
                API Base URL
              </Label>
              <Input
                id="api-base-url"
                type="text"
                value={apiBaseUrl}
                onChange={(event) => handleApiBaseUrlChange(event.target.value)}
                placeholder={selectedConfig.defaultBaseUrl}
                className={cn(settingsFieldClass)}
              />
            </div>

            {hasApiKey && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">可用模型</Label>
                <div className="rounded-2xl border border-border bg-card p-3">
                  <ModelList
                    models={currentProviderModels}
                    isLoading={showProviderLoading}
                    error={currentProviderError}
                  />
                </div>
              </div>
            )}

            {!hasApiKey && (
              <div className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                输入 API Key 后将自动获取可用模型列表
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSearchSettings = () => {
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
      <div className="max-w-3xl space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Search</h3>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="search-engine" className="text-sm font-medium">
              Search engine
            </Label>
            <p className="text-xs text-muted-foreground">
              Get search results using{" "}
              <a
                href="https://docs.tavily.com/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Tavily&apos;s API
              </a>
            </p>
            <Select value="tavily-api-key" disabled>
              <SelectTrigger className="max-w-[280px]">
                <SelectValue placeholder="Tavily (API Key)" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="tavily-api-key">Tavily (API Key)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tavily-key" className="text-sm font-medium">
              Tavily API Key
            </Label>
            <div className="relative">
              <Input
                id="tavily-key"
                type={showTavilyKey ? "password" : "text"}
                value={tavilyKey}
                onChange={(event) => handleTavilyKeyChange(event.target.value)}
                placeholder="tavily_sk_..."
                className={cn(settingsFieldClass, "pr-12")}
                autoComplete="off"
              />
              {tavilyKey && (
                <button
                  type="button"
                  onClick={() => setShowTavilyKey(!showTavilyKey)}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                  aria-label={
                    showTavilyKey
                      ? "Hide Tavily API key"
                      : "Show Tavily API key"
                  }
                >
                  {showTavilyKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Model for search query generation</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,220px)]">
                <Select
                  value={searchModelProvider}
                  onValueChange={handleSearchProviderChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {SEARCH_MODEL_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={providerModels.length === 0 ? "" : searchModelId}
                  onValueChange={handleSearchModelChange}
                  disabled={providerModels.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No models" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {providerModels.length === 0 ? (
                      <SelectItem value="" disabled>
                        No models
                      </SelectItem>
                    ) : (
                      providerModels.map((modelOption) => (
                        <SelectItem
                          key={modelOption.value}
                          value={modelOption.value}
                        >
                          {modelOption.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Search query language</span>
              </div>
              <Select
                value={searchLanguage}
                onValueChange={handleSearchLanguageChange}
              >
                <SelectTrigger className="max-w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {SEARCH_LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Exclude websites</span>
              </div>
              <Input
                value={searchExcludeSites}
                onChange={(event) =>
                  handleSearchExcludeSitesChange(event.target.value)
                }
                placeholder="a.com,b.com"
                className={cn(settingsFieldClass)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                <span>Max search results</span>
              </div>
              <Input
                value={searchMaxResultsInput}
                onChange={(event) =>
                  setSearchMaxResultsInput(event.target.value)
                }
                onBlur={handleMaxResultsBlur}
                onKeyDown={handleMaxResultsKeyDown}
                inputMode="numeric"
                className={cn(settingsFieldClass, "max-w-[140px]")}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMcpSection = () => {
    const isEnabled = mcpSettings.enabled;
    const runtimeServers = runtimeMcpConfig.servers;

    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border/60 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">
                Model Context Protocol
              </h3>
              <p className="text-sm text-muted-foreground">
                连接实现 MCP HTTP transport 的服务，使助手可以在对话中调用工具。
              </p>
            </div>
            <div className="flex items-center gap-3 self-end md:self-auto">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isEnabled ? "已启用" : "已关闭"}
              </span>
              <button
                type="button"
                onClick={handleToggleMcpEnabled}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full border border-border/70 transition-colors",
                  isEnabled ? "bg-primary/90" : "bg-muted"
                )}
                aria-pressed={isEnabled}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-card transition-transform",
                    isEnabled ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {mcpSettings.servers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isEnabled
                  ? "还没有配置 MCP 服务，点击下方按钮开始。"
                  : "启用 MCP 后可以在这里配置服务和工具。"}
              </p>
            </div>
          ) : (
            mcpSettings.servers.map((server) => {
              const runtimeServer =
                runtimeServers.find((item) => item.id === server.id) ?? null;
              const headers = runtimeServer?.headers ?? [];
              const syncState = syncStatus[server.id] ?? { state: "idle" };
              const lastSyncedAt = server.tools.reduce<string | undefined>(
                (latest, tool) => {
                  if (!tool.lastSyncedAt) {
                    return latest;
                  }
                  if (!latest) {
                    return tool.lastSyncedAt;
                  }
                  return tool.lastSyncedAt > latest ? tool.lastSyncedAt : latest;
                },
                undefined
              );
              const isExpanded = expandedServers.has(server.id);

              return (
                <div
                  key={server.id}
                  className="rounded-2xl border border-border/70 bg-card/80"
                >
                  {/* Header row (collapsible) */}
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    onClick={() => toggleServerExpanded(server.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="text-sm font-medium text-foreground truncate">
                      {server.name || "MCP Server"}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-sm text-muted-foreground max-w-[40%]">
                      {server.url || "未配置 URL"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {server.tools.length > 0 ? `工具 ${server.tools.length}` : "无工具"}
                      {lastSyncedAt ? ` · 同步 ${formatTimestamp(lastSyncedAt)}` : ""}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")}/>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-border/60 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="w-full md:max-w-sm">
                          <Label className="text-sm font-medium">显示名称</Label>
                          <Input
                            type="text"
                            value={server.name}
                            onChange={(event) =>
                              updateMcpServerMetadata(server.id, {
                                name: event.target.value,
                              })
                            }
                            disabled={!isEnabled}
                            className={cn(settingsFieldClass, "mt-1")}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSyncTools(server.id)}
                            disabled={!isEnabled || syncState.state === "loading"}
                          >
                            {syncState.state === "loading" ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            同步工具
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveServer(server.id)}
                            disabled={!isEnabled}
                            aria-label="删除 MCP 服务"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">服务地址</Label>
                        <Input
                          type="text"
                          value={server.url}
                          onChange={(event) =>
                            updateMcpServerMetadata(server.id, {
                              url: event.target.value,
                            })
                          }
                          placeholder="https://example.com/mcp"
                          disabled={!isEnabled}
                          className={cn(settingsFieldClass)}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">HTTP Headers</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddHeader(server.id)}
                            disabled={!isEnabled}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            添加 Header
                          </Button>
                        </div>
                        {headers.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
                            尚未配置 Header。
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {headers.map((header) => (
                              <div
                                key={header.id}
                                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2"
                              >
                                <Input
                                  type="text"
                                  value={header.key}
                                  onChange={(event) =>
                                    handleHeaderKeyChange(
                                      server.id,
                                      header.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Authorization"
                                  disabled={!isEnabled}
                                  className={cn(settingsFieldClass)}
                                />
                                <Input
                                  type="text"
                                  value={header.value}
                                  onChange={(event) =>
                                    handleHeaderValueChange(
                                      server.id,
                                      header.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Bearer xxx"
                                  disabled={!isEnabled}
                                  className={cn(settingsFieldClass)}
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleRemoveHeader(server.id, header.id)
                                  }
                                  disabled={!isEnabled}
                                  aria-label="删除 Header"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">工具列表</Label>
                          {lastSyncedAt && (
                            <span className="text-xs text-muted-foreground">
                              最近同步：{formatTimestamp(lastSyncedAt)}
                            </span>
                          )}
                        </div>
                        {server.tools.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
                            还没有可用工具，尝试同步以获取服务提供的工具。
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {server.tools.map((tool) => (
                              <div
                                key={tool.name}
                                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2"
                              >
                                <div className="min-w-0 pr-4">
                                  <p className="truncate text-sm font-medium text-foreground">
                                    {tool.name}
                                  </p>
                                  {tool.description && (
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                      {tool.description}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleTool(
                                      server.id,
                                      tool.name,
                                      !tool.enabled
                                    )
                                  }
                                  disabled={!isEnabled}
                                  className={cn(
                                    "relative inline-flex h-6 w-12 shrink-0 items-center rounded-full border border-border/70 transition-colors",
                                    tool.enabled ? "bg-primary/90" : "bg-muted"
                                  )}
                                  aria-pressed={tool.enabled}
                                  aria-label={tool.enabled ? "禁用工具" : "启用工具"}
                                >
                                  <span
                                    className={cn(
                                      "inline-block h-4 w-4 rounded-full bg-card transition-transform",
                                      tool.enabled ? "translate-x-6" : "translate-x-1"
                                    )}
                                  />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {syncState.state !== "idle" && syncState.message && (
                        <p
                          className={cn(
                            "text-xs",
                            syncState.state === "error"
                              ? "text-destructive"
                              : "text-muted-foreground"
                          )}
                        >
                          {syncState.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddServer}
              disabled={!isEnabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              新增 MCP 服务
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderExtensionsSection = () => {
    return (
      <div className="flex h-full min-h-0 bg-card">
        <div className="flex w-44 flex-col border-r border-sidebar-border bg-sidebar py-3">
          <div className="flex-1 space-y-1 px-2">
            {extensionTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveExtensionTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-sm transition-colors",
                  activeExtensionTab === tab.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {renderSearchSettings()}
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
        return renderMcpSection();
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
    <DialogContent className="h-[640px] w-[940px] max-w-none overflow-hidden rounded-[16px] border border-border bg-card p-0 shadow-lg sm:max-w-none">
      <div className="flex h-full min-h-0 bg-card">
        <aside className="flex w-44 flex-col border-r border-sidebar-border bg-sidebar">
          <nav className="flex-1 space-y-1 px-2 py-3">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = section.id === activeSection;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="flex flex-1 flex-col min-w-0 bg-card">
          <DialogHeader className="border-b border-border/60 px-5 py-3.5">
            <DialogTitle className="text-base font-semibold text-foreground">
              {activeSectionConfig.label}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden bg-card">
            {renderSection()}
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
