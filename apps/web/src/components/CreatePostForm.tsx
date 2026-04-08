import { useState, useRef, useEffect, type DragEvent, type ClipboardEvent } from "react";
import { useMutation } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { X, Loader2, Eye, EyeOff, Play, Paperclip, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAttachments,
  ALL_MEDIA_TYPES,
  MAX_ATTACHMENTS,
  type UploadedAttachment,
} from "@/hooks/useAttachments";
import { MarkdownBody } from "./MarkdownBody";

const CHAR_SOFT_LIMIT = 10_000;
const CHAR_WARN_THRESHOLD = 8_000;
const CHAR_DANGER_THRESHOLD = 9_500;

interface EditData {
  id: string;
  body?: string;
  attachments?: Array<{
    url: string;
    key: string;
    type: "image" | "video";
    filename: string;
    inline?: boolean;
    cover?: boolean;
    duration?: number;
  }>;
}

function toInitialAttachments(edit?: EditData): UploadedAttachment[] {
  if (!edit?.attachments) return [];
  return edit.attachments.map((att) => ({
    key: att.key,
    type: att.type,
    filename: att.filename,
    previewUrl: att.url,
    inline: att.inline ?? false,
    cover: att.cover ?? att.type === "video",
    duration: att.duration,
  }));
}

