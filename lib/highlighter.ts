import type { HighlighterCore } from "@shikijs/core";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighterInstance: HighlighterCore | null = null;
let isInitializing = false;

const highlighterPromise = createHighlighterCore({
  themes: [
    import("@shikijs/themes/github-light"),
    import("@shikijs/themes/github-dark"),
  ],
  langs: [
    import("@shikijs/langs/typescript"),
    import("@shikijs/langs/javascript"),
    import("@shikijs/langs/markdown"),
    import("@shikijs/langs/jsx"),
    import("@shikijs/langs/tsx"),
    import("@shikijs/langs/json"),
    import("@shikijs/langs/html"),
    import("@shikijs/langs/css"),
    import("@shikijs/langs/yaml"),
    import("@shikijs/langs/bash"),
    import("@shikijs/langs/python"),
    import("@shikijs/langs/cpp"),
    import("@shikijs/langs/c"),
    import("@shikijs/langs/go"),
    import("@shikijs/langs/rust"),
  ],
  engine: createJavaScriptRegexEngine(),
});

export const initHighlighter = async () => {
  if (highlighterInstance || isInitializing) return;

  isInitializing = true;
  try {
    highlighterInstance = await highlighterPromise;
  } catch (error) {
    console.error("Failed to initialize highlighter:", error);
  } finally {
    isInitializing = false;
  }
};

export const highlightSync = (
  code: string,
  lang: string,
  contextCode?: string
): string => {
  const getTheme = () => {
    try {
      if (typeof document !== "undefined") {
        const root = document.documentElement;
        const prefersDark =
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = root.classList.contains("dark") || prefersDark;
        return isDark ? "github-dark" : "github-light";
      }
    } catch {}
    return "github-light";
  };
  if (!highlighterInstance) {
    // Escape to avoid injecting raw HTML when highlighter is not ready
    return code
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  try {
    return highlighterInstance.codeToHtml(code, {
      lang: lang || "text",
      theme: getTheme(),
      // Output inline tokens so we can compose a single <pre><code> container during streaming
      structure: "inline",
      ...(contextCode && { grammarContextCode: contextCode }),
    });
  } catch (error) {
    console.error("Highlighting error:", error);
    // Escape on error to avoid XSS
    return code
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
};

export const isHighlighterReady = (): boolean => {
  return highlighterInstance !== null;
};
