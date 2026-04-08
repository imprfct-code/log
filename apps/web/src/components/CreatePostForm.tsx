import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type DragEvent,
  type ClipboardEvent,
  type RefObject,
} from "react";
import { useMutation } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { X, Loader2, Eye, EyeOff, Play, Paperclip, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownBody } from "./MarkdownBody";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const COVER_IMAGE_TYPES = ["image/gif", "image/webp"];
const ALL_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_ATTACHMENTS = 4;
const CHAR_SOFT_LIMIT = 10_000;

function validateFile(file: File): string | null {
  if (!ALL_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type}`;
  }
  const isVideo = VIDEO_TYPES.includes(file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max ${isVideo ? "50" : "10"} MB)`;
  }
  return null;
}

/** Insert text at the current cursor position in a textarea. */
function insertAtCursor(
  ref: RefObject<HTMLTextAreaElement | null>,
  text: string,
  setContent: (fn: (prev: string) => string) => void,
) {
  const el = ref.current;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  setContent((prev) => prev.slice(0, start) + text + prev.slice(end));
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + text.length;
    el.focus();
  });
}

interface UploadedAttachment {
  key: string;
  type: "image" | "video";
  filename: string;
  previewUrl: string;
  inline: boolean;
  cover: boolean;
  duration?: number;
}

