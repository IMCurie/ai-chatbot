"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

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
    <section
      aria-label={`基于查询 ${query} 的搜索结果`}
      className="rounded-3xl border border-primary/20 bg-secondary/80"
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-2xl border border-primary/15 bg-secondary/60 px-4 py-3 text-left"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-semibold text-foreground">{providerLabel}</span>
        <span className="text-xs text-muted-foreground">
          {results.length} 条结果{isStreaming ? " · 生成中" : ""}
        </span>
        <span className="ml-auto flex items-center text-muted-foreground">
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded ? "rotate-180" : "rotate-0"
            )}
          />
        </span>
      </button>

      {isExpanded && (
        <ol className="border-t border-primary/15 px-1 pb-1">
          {results.map((result) => (
            <li key={result.id}>
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-transparent bg-background/90 px-3 py-2 text-sm transition hover:border-primary/30 hover:bg-background"
              >
                <span className="text-xs font-semibold text-primary">
                  {result.index}
                </span>
                <ResultIcon result={result} />
                <span className="line-clamp-1 flex-1 text-foreground transition group-hover:text-primary">
                  {result.title}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ResultIcon({ result }: { result: SearchResultItem }) {
  const hostname = safeHostname(result.url);
  const label = hostname ? hostname[0]?.toUpperCase() : "•";

  const iconUrl = hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
    : "";

  return iconUrl ? (
    <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-primary/10">
      <Image
        src={iconUrl}
        alt={hostname || "站点图标"}
        width={20}
        height={20}
        className="h-5 w-5"
        unoptimized
      />
    </span>
  ) : (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {label}
    </span>
  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export default SearchResultsPanel;
