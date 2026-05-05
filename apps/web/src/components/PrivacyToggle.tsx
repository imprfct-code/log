import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrivacyToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  icon: LucideIcon;
}) {
  const [optimistic, setOptimistic] = useState(checked);

  useEffect(() => {
    setOptimistic(checked);
  }, [checked]);

  function handleChange(value: boolean) {
    setOptimistic(value);
    onChange(value);
  }

  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon
        size={14}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          optimistic ? "text-accent" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0 flex-1">
        <span className="text-[13px] font-medium text-foreground-bright">{label}</span>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={optimistic}
        onChange={(e) => handleChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <div
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50",
          optimistic ? "bg-accent" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "block h-3.5 w-3.5 transition-transform duration-150",
            optimistic
              ? "translate-x-[19px] bg-foreground-bright"
              : "translate-x-[3px] bg-muted-foreground",
          )}
        />
      </div>
    </label>
  );
}