export function CreatePostForm({
  commitmentId,
  editEntry,
  onClose,
}: {
  commitmentId: Id<"commitments">;
  editEntry?: EditData;
  onClose: () => void;
}) {
  const isEditing = !!editEntry;
  const [content, setContent] = useState(editEntry?.body ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPost = useMutation(api.devlog.create);
  const updatePost = useMutation(api.devlog.update);
  const upload = useUploadFile(api.r2);

  const attachments = useAttachments({
    textareaRef,
    setContent,
    upload,
    initial: toInitialAttachments(editEntry),
  });

  // Auto-grow textarea (also re-trigger when switching back from preview)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content, showPreview]);

  function handleClose() {
    attachments.cleanup();
    onClose();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      void attachments.uploadInline(file);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    e.preventDefault();
    for (const file of files) {
      void attachments.uploadInline(file);
    }
  }

  async function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed && attachments.uploaded.length === 0) return;
    setIsSubmitting(true);
    attachments.setError(null);

    try {
      // Detect orphaned inline attachments: inline keys not referenced in body
      const referencedKeys = new Set<string>();
      const refPattern = /!\[.*?\]\(upload:([^)]+)\)/g;
      let match;
      while ((match = refPattern.exec(trimmed)) !== null) {
        referencedKeys.add(match[1]);
      }

      const atts = attachments.uploaded
        .filter((att) => !att.inline || referencedKeys.has(att.key))
        .map(({ key, type, filename, inline, cover, duration }) => ({
          key,
          type,
          filename,
          inline,
          cover,
          duration,
        }));

      if (isEditing && editEntry) {
        await updatePost({
          entryId: editEntry.id as Id<"devlogEntries">,
          content: trimmed || undefined,
          attachments: atts.length > 0 ? atts : undefined,
        });
      } else {
        await createPost({
          commitmentId,
          type: "post",
          content: trimmed || undefined,
          attachments: atts.length > 0 ? atts : undefined,
        });
      }

      attachments.cleanup();
      setContent("");
      onClose();
    } catch (err) {
      attachments.setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  /** Update the width in `![alt|XX%](src)` when slider is dragged in preview. */
  function handleImageResize(src: string, width: number) {
    setContent((prev) => {
      const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`!\\[([^|\\]]*?)(?:\\|\\d{1,3}%)?\\]\\(${escaped}\\)`);
      const m = prev.match(pattern);
      if (!m) return prev;
      const altBase = m[1];
      const widthSuffix = width < 100 ? `|${width}%` : "";
      return prev.replace(pattern, `![${altBase}${widthSuffix}](${src})`);
    });
  }

  const charCount = content.length;
  const charColorClass =
    charCount > CHAR_SOFT_LIMIT
      ? "text-destructive"
      : charCount > CHAR_DANGER_THRESHOLD
        ? "text-accent"
        : charCount > CHAR_WARN_THRESHOLD
          ? "text-yellow-500"
          : "text-[#333]";

  const canSubmit =
    (content.trim().length > 0 || attachments.uploaded.length > 0) &&
    !attachments.isUploading &&
    !isSubmitting;

  // Build preview attachment map from uploaded items (key -> previewUrl)
  const previewAttachments = attachments.uploaded.map((att) => ({
    url: att.previewUrl,
    key: att.key,
    type: att.type,
    filename: att.filename,
    inline: att.inline,
  }));

  return (
    <div
      className={cn("border border-border p-3 transition-colors", dragOver && "border-accent/40")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Textarea / Preview */}
      {showPreview && content ? (
        <div className="min-h-[80px] overflow-x-hidden text-[13px] text-muted-foreground">
          <MarkdownBody
            content={content}
            attachments={previewAttachments}
            onImageResize={handleImageResize}
          />
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder="write something... drop media to embed inline"
          className="w-full resize-none border-none bg-transparent font-mono text-[13px] text-foreground-bright placeholder:text-[#333] focus:outline-none"
          style={{ minHeight: "80px" }}
          autoFocus
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALL_MEDIA_TYPES.join(",")}
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void attachments.uploadStandalone(files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Upload progress */}
      {attachments.isUploading && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          uploading...
        </div>
      )}

      {/* Attachment previews */}
      {attachments.uploaded.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.uploaded.map((att, idx) => (
            <div key={att.key} className="group/att relative">
              {att.type === "video" ? (
                <div className="relative flex h-16 w-24 items-center justify-center border border-border bg-muted">
                  <Play size={16} className="text-muted-foreground" />
                  <span className="absolute bottom-0.5 right-0.5 max-w-[88px] truncate text-[9px] text-[#444]">
                    {att.filename}
                  </span>
                </div>
              ) : (
                <img
                  src={att.previewUrl}
                  alt={att.filename}
                  className="h-16 w-24 border border-border object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => attachments.toggleCover(idx)}
                title={att.cover ? "large preview in feed" : "small preview in feed"}
                className={cn(
                  "absolute bottom-0.5 left-0.5 flex h-4 w-4 cursor-pointer items-center justify-center border bg-card text-[10px] transition-opacity group-hover/att:opacity-100",
                  att.cover
                    ? "border-accent/40 text-accent opacity-100"
                    : "border-border text-muted-foreground opacity-0 hover:text-foreground",
                )}
              >
                {att.cover ? <Maximize2 size={8} /> : <Minimize2 size={8} />}
              </button>
              <button
                type="button"
                onClick={() => attachments.removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 cursor-pointer items-center justify-center border border-border bg-card text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/att:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {attachments.error && (
        <div className="mt-2 text-[11px] text-destructive">{attachments.error}</div>
      )}

      {/* Footer: char count + buttons */}
      <div className="mt-2 flex items-center justify-end gap-3">
        {charCount > 0 && (
          <span className={cn("text-[11px]", charColorClass)}>
            {charCount.toLocaleString()} / ~{(CHAR_SOFT_LIMIT / 1000).toFixed(0)}k
          </span>
        )}

        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="flex cursor-pointer items-center gap-1 border-none bg-transparent font-mono text-[11px] text-[#444] transition-colors hover:text-muted-foreground"
        >
          {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
          {showPreview ? "edit" : "preview"}
        </button>

        {attachments.uploaded.length < MAX_ATTACHMENTS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-1 border-none bg-transparent font-mono text-[11px] text-[#444] transition-colors hover:text-muted-foreground"
          >
            <Paperclip size={11} />
            attach
          </button>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-[#444] transition-colors hover:text-muted-foreground"
        >
          cancel
        </button>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="cursor-pointer border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent transition-colors hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-40"
        >
          {isSubmitting ? "posting..." : isEditing ? "save" : "post"}
        </button>
      </div>
    </div>
  );
}