/** Read video duration from a File using a temporary video element. */
function getVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) ? video.duration : undefined;
      URL.revokeObjectURL(video.src);
      resolve(dur);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(undefined);
    };
    video.src = URL.createObjectURL(file);
  });
}

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
  const [uploaded, setUploaded] = useState<UploadedAttachment[]>(() => {
    if (!editEntry?.attachments) return [];
    return editEntry.attachments.map((att) => ({
      key: att.key,
      type: att.type,
      filename: att.filename,
      previewUrl: att.url,
      inline: att.inline ?? false,
      cover: att.cover ?? att.type === "video",
      duration: att.duration,
    }));
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPost = useMutation(api.devlog.create);
  const updatePost = useMutation(api.devlog.update);
  const upload = useUploadFile(api.r2);

  // Auto-grow textarea (also re-trigger when switching back from preview)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content, showPreview]);

  /** Upload a single file and insert an inline markdown reference at cursor. */
  const uploadInline = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const isVideo = VIDEO_TYPES.includes(file.type);

      // Insert placeholder at cursor
      const placeholder = `![uploading ${file.name}...]()`;
      insertAtCursor(textareaRef, placeholder + "\n", setContent);

      setIsUploading(true);
      try {
        const [key, duration] = await Promise.all([
          upload(file),
          isVideo ? getVideoDuration(file) : Promise.resolve(undefined),
        ]);
        const previewUrl = URL.createObjectURL(file);
        const resolved = `![${file.name}](upload:${key})`;

        // Replace placeholder with resolved reference
        setContent((prev) => prev.replace(placeholder, resolved));

        setUploaded((prev) => [
          ...prev,
          {
            key,
            type: isVideo ? "video" : "image",
            filename: file.name,
            previewUrl,
            inline: true,
            cover: isVideo || COVER_IMAGE_TYPES.includes(file.type),
            duration,
          },
        ]);
      } catch {
        // Remove placeholder on failure
        setContent((prev) => prev.replace(placeholder + "\n", ""));
        setError("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [upload],
  );

  /** Upload files via attach button — inserts inline markdown refs at end of content. */
  const uploadStandalone = useCallback(
    async (files: File[]) => {
      const remaining = MAX_ATTACHMENTS - uploaded.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_ATTACHMENTS} attachments`);
        return;
      }

      const toUpload = files.slice(0, remaining);
      setError(null);
      setIsUploading(true);

      try {
        for (const file of toUpload) {
          const validationError = validateFile(file);
          if (validationError) {
            setError(validationError);
            continue;
          }

          const isVideo = VIDEO_TYPES.includes(file.type);
          const [key, duration] = await Promise.all([
            upload(file),
            isVideo ? getVideoDuration(file) : Promise.resolve(undefined),
          ]);
          const previewUrl = URL.createObjectURL(file);

          // Insert markdown reference at end of content
          const ref = `![${file.name}](upload:${key})`;
          setContent((prev) => {
            const trimmed = prev.trimEnd();
            return trimmed ? `${trimmed}\n${ref}\n` : `${ref}\n`;
          });

          setUploaded((prev) => [
            ...prev,
            {
              key,
              type: isVideo ? "video" : "image",
              filename: file.name,
              previewUrl,
              inline: true,
              cover: isVideo || COVER_IMAGE_TYPES.includes(file.type),
              duration,
            },
          ]);
        }
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [uploaded.length, upload],
  );

  function removeAttachment(index: number) {
    const att = uploaded[index];
    if (!att) return;

    // If inline, also remove the markdown reference from body
    if (att.inline) {
      const ref = `![${att.filename}](upload:${att.key})`;
      setContent((prev) => prev.replace(ref + "\n", "").replace(ref, ""));
    }

    if (att.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(att.previewUrl);
    }
    setUploaded((prev) => prev.filter((_, i) => i !== index));
  }

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      for (const file of files) {
        void uploadInline(file);
      }
    },
    [uploadInline],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files);
      if (files.length === 0) return;
      e.preventDefault();

      for (const file of files) {
        void uploadInline(file);
      }
    },
    [uploadInline],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed && uploaded.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Detect orphaned inline attachments: inline keys not referenced in body
      const referencedKeys = new Set<string>();
      const refPattern = /!\[.*?\]\(upload:([^)]+)\)/g;
      let match;
      while ((match = refPattern.exec(trimmed)) !== null) {
        referencedKeys.add(match[1]);
      }

      const attachments = uploaded
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
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      } else {
        await createPost({
          commitmentId,
          type: "post",
          content: trimmed || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }

      // Cleanup local blob preview URLs
      for (const att of uploaded) {
        if (att.previewUrl.startsWith("blob:")) URL.revokeObjectURL(att.previewUrl);
      }
      setContent("");
      setUploaded([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  }, [content, uploaded, isEditing, editEntry, commitmentId, createPost, updatePost, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit],
  );

  const charCount = content.length;
  const charColorClass =
    charCount > CHAR_SOFT_LIMIT
      ? "text-destructive"
      : charCount > 9500
        ? "text-accent"
        : charCount > 8000
          ? "text-yellow-500"
          : "text-[#333]";

  const canSubmit =
    (content.trim().length > 0 || uploaded.length > 0) && !isUploading && !isSubmitting;

  // Build preview attachment map from uploaded items (key → previewUrl)
  const previewAttachments = uploaded.map((att) => ({
    url: att.previewUrl,
    key: att.key,
    type: att.type,
    filename: att.filename,
    inline: att.inline,
  }));

  /** Update the width in `![alt|XX%](src)` when slider is dragged in preview. */
  const handleImageResize = useCallback((src: string, width: number) => {
    setContent((prev) => {
      // Match ![...](src) — optionally with existing |XX% in alt
      const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`!\\[([^|\\]]*?)(?:\\|\\d{1,3}%)?\\]\\(${escaped}\\)`);
      const match = prev.match(pattern);
      if (!match) return prev;
      const altBase = match[1];
      const widthSuffix = width < 100 ? `|${width}%` : "";
      return prev.replace(pattern, `![${altBase}${widthSuffix}](${src})`);
    });
  }, []);

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
        accept={ALL_TYPES.join(",")}
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) void uploadStandalone(files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Upload progress */}
      {isUploading && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 size={12} className="animate-spin" />
          uploading...
        </div>
      )}

      {/* Attachment previews */}
      {uploaded.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {uploaded.map((att, idx) => (
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
                onClick={() =>
                  setUploaded((prev) =>
                    prev.map((a, i) => (i === idx ? { ...a, cover: !a.cover } : a)),
                  )
                }
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
                onClick={() => removeAttachment(idx)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 cursor-pointer items-center justify-center border border-border bg-card text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/att:opacity-100"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <div className="mt-2 text-[11px] text-destructive">{error}</div>}

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

        {uploaded.length < MAX_ATTACHMENTS && (
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
          onClick={onClose}
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
