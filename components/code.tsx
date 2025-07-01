import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function Code({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const match = /language-(\w+)/.exec(className || "");

  if (match) {
    return (
      <SyntaxHighlighter
        language={match[1]}
        style={oneLight}
        wrapLongLines={true}
        codeTagProps={{
          className: "bg-[#f9f9f9] font-mono",
        }}
        customStyle={{
          fontSize: "0.875rem",
          lineHeight: "1.6",
          borderRadius: "1.25rem",
          padding: "1rem",
          backgroundColor: "#f9f9f9",
          minWidth: "48rem",
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  }

  return (
    <code className="font-mono text-sm p-1 rounded bg-[#ececec]">
      {children}
    </code>
  );
}
