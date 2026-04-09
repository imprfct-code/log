import { useState, useCallback, useRef, useEffect, type RefObject } from "react";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const ALL_MEDIA_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES];
export const MAX_ATTACHMENTS = 4;

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export interface UploadedAttachment {
  key: string;
  type: "image" | "video";
  filename: string;
  previewUrl: string;
  hasMarkdownRef: boolean;
  duration?: number;
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

export function useAttachments({
  textareaRef,
  setContent,
  content,
  upload,
  deleteFile,
  initial = [],
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  setContent: (fn: (prev: string) => string) => void;
  content: string;
  upload: (file: File) => Promise<string>;
  deleteFile: (key: string) => Promise<void>;
  initial?: UploadedAttachment[];
}) {
  const [uploaded, setUploaded] = useState<UploadedAttachment[]>(initial);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  // Refs for concurrent upload tracking + cleanup on unmount
  const countRef = useRef(uploaded.length);
  const inFlightRef = useRef(0);
  const uploadedRef = useRef(uploaded);

  // Track keys uploaded during this form session (not pre-existing from edit mode)
  const sessionKeysRef = useRef(new Set<string>());

  useEffect(() => {
    countRef.current = uploaded.length;
    uploadedRef.current = uploaded;
  }, [uploaded]);

  // Sync: remove attachments with markdown refs that were deleted from text
  useEffect(() => {
    if (inFlightRef.current > 0) return;
    const refPattern = /!\[.*?\]\(upload:([^)]+)\)/g;
    const referencedKeys = new Set<string>();
    let match;
    while ((match = refPattern.exec(content)) !== null) {
      referencedKeys.add(match[1]);
    }
    setUploaded((prev) => {
      const filtered = prev.filter((att) => !att.hasMarkdownRef || referencedKeys.has(att.key));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [content]);

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const att of uploadedRef.current) {
        if (att.previewUrl.startsWith("blob:")) URL.revokeObjectURL(att.previewUrl);
      }
    };
  }, []);

  /** Revoke all blob URLs, delete orphaned R2 uploads, and reset state. */
  const cleanup = useCallback(
    (keysToKeep?: Set<string>) => {
      for (const key of sessionKeysRef.current) {
        if (keysToKeep?.has(key)) continue;
        void deleteFile(key).catch(() => {});
      }
      sessionKeysRef.current.clear();
      for (const att of uploadedRef.current) {
        if (att.previewUrl.startsWith("blob:")) URL.revokeObjectURL(att.previewUrl);
      }
      setUploaded([]);
      setError(null);
    },
    [deleteFile],
  );

  /** Upload a single file and insert an inline markdown reference at cursor. */
  const uploadInline = useCallback(
    async (file: File) => {
      if (countRef.current >= MAX_ATTACHMENTS) {
        setError(`Maximum ${MAX_ATTACHMENTS} attachments`);
        return;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      const isVideo = VIDEO_TYPES.includes(file.type);
      // Unique placeholder avoids race conditions when multiple files upload concurrently
      const placeholderId = crypto.randomUUID().slice(0, 8);
      const placeholder = `![uploading-${placeholderId}]()`;
      insertAtCursor(textareaRef, placeholder + "\n", setContent);

      inFlightRef.current++;
      setIsUploading(true);
      try {
        const [key, duration] = await Promise.all([
          upload(file),
          isVideo ? getVideoDuration(file) : Promise.resolve(undefined),
        ]);
        const previewUrl = URL.createObjectURL(file);
        const resolved = `![${file.name}](upload:${key})`;

        setContent((prev) => prev.replace(placeholder, resolved));
        sessionKeysRef.current.add(key);

        setUploaded((prev) => [
          ...prev,
          {
            key,
            type: isVideo ? "video" : "image",
            filename: file.name,
            previewUrl,
            hasMarkdownRef: true,
            duration,
          },
        ]);
      } catch {
        setContent((prev) => prev.replace(placeholder + "\n", ""));
        setError("Upload failed. Please try again.");
      } finally {
        inFlightRef.current--;
        if (inFlightRef.current === 0) setIsUploading(false);
      }
    },
    [upload, textareaRef, setContent],
  );

  /** Upload files in parallel and append markdown references at end of content. */
  const uploadStandalone = useCallback(
    async (files: File[]) => {
      const remaining = MAX_ATTACHMENTS - countRef.current;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_ATTACHMENTS} attachments`);
        return;
      }

      const toUpload = files.slice(0, remaining);
      // Reserve slots immediately to prevent concurrent batches from exceeding the limit
      countRef.current += toUpload.length;
      setError(null);
      inFlightRef.current++;
      setIsUploading(true);

      try {
        const results = await Promise.all(
          toUpload.map(async (file) => {
            const err = validateFile(file);
            if (err) throw new Error(err);

            const isVideo = VIDEO_TYPES.includes(file.type);
            const [key, duration] = await Promise.all([
              upload(file),
              isVideo ? getVideoDuration(file) : Promise.resolve(undefined),
            ]);

            return {
              file,
              key,
              type: (isVideo ? "video" : "image") as "image" | "video",
              duration,
              previewUrl: URL.createObjectURL(file),
            };
          }),
        );

        for (const r of results) {
          sessionKeysRef.current.add(r.key);
        }

        setContent((prev) => {
          let text = prev.trimEnd();
          for (const r of results) {
            const ref = `![${r.file.name}](upload:${r.key})`;
            text = text ? `${text}\n${ref}` : ref;
          }
          return text + "\n";
        });

        setUploaded((prev) => [
          ...prev,
          ...results.map((r) => ({
            key: r.key,
            type: r.type,
            filename: r.file.name,
            previewUrl: r.previewUrl,
            hasMarkdownRef: true,
            duration: r.duration,
          })),
        ]);
      } catch (err) {
        // Release reserved slots on failure so they can be reused
        countRef.current -= toUpload.length;
        setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        inFlightRef.current--;
        if (inFlightRef.current === 0) setIsUploading(false);
      }
    },
    [upload, setContent],
  );

  function removeAttachment(index: number) {
    const att = uploaded[index];
    if (!att) return;

    if (att.hasMarkdownRef) {
      // Match with optional width suffix: ![name](…) or ![name|44%](…)
      const escapedName = att.filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedKey = att.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(
        `!\\[${escapedName}(?:\\|\\d{1,3}%)?\\]\\(upload:${escapedKey}\\)\\n?`,
      );
      setContent((prev) => prev.replace(pattern, ""));
    }

    if (att.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(att.previewUrl);
    }
    setUploaded((prev) => prev.filter((_, i) => i !== index));
  }

  return {
    uploaded,
    isUploading,
    error,
    setError,
    uploadInline,
    uploadStandalone,
    removeAttachment,
    cleanup,
  };
}
