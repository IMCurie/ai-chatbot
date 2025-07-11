"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Brain, Gem, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Model,
  ModelProvider,
  getModelsByProvider,
  formatContextLength,
} from "@/lib/models";

interface ModelSelectorProps {
  selectedModel: Model;
  onModelChange: (model: Model) => void;
}

const providerIcons: Record<ModelProvider, React.ReactNode> = {
  openai: <Sparkles className="w-4 h-4" />,
  anthropic: <Brain className="w-4 h-4" />,
  google: <Gem className="w-4 h-4" />,
  openrouter: <Globe className="w-4 h-4" />,
  grok: <Zap className="w-4 h-4" />,
};

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
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const providers: ModelProvider[] = [
    "openai",
    "anthropic",
    "google",
    "openrouter",
    "grok",
  ];

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
        <span className="text-neutral-600">
          {providerIcons[selectedModel.provider]}
        </span>
        <span>{selectedModel.name}</span>
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
            "absolute bottom-full left-0 mb-5 w-72",
            "bg-white rounded-xl border border-neutral-200",
            "shadow-lg shadow-neutral-200/50",
            "max-h-96 overflow-y-auto",
            "z-50"
          )}
        >
          {providers.map((provider) => {
            const models = getModelsByProvider(provider);
            if (models.length === 0) return null;

            return (
              <div
                key={provider}
                className="border-b border-neutral-100 last:border-0"
              >
                <div className="px-3 py-2 flex items-center gap-2 text-xs font-medium text-neutral-500">
                  <span className="text-neutral-400">
                    {providerIcons[provider]}
                  </span>
                  {providerNames[provider]}
                </div>
                <div className="pb-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left",
                        "hover:bg-neutral-50 transition-colors",
                        "flex items-center justify-between gap-2",
                        selectedModel.id === model.id && "bg-neutral-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-600">
                          {providerIcons[model.provider]}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-neutral-900">
                            {model.name}
                          </span>
                          {model.description && (
                            <span className="text-xs text-neutral-500">
                              {model.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-neutral-400">
                        {formatContextLength(model.contextLength)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
