import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function ImageLightbox({
  images,
  initialIndex = 0,
  postHref,
  onClose,
}: {
  images: string[];
  initialIndex?: number;
  postHref?: string;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const multi = images.length > 1;

  const prev = useCallback(
    () => setIndex((i) => (i > 0 ? i - 1 : images.length - 1)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i < images.length - 1 ? i + 1 : 0)),
    [images.length],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (multi && e.key === "ArrowLeft") prev();
      if (multi && e.key === "ArrowRight") next();
    },
    [onClose, multi, prev, next],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const navBtn =
    "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50 transition-colors hover:bg-white/10 hover:text-white";

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        <X size={18} />
      </button>

      {multi && (
        <>
          <button type="button" onClick={prev} className={`${navBtn} left-4`} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={next} className={`${navBtn} right-4`} aria-label="Next">
            <ChevronRight size={18} />
          </button>
        </>
      )}

      <img
        key={index}
        src={images[index]}
        alt=""
        className="max-h-[90vh] max-w-[min(90vw,calc(100vw-6rem))] object-contain animate-in fade-in zoom-in-95 duration-200"
      />

      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
        {multi && (
          <span className="text-[11px] text-white/40">
            {index + 1} / {images.length}
          </span>
        )}
        {postHref && (
          <Link
            to={postHref}
            className="text-[11px] text-white/40 no-underline transition-colors hover:text-white/70"
          >
            read more →
          </Link>
        )}
      </div>
    </div>,
    document.body,
  );
}
