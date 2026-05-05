import { useState, useEffect, useRef } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import diff from "react-syntax-highlighter/dist/esm/languages/prism/diff";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import graphql from "react-syntax-highlighter/dist/esm/languages/prism/graphql";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import toml from "react-syntax-highlighter/dist/esm/languages/prism/toml";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("diff", diff);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("graphql", graphql);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("kotlin", kotlin);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("markup", markup);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("xml", markup);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("ruby", ruby);
SyntaxHighlighter.registerLanguage("rb", ruby);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("rs", rust);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("swift", swift);
SyntaxHighlighter.registerLanguage("toml", toml);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleCopy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
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
