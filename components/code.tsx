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
    const match = /language-(\w+)/.exec(className || "");
    const lang = match ? match[1] : "text";
    const code = String(children || "").replace(/(\r?\n)$/, "");
    const blockCache = useRef<Map<string, string>>(new Map());
    const [highlighterReady, setHighlighterReady] = useState(false);

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
        return code;
      }

      const highlightCompleteLines = () => {
        if (!completeLines.length) return "";

        const completeLinesCode = completeLines.join("\n");
        const cacheKey = `${lang}-${completeLinesCode}`;

        if (!blockCache.current.has(cacheKey)) {
          const highlighted = highlightSync(completeLinesCode, lang);
          blockCache.current.set(cacheKey, highlighted);
        }

        return blockCache.current.get(cacheKey) || "";
      };

      const highlightCurrentLine = () => {
        if (!currentLine) return "";

        if (completeLines.length > 0) {
          const contextCode = completeLines.join("\n");
          return highlightSync(currentLine, lang, contextCode);
        }

        return currentLine;
      };

      const parts = [highlightCompleteLines(), highlightCurrentLine()].filter(
        Boolean
      );

      const joinedParts = parts.join("");

      return <div dangerouslySetInnerHTML={{ __html: joinedParts }} />;
    }, [code, lang, highlighterReady]);

    if (match) {
      return (
        <div
          className={cn(
            className,
            "mt-2 mb-4 rounded-lg border border-neutral-200 bg-white overflow-hidden"
          )}
        >
          <div className="p-4 overflow-x-auto font-mono text-sm">
            {renderedContent}
          </div>
        </div>
      );
    }

    return (
      <code
        className={cn(
          "bg-gray-100 px-1 py-0.5 rounded text-sm font-mono",
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
