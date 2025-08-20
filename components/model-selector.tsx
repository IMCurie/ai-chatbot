"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Model, ModelProvider, getModelsByProvider, getProvidersWithModels } from "@/lib/models";
import { useChatStore } from "@/lib/store";

interface ModelSelectorProps {
  selectedModel: Model | null;
  onModelChange: (model: Model) => void;
}

const providerNames: Record<ModelProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  openrouter: "OpenRouter",
  grok: "Grok",
};

export default function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    availableModels, 
    isLoadingModels, 
    modelErrors, 
    fetchModels, 
    refreshModels,
    getAvailableModels
  } = useChatStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 初始加载模型
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // 获取启用的模型列表
  const enabledModels = getAvailableModels();
  
  // 基于搜索查询过滤模型
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return enabledModels;
    
    const query = searchQuery.toLowerCase();
    return enabledModels.filter(model => 
      model.id.toLowerCase().includes(query) || 
      model.name.toLowerCase().includes(query)
    );
  }, [enabledModels, searchQuery]);
  
  const providers = getProvidersWithModels(filteredModels);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-transparent hover:bg-neutral-100",
          "transition-colors",
          "text-sm font-medium text-neutral-900",
          "cursor-pointer select-none"
        )}
      >
        {selectedModel ? (
          <span>{selectedModel.name}</span>
        ) : (
          <span className="text-neutral-500">
            {availableModels.length === 0 ? "请配置API密钥" : "请启用模型"}
          </span>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-neutral-500 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full left-0 mt-2 w-80",
            "bg-white rounded-xl border border-neutral-200",
            "shadow-lg shadow-neutral-200/50",
            "max-h-96 overflow-hidden",
            "z-50"
          )}
        >
          {/* 搜索框 */}
          <div className="p-3 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索模型..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 text-sm",
                  "bg-neutral-50 border border-neutral-200 rounded-md",
                  "focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent",
                  "placeholder-neutral-400"
                )}
              />
            </div>
          </div>

          {/* 模型列表 */}
          <div className="flex-1 overflow-y-auto">
            {enabledModels.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm space-y-2">
                <div>没有启用的模型</div>
                <div className="text-xs">
                  请在 API 设置中启用模型
                </div>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">
                没有找到匹配的模型
              </div>
            ) : (
              providers.map((provider) => {
                const models = getModelsByProvider(filteredModels, provider);
                if (models.length === 0) return null;

                return (
                  <div
                    key={provider}
                    className="border-b border-neutral-100 last:border-0"
                  >
                    <div className="px-3 py-2 text-xs font-medium text-neutral-500">
                      {providerNames[provider]}
                      {modelErrors[provider] && (
                        <span className="text-red-400 text-xs ml-1">
                          (加载失败)
                        </span>
                      )}
                    </div>
                    <div className="pb-2">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange(model);
                            setIsOpen(false);
                            setSearchQuery(""); // 清空搜索
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left",
                            "hover:bg-neutral-50 transition-colors",
                            "text-sm font-medium text-neutral-900",
                            selectedModel?.id === model.id && "bg-neutral-50"
                          )}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
