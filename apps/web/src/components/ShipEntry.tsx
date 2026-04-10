import type { DevlogEntry as DevlogEntryType } from "@/types";
import { ExtIcon } from "./Icons";

export function ShipEntry({ entry }: { entry: DevlogEntryType }) {
  const url = entry.body;
  const href = url ? (url.startsWith("http") ? url : `https://${url}`) : undefined;

  return (
    <div className="relative py-2.5 pl-6">
      <span className="absolute left-0 top-4 h-[7px] w-[7px] -translate-x-[3.5px] rounded-full border border-shipped/50 bg-shipped" />

      <div className="flex items-baseline gap-2 text-[11px]">
        <span className="text-shipped">shipped</span>
        <span className="text-[#333]">{entry.time}</span>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 truncate text-shipped transition-colors hover:text-shipped/80"
          >
            {url} <ExtIcon size={10} color="currentColor" />
          </a>
        )}
      </div>

      {entry.shipNote && (
        <p className="mt-1 text-[11px] italic text-muted-foreground">
          &ldquo;{entry.shipNote}&rdquo;
        </p>
      )}
    </div>
  );
}
