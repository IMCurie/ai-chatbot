"use client";

import { memo, useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  highlightSync,
  isHighlighterReady,
  initHighlighter,
} from "@/lib/highlighter";

const Code = memo(
  ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const match = /language-([\w-]+)/.exec(className || "");
    const lang = match ? match[1] : "text";
    const code = String(children || "").replace(/(\r?\n)$/, "");
    // Keep only the latest cached complete block to avoid unbounded growth
    const lastBlockCache = useRef<{ key: string; html: string } | null>(null);
    const [highlighterReady, setHighlighterReady] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
      const initializeHighlighter = async () => {
        if (!isHighlighterReady()) {
          await initHighlighter();
        }
        setHighlighterReady(isHighlighterReady());
      };

      initializeHighlighter();
    }, []);

    const renderedContent = useMemo(() => {
      const chunkLines = code.split("\n");

      const n = chunkLines.length;
      const completeLines = chunkLines.slice(0, -1);
      const currentLine = chunkLines[n - 1];

      if (!highlighterReady) {
        return "";
      }

      const highlightCompleteLines = () => {
        if (!completeLines.length) return "";

        const completeLinesCode = completeLines.join("\n");
        const cacheKey = `${lang}-${completeLinesCode}`;

        if (
          !lastBlockCache.current ||
          lastBlockCache.current.key !== cacheKey
        ) {
          const highlighted = highlightSync(completeLinesCode, lang);
          lastBlockCache.current = { key: cacheKey, html: highlighted };
        }

        return lastBlockCache.current?.html || "";
      };

      const highlightCurrentLine = () => {
        if (!currentLine) return "";

        if (completeLines.length > 0) {
          const contextCode = completeLines.join("\n");
          const html = highlightSync(currentLine, lang, contextCode);
          // Insert a single line break before the current line
          return `<br>${html}`;
        }

        // When there is no context, still escape current line via highlighter util
        return highlightSync(currentLine, lang);
      };

      const parts = [highlightCompleteLines(), highlightCurrentLine()].filter(
        Boolean
      );

      const joinedParts = parts.join("");
      return joinedParts;
    }, [code, lang, highlighterReady]);

    if (match) {
      return (
        <div
          className={cn(
            className,
            "relative group mt-2 mb-4 rounded-lg border border-border bg-card overflow-hidden w-full"
          )}
        >
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              } catch {
                // noop
              }
            }}
            aria-label={copied ? "Copied" : "Copy code"}
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] text-muted-foreground bg-transparent hover:bg-muted/40 hover:text-foreground transition-opacity transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <pre className="p-4 overflow-x-auto font-mono text-sm whitespace-pre">
            {highlighterReady ? (
              <code
                className={cn(`language-${lang}`)}
                dangerouslySetInnerHTML={{ __html: renderedContent as string }}
              />
            ) : (
              <code className={cn(`language-${lang}`)}>{code}</code>
            )}
          </pre>
        </div>
      );
    }

    return (
      <code
        className={cn(
          "bg-muted text-foreground px-1 py-0.5 rounded text-sm font-mono",
          className
        )}
      >
        {code}
      </code>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.className === nextProps.className
    );
  }
);

Code.displayName = "Code";

export default Code;
