"use client";

import { useState, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
} from "lucide-react";
import Image from "next/image";

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

const backgroundGridClass =
  "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15)_1px,_transparent_0)] bg-[size:20px_20px]";

const providerBadgeClass =
  "inline-flex items-center rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white shadow-sm";

const statusBadgeClass = {
  processing: "text-blue-600",
  complete: "text-emerald-600",
  error: "text-red-600",
} as const;

const statusIcon = {
  processing: <Loader2 className="h-4 w-4 animate-spin" />,
  complete: <CheckCircle2 className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
} as const;

export function SearchFlowCard({
  session,
  onToggleExpanded,
  onRetry,
}: SearchFlowCardProps) {
  const [activeTab, setActiveTab] = useState<"sources" | "parameters">("sources");
  const searchUrl = useMemo(() => {
    return `https://app.tavily.com/search?q=${encodeURIComponent(session.query)}`;
  }, [session.query]);

  const headerStatusLabel =
    session.status === "processing"
      ? "processing"
      : session.status === "complete"
      ? "complete"
      : "failed";

  const providerLabel = session.meta.providerLabel || "tavily";

  const hasResults = session.results.length > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-blue-50/60 shadow-sm">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80",
          backgroundGridClass
        )}
      />
      <div className="relative px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm font-medium">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <SearchIcon className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold lowercase tracking-wide">
                {providerLabel}
              </span>
              <span className={cn("flex items-center gap-1 text-sm", statusBadgeClass[session.status])}>
                {statusIcon[session.status]}
                {headerStatusLabel}
              </span>
            </div>
          </div>
          {session.status === "processing" && (
            <span className={providerBadgeClass}>{session.query}</span>
          )}
          {session.status === "error" && (
            <button
              type="button"
              onClick={() => onRetry(session.messageId)}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> 重试
            </button>
          )}
        </div>

        {session.status === "complete" && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => onToggleExpanded(session.messageId)}
              className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-white/80 px-4 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-white"
            >
              <SearchIcon className="h-4 w-4" />
              Search
              {session.expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        )}

        {session.status === "processing" && (
          <div className="mt-3 text-sm text-muted-foreground">
            正在为 “{session.query}” 联网检索可用信息…
          </div>
        )}

        {session.status === "error" && (
          <div className="mt-3 rounded-xl border border-red-200 bg-white/70 p-4 text-sm text-red-600">
            {session.error || "联网搜索失败，请稍后重试。"}
          </div>
        )}

        {session.status === "complete" && session.expanded && (
          <div className="mt-4 rounded-2xl border border-blue-200/70 bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-blue-900">Search</div>
              <a
                href={searchUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700"
              >
                在 Tavily 查看全部
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("sources")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  activeTab === "sources"
                    ? "bg-blue-100 text-blue-700"
                    : "text-muted-foreground hover:bg-blue-50"
                )}
              >
                Sources
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("parameters")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  activeTab === "parameters"
                    ? "bg-blue-100 text-blue-700"
                    : "text-muted-foreground hover:bg-blue-50"
                )}
              >
                Parameters
              </button>
            </div>

            {activeTab === "sources" ? (
              <div className="mt-3 space-y-3 text-sm">
                {hasResults ? (
                  <ol className="space-y-2 text-blue-900">
                    {session.results.map((result) => {
                      const hostname = safeHostname(result.url);
                      const iconUrl = hostname
                        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                            hostname
                          )}&sz=64`
                        : null;
                      const displayIndex = result.index ?? 0;

                      return (
                        <li key={result.id}>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl bg-white/90 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-800"
                          >
                            <span className="text-base font-semibold text-blue-500">
                              {displayIndex}.
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-blue-100">
                              {iconUrl ? (
                                <Image
                                  src={iconUrl}
                                  alt={hostname || "结果图标"}
                                  width={20}
                                  height={20}
                                  className="h-5 w-5"
                                  unoptimized
                                />
                              ) : (
                                <SearchIcon className="h-4 w-4 text-blue-500" />
                              )}
                            </span>
                            <span className="line-clamp-1 flex-1 text-left">
                              {result.title}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    未找到合适的结果。
                  </div>
                )}
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700"
                >
                  Show all {Math.max(session.meta.maxResults, session.results.length)} results
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <ParameterRow label="Model Provider" value={session.meta.modelProvider} />
                <ParameterRow label="Model" value={session.meta.modelId} />
                <ParameterRow label="Language" value={session.meta.language} />
                <ParameterRow
                  label="Max results"
                  value={String(session.meta.maxResults)}
                />
                <ParameterRow
                  label="Exclude websites"
                  value={session.meta.excludeWebsites || "—"}
                  className="sm:col-span-2"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ParameterRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-blue-100 bg-white/70 px-3 py-2 shadow-sm",
        className
      )}
    >
      <div className="text-xs font-medium text-blue-600">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function safeHostname(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

export default SearchFlowCard;
