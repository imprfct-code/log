import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type DragEvent,
  type ClipboardEvent,
} from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { Attachment } from "@/types";
import { Loader2, Paperclip, ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizableMedia } from "./ResizableImage";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALL_MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const COMMENT_MAX_ATTACHMENTS = 2;
const COMMENT_MAX_LENGTH = 2000;

interface PendingAttachment {
  key: string;
  type: "image" | "video";
  filename: string;
  previewUrl: string;
  duration?: number;
  widthPercent: number;
  isExisting?: boolean;
}

function toInitialAttachments(attachments?: Attachment[]): PendingAttachment[] {
  if (!attachments?.length) return [];
  return attachments.map((att) => ({
    key: att.key,
    type: att.type,
    filename: att.filename,
    previewUrl: att.url,
    duration: att.duration,
    widthPercent: att.widthPercent ?? 100,
    isExisting: true,
  }));
}

function validateFile(file: File): string | null {
  if (!ALL_MEDIA_TYPES.includes(file.type)) {
    const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : file.type || "unknown";
    return `Unsupported file type: ${ext}`;
  }
  const isVideo = VIDEO_TYPES.includes(file.type);
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max ${isVideo ? "50" : "10"} MB)`;
  }
  return null;
}

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
  id: Id<"comments">;
  text: string;
  attachments?: Attachment[];
}

export function CommentInput({
  commitmentId,
  devlogEntryId,
  autoFocus,
  edit,
  onEditDone,
}: {
  commitmentId: Id<"commitments">;
  devlogEntryId?: Id<"devlogEntries">;
  autoFocus?: boolean;
  edit?: EditData;
  onEditDone?: () => void;
}) {
  const isEditing = !!edit;
  const { isAuthenticated } = useConvexAuth();
  const createComment = useMutation(api.comments.create);
  const updateComment = useMutation(api.comments.update);
  const deleteR2Object = useMutation(api.r2.deleteObject);
  const uploadFile = useUploadFile(api.r2);

  const [text, setText] = useState(edit?.text ?? "");
  const [attachments, setAttachments] = useState<PendingAttachment[]>(() =>
    toInitialAttachments(edit?.attachments),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(0);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Auto-dismiss errors
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // Focus textarea in edit mode
  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const uploadSingle = useCallback(
    async (file: File) => {
      if (attachments.length + inFlightRef.current >= COMMENT_MAX_ATTACHMENTS) {
        setError(`Maximum ${COMMENT_MAX_ATTACHMENTS} attachments`);
        return;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const isVideo = VIDEO_TYPES.includes(file.type);
      inFlightRef.current++;
      setIsUploading(true);

      try {
        const [key, duration] = await Promise.all([
          uploadFile(file),
          isVideo ? getVideoDuration(file) : Promise.resolve(undefined),
        ]);
        const previewUrl = URL.createObjectURL(file);
        blobUrlsRef.current.add(previewUrl);
        setAttachments((prev) => [
          ...prev,
          {
            key,
            type: isVideo ? "video" : "image",
            filename: file.name,
            previewUrl,
            duration,
            widthPercent: 100,
          },
        ]);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        inFlightRef.current--;
        if (inFlightRef.current === 0) setIsUploading(false);
      }
    },
    [attachments.length, uploadFile],
  );

  function removeAttachment(index: number) {
    const att = attachments[index];
    if (!att) return;
    if (att.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(att.previewUrl);
      blobUrlsRef.current.delete(att.previewUrl);
    }
    // Only delete from R2 for newly uploaded files, not existing ones
    if (!att.isExisting) {
      void deleteR2Object({ key: att.key }).catch(() => {});
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  if (!isAuthenticated) return null;

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const atts = attachments.map(({ key, type, filename, duration, widthPercent }) => ({
        key,
        type,
        filename,
        hasMarkdownRef: false,
        cover: false,
        ...(duration !== undefined && { duration }),
        ...(widthPercent < 100 && { widthPercent }),
      }));

      if (edit) {
        await updateComment({
          id: edit.id,
          text: trimmed,
          attachments: atts,
        });
        onEditDone?.();
      } else {
        await createComment({
          commitmentId,
          devlogEntryId,
          text: trimmed,
          attachments: atts.length > 0 ? atts : undefined,
        });
        setText("");
        setAttachments([]);
      }
    } catch (e) {
      console.error("Failed to post comment:", e);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) void submit();
    }
    if (e.key === "Escape" && isEditing) {
      onEditDone?.();
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    for (const file of Array.from(e.dataTransfer.files)) {
      void uploadSingle(file);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    e.preventDefault();
    for (const file of files) {
      void uploadSingle(file);
    }
  }

  const canSubmit =
    (text.trim().length > 0 || attachments.length > 0) && !isUploading && !isSubmitting;

  return (
    <div
      className={cn("border border-border p-2 transition-colors", dragOver && "border-accent/40")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder="write a comment..."
        autoFocus={autoFocus || isEditing}
        aria-label={isEditing ? "Edit comment" : "Write a comment"}
        rows={1}
        maxLength={COMMENT_MAX_LENGTH}
        className="w-full resize-none border-none bg-transparent font-mono text-xs text-foreground placeholder:text-[#444] focus:outline-none"
        style={{ minHeight: "24px" }}
      />

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div
          className={cn(
            "mt-2 grid gap-1",
            attachments.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {attachments.map((att, i) => {
            const removeBtn = (
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute top-1 right-1 z-10 flex h-5 w-5 cursor-pointer items-center justify-center border border-border bg-background/80 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/resize:opacity-100"
                aria-label={`Remove ${att.filename}`}
              >
                <X size={10} />
              </button>
            );

            if (att.type === "image") {
              return (
                <div key={att.key}>
                  <ResizableMedia
                    widthPercent={att.widthPercent}
                    onResize={(w) =>
                      setAttachments((prev) =>
                        prev.map((a, j) => (j === i ? { ...a, widthPercent: w } : a)),
                      )
                    }
                  >
                    <img
                      src={att.previewUrl}
                      alt={att.filename}
                      className="w-full border border-border"
                    />
                    {removeBtn}
                  </ResizableMedia>
                </div>
              );
            }

            return (
              <div key={att.key} className="group/resize relative">
                <video
                  src={att.previewUrl}
                  className={cn(
                    "w-full border border-border object-cover",
                    attachments.length === 1 ? "max-h-48" : "h-40",
                  )}
                />
                {removeBtn}
              </div>
            );
          })}
        </div>
      )}

      {isUploading && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 size={10} className="animate-spin" />
          uploading...
        </div>
      )}

      {error && <div className="mt-1 text-[11px] text-destructive">{error}</div>}

      <div className="mt-1 flex items-center justify-end gap-2">
        {attachments.length < COMMENT_MAX_ATTACHMENTS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer items-center border-none bg-transparent text-[#444] transition-colors hover:text-muted-foreground"
            aria-label="Attach file"
          >
            <Paperclip size={12} />
          </button>
        )}

        {isEditing && (
          <>
            <button
              type="button"
              onClick={onEditDone}
              className="cursor-pointer border-none bg-transparent font-mono text-[11px] text-[#444] transition-colors hover:text-muted-foreground"
            >
              cancel
            </button>
            <span className="text-[10px] text-[#333]">esc</span>
          </>
        )}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="flex cursor-pointer items-center border border-accent/40 bg-accent/10 p-1 transition-colors hover:bg-accent/20 disabled:pointer-events-none disabled:opacity-40"
          aria-label={isEditing ? "Save comment" : "Send comment"}
        >
          {isSubmitting ? (
            <Loader2 size={12} className="animate-spin text-accent" />
          ) : (
            <ArrowUp size={12} className="text-accent" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALL_MEDIA_TYPES.join(",")}
        multiple
        onChange={(e) => {
          for (const file of Array.from(e.target.files ?? [])) {
            void uploadSingle(file);
          }
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
}
