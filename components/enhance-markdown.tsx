"use client";

import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Code from "./code";
import React from "react";
import Image from "next/image";

const MarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-foreground mt-8 mb-6 first:mt-0">
      {children}
    </h1>
  ),

  h2: ({ children }) => (
    <h2 className="text-2xl font-semibold text-foreground mt-7 mb-5">{children}</h2>
  ),

  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-foreground mt-6 mb-4">{children}</h3>
  ),

  h4: ({ children }) => (
    <h4 className="text-lg font-medium text-foreground mt-5 mb-3">{children}</h4>
  ),

  h5: ({ children }) => (
    <h5 className="text-base font-medium text-foreground mt-4 mb-3">{children}</h5>
  ),

  h6: ({ children }) => (
    <h6 className="text-sm font-medium text-foreground mt-4 mb-3 uppercase tracking-wide">
      {children}
    </h6>
  ),

  p: ({ children }) => (
    <p className="text-foreground leading-7 mb-3 last:mb-0 break-words">{children}</p>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),

  em: ({ children }) => <em className="italic text-foreground">{children}</em>,

  del: ({ children }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),

  a: ({ href, children }) => (
    <a
      href={href}
      className="text-sky-600 hover:text-sky-800 visited:text-purple-700/80 dark:visited:text-purple-400/80 no-underline underline-offset-2 hover:underline decoration-sky-400 hover:decoration-sky-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  ul: ({ children }) => (
    <ul className="list-disc ml-6 mb-5 text-foreground space-y-2 marker:text-muted-foreground">{children}</ul>
  ),

  ol: ({ children }) => (
    <ol className="list-decimal ml-6 mb-5 text-foreground space-y-2 marker:text-muted-foreground">{children}</ol>
  ),

  li: ({ children }) => (
    <li className="leading-7">
      <div className="[&>ul]:mt-2 [&>ol]:mt-2 [&>ul]:mb-2 [&>ol]:mb-2">
        {children}
      </div>
    </li>
  ),

  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-border bg-muted/60 pl-4 py-3 my-5 text-foreground">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="border-t border-border my-8" />,

  table: ({ children }) => (
    <div className="overflow-x-auto my-5">
      <table className="min-w-full border-collapse bg-card rounded-lg shadow-sm border border-border text-sm">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }) => <thead className="bg-muted/40">{children}</thead>,

  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),

  tr: ({ children }) => (
    <tr className="hover:bg-muted/30 transition-colors duration-200">
      {children}
    </tr>
  ),

  th: ({ children }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
      {children}
    </td>
  ),

  // Inline code: style non-language inline code; block code handled via `pre`
  code: ({ children, className }) => {
    const isLang = typeof className === "string" && className.includes("language-");
    return (
      <code
        className={
          isLang
            ? className
            : "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.925em]"
        }
      >
        {children}
      </code>
    );
  },

  // Block code: extract the inner <code> and delegate to <Code/>
  pre: ({ children }) => {
    const child = Array.isArray(children) ? children[0] : children;
    if (React.isValidElement(child)) {
      const el = child as React.ReactElement<{
        className?: string;
        children?: React.ReactNode;
      }>;
      const childClass = el.props?.className ?? "language-text";
      const rawChildren = el.props?.children;

      let childContent = "";
      if (typeof rawChildren === "string") {
        childContent = rawChildren;
      } else if (Array.isArray(rawChildren)) {
        childContent = rawChildren
          .map((segment) => (typeof segment === "string" ? segment : ""))
          .join("");
      }

      return <Code className={childClass}>{childContent}</Code>;
    }
    return <pre>{children}</pre>;
  },
  
  // Images: responsive, rounded, lazy-loaded
  img: ({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (typeof src !== "string" || src.length === 0) {
      return null;
    }

    const altText = typeof alt === "string" ? alt : "";

    return (
      <span className="relative block my-3">
        <Image
          src={src}
          alt={altText}
          width={800}
          height={450}
          className="h-auto w-full rounded"
          sizes="(max-width: 768px) 100vw, 768px"
          unoptimized
        />
      </span>
    );
  },
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  }
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
    ));
  }
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";

export default MemoizedMarkdown;
