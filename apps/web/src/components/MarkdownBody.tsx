import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownBody({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
          code: ({ children, className: codeClassName, ...props }) => {
            const isInline = !codeClassName;
            return isInline ? (
              <code
                className="border border-border bg-muted px-1 py-0.5 text-[12px] text-foreground-bright"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className={cn("text-[12px]", codeClassName)} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre
              className="overflow-x-auto border border-border bg-muted p-3 text-[12px]"
              {...props}
            >
              {children}
            </pre>
          ),
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
            <p className="my-1.5 leading-relaxed" {...props}>
              {children}
            </p>
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
          img: ({ alt, src, ...props }) => (
            <img
              src={src}
              alt={alt ?? ""}
              className="my-1 max-w-full border border-border"
              {...props}
            />
          ),
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
