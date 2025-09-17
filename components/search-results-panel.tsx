"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/lib/search";

interface SearchResultsPanelProps {
  providerLabel?: string;
  query: string;
  results: SearchResultItem[];
  isStreaming?: boolean;
}

export function SearchResultsPanel({
  providerLabel = "联网搜索",
  query,
  results,
  isStreaming = false,
}: SearchResultsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const toggle = () => setIsExpanded((prev) => !prev);

  if (!results.length) {
    return null;
  }

  return (
    <section className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm transition">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <div>
          <p className="text-sm font-semibold text-primary">
            {providerLabel}：找到 {results.length} 条相关资源
          </p>
          <p className="text-xs text-muted-foreground">
            基于查询 “{query}” {isStreaming ? "（生成回答中…）" : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-primary transition-transform",
            isExpanded ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      {isExpanded && (
        <ul className="mt-4 space-y-3">
          {results.map((result) => {
            const scoreLabel =
              typeof result.score === "number" && !Number.isNaN(result.score)
                ? `相关度 ${result.score.toFixed(2)}`
                : undefined;

            return (
              <li
                key={result.id}
                className="rounded-lg border border-primary/10 bg-background px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">[{result.index}]</span>
                      {scoreLabel && <span>{scoreLabel}</span>}
                    </div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-medium text-foreground hover:text-primary"
                    >
                      {result.title}
                    </a>
                    {result.snippet && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {result.snippet}
                      </p>
                    )}
                  </div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs text-primary transition hover:border-primary/40 hover:bg-primary/10"
                  >
                    打开
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default SearchResultsPanel;
