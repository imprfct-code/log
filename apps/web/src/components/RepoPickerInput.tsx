import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { GhIcon } from "@/components/Icons";

interface Repo {
  fullName: string;
  isPrivate: boolean;
}

interface RepoPickerInputProps {
  value: string;
  onChange: (repo: string) => void;
  autoFocus?: boolean;
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 448 512"
      fill="currentColor"
      className="size-3 shrink-0 text-muted-foreground/50"
      aria-label="private"
    >
      <path d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64v192c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64h16z" />
    </svg>
  );
}

function SkeletonRow({ width }: { width: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <div className="h-3.5 animate-pulse bg-border-strong/60" style={{ width }} />
      <div className="size-3.5 animate-pulse bg-border-strong/40" />
    </div>
  );
}

export function RepoPickerInput({ value, onChange, autoFocus }: RepoPickerInputProps) {
  const listRepos = useAction(api.github.listUserRepos);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await listRepos();
        setRepos(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load repos");
        setRepos([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchRepos();
  }, [listRepos]);

  const filtered = repos.filter((r) => r.fullName.toLowerCase().includes(value.toLowerCase()));
  const exactMatch = repos.some((r) => r.fullName === value);
  const hasContent = loading || error !== null || filtered.length > 0;
  const showDropdown = isOpen && !exactMatch && hasContent;

  // Scroll highlighted item into view
  useEffect(() => {
    if (!showDropdown || !listRef.current) return;
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onChange(filtered[selectedIndex].fullName);
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (newValue.includes("github.com/")) {
      newValue = newValue
        .replace(/^https?:\/\/(www\.)?github\.com\//, "")
        .replace(/^github\.com\//, "")
        .replace(/\/$/, "");
    }
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(0);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes("github.com/")) {
      e.preventDefault();
      const cleaned = pasted
        .replace(/^https?:\/\/(www\.)?github\.com\//, "")
        .replace(/^github\.com\//, "")
        .replace(/\/$/, "");
      onChange(cleaned);
      setIsOpen(true);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="flex items-center gap-0 border-b border-border-strong transition-colors focus-within:border-accent">
        <span className="flex items-center gap-1.5 py-2.5 pl-3.5 text-sm text-muted-foreground">
          <GhIcon size={13} color="#666" />
          github.com/
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={loading ? "loading repos..." : "search your repos"}
          autoFocus={autoFocus}
          autoComplete="off"
          className="w-full bg-transparent py-2.5 pr-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {loading && (
          <div className="mr-3.5 size-3 shrink-0 animate-spin border border-muted-foreground/40 border-t-accent" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute inset-x-0 z-50 max-h-[220px] overflow-y-auto border border-t-0 border-border-strong shadow-[0_8px_30px_rgba(0,0,0,0.7)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ backgroundColor: "#0c0c0c" }}
        >
          {loading && (
            <div>
              <div className="px-3.5 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                fetching your repos...
              </div>
              <SkeletonRow width="55%" />
              <SkeletonRow width="40%" />
              <SkeletonRow width="65%" />
              <SkeletonRow width="35%" />
              <SkeletonRow width="50%" />
            </div>
          )}

          {error && !loading && (
            <div className="px-3.5 py-3 text-[12px] text-muted-foreground">
              couldn&apos;t load repos — type manually
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div ref={listRef}>
              {filtered.map((repo, idx) => (
                <button
                  key={repo.fullName}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(repo.fullName);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors duration-75 ${
                    idx === selectedIndex
                      ? "bg-accent/20 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{repo.fullName}</span>
                  {repo.isPrivate && <LockIcon />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
