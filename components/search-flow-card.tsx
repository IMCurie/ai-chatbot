"use client";

import type { JSX, KeyboardEvent } from "react";
import Image from "next/image";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/lib/search";

export type SearchSessionStatus = "processing" | "complete" | "error";

export interface SearchSessionMeta {
  providerLabel: string;
  modelProvider: string;
  modelId: string;
  language: string;
  excludeWebsites?: string;
  maxResults: number;
}

export interface SearchSession {
  messageId: string;
  query: string;
  status: SearchSessionStatus;
  results: SearchResultItem[];
  error?: string;
  expanded: boolean;
  meta: SearchSessionMeta;
}

interface SearchFlowCardProps {
  session: SearchSession;
  onToggleExpanded: (messageId: string) => void;
  onRetry: (messageId: string) => void;
}

const statusText: Record<SearchSessionStatus, string> = {
  processing: "检索中",
  complete: "已完成",
  error: "检索失败",
};

const statusIcon: Record<SearchSessionStatus, JSX.Element> = {
  processing: <Loader2 className="h-4 w-4 animate-spin" />,
  complete: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

export function SearchFlowCard({
  session,
  onToggleExpanded,
  onRetry,
}: SearchFlowCardProps) {
  const shouldScroll = session.results.length > 8;

  const handleToggle = () => {
    onToggleExpanded(session.messageId);
  };

  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  const previewIcons = session.results.slice(0, 8);
  const containerClass = cn(
    "group/search-card cursor-pointer transition-all",
    "rounded-3xl bg-sidebar",
    session.expanded ? "p-4" : "px-3 py-2"
  );

  return (
    <section
      className={containerClass}
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={handleHeaderKeyDown}
      aria-expanded={session.expanded}
    >
      <div className="flex w-full items-center gap-2 rounded-full text-left">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-primary">
          <SearchIcon className="h-4 w-4" />
        </span>
        <span className="flex flex-1 items-center gap-2 overflow-hidden">
          <ResultIconStrip results={previewIcons} />
          <span className="truncate text-sm font-medium text-foreground">
            {session.query || "正在搜索"}
          </span>
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center text-primary",
              session.status === "error" && "text-destructive"
            )}
          >
            {statusIcon[session.status]}
            <span className="sr-only">{statusText[session.status]}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              session.expanded ? "rotate-180" : "rotate-0"
            )}
          />
        </span>
      </div>

      {session.status === "error" ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="flex-1 truncate">
            {session.error || "联网搜索失败，请稍后重试。"}
          </span>
          <button
            type="button"
            onClick={() => onRetry(session.messageId)}
            className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-secondary px-2.5 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only">重试</span>
          </button>
        </div>
      ) : null}

      {session.status === "complete" && session.expanded && (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            共 {session.results.length} 条结果
          </p>

          <ol
            className={cn(
              "mt-2 space-y-1",
              shouldScroll && "max-h-64 overflow-y-auto pr-1"
            )}
          >
            {session.results.length > 0 ? (
              session.results.map((result) => (
                <li key={result.id}>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-full px-3 py-2 text-left text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <span className="relative inline-flex h-5 w-5 items-center justify-center text-[11px] font-semibold text-muted-foreground">
                      {result.index + "."}
                    </span>
                    <ResultIcon result={result} />
                    <span className="line-clamp-1 flex-1 text-foreground">
                      {result.title}
                    </span>
                  </a>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                未找到合适的结果。
              </li>
            )}
          </ol>
        </>
      )}
    </section>
  );
}

function ResultIcon({ result }: { result: SearchResultItem }) {
  const hostname = safeHostname(result.url);
  const label = hostname ? hostname[0]?.toUpperCase() : "•";
  const iconUrl = hostname
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        hostname
      )}&sz=64`
    : "";

  return iconUrl ? (
    <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary/10">
      <Image
        src={iconUrl}
        alt={hostname || "站点图标"}
        width={24}
        height={24}
        className="h-full w-full object-cover"
        unoptimized
      />
    </span>
  ) : (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {label}
    </span>
  );
}

function ResultIconStrip({ results }: { results: SearchResultItem[] }) {
  return (
    <span className="flex items-center">
      {results.map((result, index) => {
        const hostname = safeHostname(result.url);
        const label = hostname ? hostname[0]?.toUpperCase() : "•";
        const iconUrl = hostname
          ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
              hostname
            )}&sz=128`
          : "";

        return (
          <span
            key={result.id}
            className={cn(
              "flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border/40 bg-card",
              index > 0 && "-ml-2"
            )}
          >
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt={hostname || "站点图标"}
                width={24}
                height={24}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-semibold text-primary">
                {label}
              </span>
            )}
          </span>
        );
      })}
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
export default SearchFlowCard;
