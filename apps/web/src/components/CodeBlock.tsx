import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

/** Rosé Pine theme for Prism syntax highlighter. */
const rosePine: Record<string, React.CSSProperties> = {
  'pre[class*="language-"]': {
    background: "#191724",
    color: "#e0def4",
    margin: 0,
    borderRadius: 0,
    fontSize: "12px",
    fontFamily: "inherit",
  },
  'code[class*="language-"]': {
    background: "transparent",
    color: "#e0def4",
    fontSize: "12px",
    fontFamily: "inherit",
  },
  comment: { color: "#6e6a86", fontStyle: "italic" },
  prolog: { color: "#6e6a86" },
  doctype: { color: "#6e6a86" },
  cdata: { color: "#6e6a86" },
  punctuation: { color: "#908caa" },
  property: { color: "#c4a7e7" },
  tag: { color: "#eb6f92" },
  boolean: { color: "#eb6f92" },
  number: { color: "#f6c177" },
  constant: { color: "#f6c177" },
  symbol: { color: "#ebbcba" },
  deleted: { color: "#eb6f92" },
  selector: { color: "#9ccfd8" },
  "attr-name": { color: "#c4a7e7" },
  string: { color: "#f6c177" },
  char: { color: "#f6c177" },
  builtin: { color: "#ebbcba" },
  inserted: { color: "#9ccfd8" },
  operator: { color: "#908caa" },
  entity: { color: "#e0def4" },
  url: { color: "#9ccfd8" },
  "attr-value": { color: "#f6c177" },
  keyword: { color: "#31748f" },
  function: { color: "#ebbcba" },
  "class-name": { color: "#9ccfd8" },
  regex: { color: "#ebbcba" },
  important: { color: "#eb6f92", fontWeight: "bold" },
  variable: { color: "#e0def4" },
  "template-string": { color: "#f6c177" },
  "template-punctuation": { color: "#908caa" },
  arrow: { color: "#908caa" },
};

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group/code relative my-2">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 cursor-pointer border border-[#26233a] bg-[#191724] px-1.5 py-0.5 font-mono text-[10px] text-[#6e6a86] opacity-0 transition-opacity hover:text-[#e0def4] group-hover/code:opacity-100"
      >
        {copied ? "copied" : "copy"}
      </button>
      {language !== "text" && (
        <span className="absolute top-2 left-3 text-[10px] text-[#6e6a86]">{language}</span>
      )}
      <SyntaxHighlighter
        style={rosePine}
        language={language}
        showLineNumbers
        lineNumberStyle={{
          color: "#6e6a86",
          fontSize: "11px",
          minWidth: "2em",
          paddingRight: "12px",
        }}
        customStyle={{
          border: "1px solid #26233a",
          padding: "12px",
          paddingTop: language !== "text" ? "28px" : "12px",
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
