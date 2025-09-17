"use client";

import { useState, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Model } from "@/lib/models";
import { useChatStore } from "@/lib/store";
import { Input } from "@/components/ui/input";

interface ModelListProps {
  models: Model[];
  isLoading?: boolean;
  error?: string;
}

export function ModelList({ models, isLoading, error }: ModelListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { isModelEnabled, toggleModel } = useChatStore();

  // 过滤模型基于搜索查询
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase();
    return models.filter(model => 
      model.id.toLowerCase().includes(query) || 
      model.name.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  const enabledCount = models.filter(model => isModelEnabled(model.id)).length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">加载模型中...</div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
        获取模型失败: {error}
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        未找到可用模型
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 模型统计 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{models.length} 个模型可用</span>
        <span>{enabledCount} 个已启用</span>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索模型..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* 模型列表 */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredModels.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            没有找到匹配的模型
          </div>
        ) : (
          filteredModels.map((model) => {
            const enabled = isModelEnabled(model.id);
            
            return (
              <label
                key={model.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                  "hover:bg-muted/50",
                  enabled && "bg-muted/30"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-4 h-4 border rounded transition-colors flex-shrink-0",
                  enabled 
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 hover:border-primary"
                )}>
                  {enabled && <Check className="w-3 h-3" />}
                </div>
                
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleModel(model.id)}
                  className="sr-only"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {model.name}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>

      {/* 快速操作 */}
      {models.length > 0 && (
        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={() => models.forEach(model => {
              if (!isModelEnabled(model.id)) {
                toggleModel(model.id);
              }
            })}
            className="text-xs text-primary hover:underline"
          >
            全部启用
          </button>
          <button
            onClick={() => models.forEach(model => {
              if (isModelEnabled(model.id)) {
                toggleModel(model.id);
              }
            })}
            className="text-xs text-muted-foreground hover:underline"
          >
            全部禁用
          </button>
        </div>
      )}
    </div>
  );
}
