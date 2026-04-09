import { useMemo } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";
import { CodeBlock } from "./CodeBlock";
import { ResizableMedia } from "./ResizableImage";
import { VideoPlayer } from "./VideoPlayer";

/** Parse `![alt|50%](url)` → { cleanAlt, widthPercent } */
function parseAltWidth(alt: string | undefined): { cleanAlt: string; widthPercent: number | null } {
  if (!alt) return { cleanAlt: "", widthPercent: null };
  const match = alt.match(/^(.*?)\|(\d{1,3})%$/);
  if (!match) return { cleanAlt: alt, widthPercent: null };
  return { cleanAlt: match[1], widthPercent: Math.min(100, Math.max(10, Number(match[2]))) };
}

export function MarkdownBody({
  content,
  className,
  attachments,
  onImageResize,
  onImageClick,
}: {
  content: string;
  className?: string;
  attachments?: Attachment[];
  /** Editor callback: called with (src, newWidthPercent) when the user drags the slider. */
  onImageResize?: (src: string, width: number) => void;
  /** View callback: called with resolved URL when user clicks an image. */
  onImageClick?: (url: string) => void;
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
    <div className={cn("markdown-body min-w-0 break-words", className)}>
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
                : Array.isArray(children)
                  ? children.filter((child) => typeof child === "string").join("")
                  : "";
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
          h4: ({ children, ...props }) => (
            <h4
              className="mt-1.5 mb-0.5 text-[13px] font-semibold text-foreground-bright"
              {...props}
            >
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5
              className="mt-1.5 mb-0.5 text-[12px] font-semibold text-foreground-bright"
              {...props}
            >
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 className="mt-1.5 mb-0.5 text-[12px] font-medium text-muted-foreground" {...props}>
              {children}
            </h6>
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
                <VideoPlayer
                  url={resolvedSrc}
                  storageKey={rawSrc.startsWith("upload:") ? rawSrc.slice(7) : undefined}
                  mode="full"
                  duration={mediaDuration}
                />
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

            if (onImageClick) {
              return (
                <button
                  type="button"
                  onClick={() => onImageClick(resolvedSrc)}
                  className="my-2 block cursor-pointer border-none bg-transparent p-0"
                  style={{ width: `${width}%` }}
                >
                  <img
                    src={resolvedSrc}
                    alt={cleanAlt}
                    loading="lazy"
                    className="w-full border border-border transition-opacity hover:opacity-80"
                    {...props}
                  />
                </button>
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
