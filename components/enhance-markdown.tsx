"use client";

import React from "react";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import rehypeShiki from "@shikijs/rehype";
import Spinner from "./spinner";

const MarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-black mt-8 mb-6 first:mt-0">
      {children}
    </h1>
  ),

  h2: ({ children }) => (
    <h2 className="text-2xl font-semibold text-black mt-7 mb-5">{children}</h2>
  ),

  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-black mt-6 mb-4">{children}</h3>
  ),

  h4: ({ children }) => (
    <h4 className="text-lg font-medium text-black mt-5 mb-3">{children}</h4>
  ),

  h5: ({ children }) => (
    <h5 className="text-base font-medium text-black mt-4 mb-3">{children}</h5>
  ),

  h6: ({ children }) => (
    <h6 className="text-sm font-medium text-black mt-4 mb-3 uppercase tracking-wide">
      {children}
    </h6>
  ),

  p: ({ children }) => (
    <p className="text-black leading-7 mb-5 last:mb-0">{children}</p>
  ),

  strong: ({ children }) => (
    <strong className="font-semibold text-black">{children}</strong>
  ),

  em: ({ children }) => <em className="italic text-black">{children}</em>,

  del: ({ children }) => (
    <del className="line-through text-neutral-500">{children}</del>
  ),

  a: ({ href, children }) => (
    <a
      href={href}
      className="text-sky-600 hover:text-sky-800 underline-none decoration-sky-400 hover:decoration-sky-500 transition-colors duration-200"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  // 代码块样式 - 添加容器样式
  pre: ({ children }) => (
    <pre className="bg-gray-50 rounded-lg p-4 my-6 overflow-x-auto border border-gray-200">
      {children}
    </pre>
  ),

  // 行内代码样式
  code: ({ children, className }) => {
    // 如果没有className，说明是行内代码
    if (!className) {
      return (
        <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    }
    // 代码块中的code，保持原样
    return <code className={className}>{children}</code>;
  },

  ul: ({ children }) => (
    <ul className="list-disc ml-6 mb-5 text-black space-y-2">{children}</ul>
  ),

  ol: ({ children }) => (
    <ol className="list-decimal ml-6 mb-5 text-black space-y-2">{children}</ol>
  ),

  li: ({ children }) => (
    <li className="leading-7">
      <div className="[&>ul]:mt-2 [&>ol]:mt-2 [&>ul]:mb-2 [&>ol]:mb-2">
        {children}
      </div>
    </li>
  ),

  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-neutral-400 bg-neutral-100 pl-4 py-3 my-5 text-black">
      {children}
    </blockquote>
  ),

  hr: () => <hr className="border-t border-neutral-300 my-8" />,

  table: ({ children }) => (
    <div className="overflow-x-auto my-5">
      <table className="min-w-full border-collapse bg-white rounded-lg shadow-sm border border-neutral-200">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }) => <thead className="bg-neutral-50">{children}</thead>,

  tbody: ({ children }) => (
    <tbody className="divide-y divide-neutral-200">{children}</tbody>
  ),

  tr: ({ children }) => (
    <tr className="hover:bg-neutral-50 transition-colors duration-200">
      {children}
    </tr>
  ),

  th: ({ children }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
      {children}
    </th>
  ),

  td: ({ children }) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
      {children}
    </td>
  ),

  input: ({ type, checked, disabled }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        className="mr-2 text-blue-600 rounded focus:ring-blue-500"
        readOnly
      />
    ) : null,
};

export default function EnhancedMarkdown({ message }: { message: string }) {
  return (
    <div className="prose prose-neutral max-w-none">
      <MarkdownHooks
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeShiki,
            {
              themes: {
                light: "github-light",
                dark: "github-dark",
              },
            },
          ],
        ]}
        components={MarkdownComponents}
        fallback={<Spinner />}
      >
        {message}
      </MarkdownHooks>
    </div>
  );
}
