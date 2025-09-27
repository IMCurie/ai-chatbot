"use client";

import { useMemo, useState } from "react";
import type { DynamicToolUIPart } from "ai";
import { ChevronDown, Hammer, Check, X, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";

interface ToolCallCardProps {
  part: DynamicToolUIPart;
  className?: string;
}

const prettyJson = (value: unknown): string => {
  if (value === undefined) return "{}";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export function ToolCallCard({ part, className }: ToolCallCardProps) {
  const isPending =
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    (part.state === "output-available" && part.preliminary);
  const success = part.state === "output-available" && !part.preliminary;
  const failed = part.state === "output-error";
  const [open, setOpen] = useState(false);

  // Resolve MCP server name by tool name from settings
  const mcpName = useMemo(() => {
    try {
      const state = useChatStore.getState();
      const servers = state?.mcpSettings?.servers ?? [];
      for (const server of servers) {
        if (Array.isArray(server.tools)) {
          if (server.tools.some((t) => t?.name === part.toolName)) {
            // prefer configured display name, fall back to id
            return server.name?.trim() || server.id || "MCP";
          }
        }
      }
    } catch {
      /* ignore lookup failures */
    }
    return "MCP";
  }, [part.toolName]);

  const formattedInput = useMemo(() => prettyJson(part.input), [part.input]);
  const formattedOutput = useMemo(() => {
    if (failed) {
      return prettyJson({ error: part.errorText ?? "Tool execution failed." });
    }
    // Prefer rendering the raw output payload as JSON
    // If output is undefined, render an empty object
    const output = (part as any).output;
    return prettyJson(output ?? {});
  }, [failed, part]);

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-border bg-white",
        className
      )}
    >
      {/* Header row */}
      <div className={cn("flex w-full items-center px-3 py-2")}>
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Hammer className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground/90">{mcpName}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium text-foreground/90">
            {part.toolName}
          </span>
        </div>

        {/* Status area */}
        <div className="ml-auto flex items-center gap-2">
          {isPending && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </>
          )}
          {success && (
            <div className="flex items-center gap-1 text-emerald-600">
              <Check className="h-4 w-4" />
              <span className="text-sm">Success</span>
            </div>
          )}
          {failed && (
            <div className="flex items-center gap-1 text-red-600">
              <X className="h-4 w-4" />
              <span className="text-sm">Error</span>
            </div>
          )}

          <button
            type="button"
            aria-label={open ? "Collapse details" : "Expand details"}
            onClick={() => !isPending && setOpen((prev) => !prev)}
            disabled={isPending}
            className={cn(
              "rounded p-1 transition-colors",
              isPending
                ? "text-muted-foreground/60"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && !isPending && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {/* Details in the same container */}
      {open && !isPending && (
        <div className="border-t border-border/70">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Arguments cell */}
            <div className="min-h-0">
              <div className="text-sm font-semibold text-foreground mb-2 border-b px-4 py-2">
                Arguments:
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-4 py-2 text-sm leading-relaxed text-foreground font-mono">
                {formattedInput}
              </pre>
            </div>
            {/* Result cell */}
            <div className="min-h-0">
              <div className="text-sm font-semibold text-foreground mb-2 border-b px-4 py-2">
                Result:
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-4 py-2 text-sm leading-relaxed text-foreground font-mono">
                {formattedOutput}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
