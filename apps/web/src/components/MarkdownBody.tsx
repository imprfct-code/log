import { useMemo, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";
import { ResizableMedia } from "./ResizableImage";
import { VideoPlayer } from "./VideoPlayer";

/** Parse `![alt|50%](url)` → { cleanAlt, widthPercent } */
function parseAltWidth(alt: string | undefined): { cleanAlt: string; widthPercent: number | null } {
  if (!alt) return { cleanAlt: "", widthPercent: null };
  const match = alt.match(/^(.*?)\|(\d{1,3})%$/);
  if (!match) return { cleanAlt: alt, widthPercent: null };
  return { cleanAlt: match[1], widthPercent: Math.min(100, Math.max(10, Number(match[2]))) };
}

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

function CodeBlock({ code, language }: { code: string; language: string }) {
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

export function MarkdownBody({
  content,
  className,
  attachments,
  onImageResize,
}: {
  content: string;
  className?: string;
  attachments?: Attachment[];
  /** Editor callback: called with (src, newWidthPercent) when the user drags the slider. */
  onImageResize?: (src: string, width: number) => void;
}) {
  // Build key → { url, type, duration } lookup for resolving upload:KEY references
  const urlMap = useMemo(() => {
    const map = new Map<string, { url: string; type: "image" | "video"; duration?: number }>();
    for (const att of attachments ?? []) {
      map.set(att.key, { url: att.url, type: att.type, duration: att.duration });
    }
    return map;
  }, [attachments]);

  return (
    <div className={cn("markdown-body min-w-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => {
          if (url.startsWith("upload:")) return url;
          return defaultUrlTransform(url);
        }}
        components={{
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent no-underline hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
          // Fenced code blocks go through SyntaxHighlighter; inline code stays simple
          code: ({ children, className: codeClassName, ...props }) => {
            const code =
              typeof children === "string"
                ? children
                : (children as unknown[]).filter((child) => typeof child === "string").join("");
            const langMatch = /language-(\w+)/.exec(codeClassName ?? "");
            const isBlock = langMatch || (codeClassName === undefined && code.includes("\n"));
            if (isBlock) {
              return (
                <CodeBlock code={code.replace(/\n$/, "")} language={langMatch?.[1] ?? "text"} />
              );
            }
            // Inline code
            return (
              <code
                className="border border-border bg-muted px-1 py-0.5 text-[12px] text-foreground-bright"
                {...props}
              >
                {children}
              </code>
            );
          },
          // Let SyntaxHighlighter handle its own <pre>, so make this a passthrough for code blocks
          pre: ({ children }) => <>{children}</>,
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-5" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-5" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="my-0.5" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="my-2 border-l-2 border-accent/40 pl-3 text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="mt-3 mb-1 text-[15px] font-bold text-foreground-bright" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="mt-2.5 mb-1 text-[14px] font-bold text-foreground-bright" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="mt-2 mb-0.5 text-[13px] font-bold text-foreground-bright" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <div className="my-1.5 leading-relaxed" {...props}>
              {children}
            </div>
          ),
          table: ({ children, ...props }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-[12px]" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-border bg-muted px-2 py-1 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-border px-2 py-1" {...props}>
              {children}
            </td>
          ),
          hr: (props) => <hr className="my-3 border-border" {...props} />,
          img: ({ alt, src, ...props }) => {
            const rawSrc = src ?? "";
            let resolvedSrc = rawSrc;
            let mediaType: "image" | "video" = "image";
            let mediaDuration: number | undefined;
            if (rawSrc.startsWith("upload:")) {
              const entry = urlMap.get(rawSrc.slice(7));
              if (entry) {
                resolvedSrc = entry.url;
                mediaType = entry.type;
                mediaDuration = entry.duration;
              }
            }

            const { cleanAlt, widthPercent } = parseAltWidth(alt);
            const width = widthPercent ?? 100;

            if (mediaType === "video") {
              const videoEl = (
                <VideoPlayer url={resolvedSrc} mode="full" duration={mediaDuration} />
              );

              if (onImageResize) {
                return (
                  <ResizableMedia widthPercent={width} onResize={(w) => onImageResize(rawSrc, w)}>
                    {videoEl}
                  </ResizableMedia>
                );
              }

              return (
                <span className="my-2 block" style={{ width: `${width}%` }}>
                  {videoEl}
                </span>
              );
            }

            const imageEl = (
              <img
                src={resolvedSrc}
                alt={cleanAlt}
                loading="lazy"
                className="w-full border border-border"
                {...props}
              />
            );

            if (onImageResize) {
              return (
                <ResizableMedia widthPercent={width} onResize={(w) => onImageResize(rawSrc, w)}>
                  {imageEl}
                </ResizableMedia>
              );
            }

            return (
              <span className="my-2 block" style={{ width: `${width}%` }}>
                {imageEl}
              </span>
            );
          },
          input: ({ type, checked, ...props }) =>
            type === "checkbox" ? (
              <input
                type="checkbox"
                checked={checked}
                disabled
                className="mr-1.5 accent-accent"
                {...props}
              />
            ) : (
              <input type={type} {...props} />
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
