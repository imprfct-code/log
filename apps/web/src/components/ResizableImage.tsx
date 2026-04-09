import { useRef, useState, useCallback, useEffect, type ReactNode } from "react";

export function ResizableMedia({
  children,
  widthPercent,
  onResize,
}: {
  children: ReactNode;
  widthPercent: number;
  onResize: (width: number) => void;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  const [liveWidth, setLiveWidth] = useState(widthPercent);
  const liveWidthRef = useRef(widthPercent);
  const startXRef = useRef(0);
  const startWidthPxRef = useRef(0);
  const parentWidthRef = useRef(0);
  const currentWidthRef = useRef(widthPercent);

  // Sync external changes and keep currentWidthRef up to date
  useEffect(() => {
    if (!dragging) {
      liveWidthRef.current = widthPercent;
      setLiveWidth(widthPercent);
      currentWidthRef.current = widthPercent;
    }
  }, [widthPercent, dragging]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    startXRef.current = e.clientX;
    startWidthPxRef.current = el.offsetWidth;
    parentWidthRef.current = el.parentElement?.offsetWidth ?? el.offsetWidth;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientX - startXRef.current;
      const newPx = startWidthPxRef.current + delta;
      const pct = Math.round((newPx / parentWidthRef.current) * 100);
      const newWidth = Math.min(100, Math.max(10, pct));
      liveWidthRef.current = newWidth;
      setLiveWidth(newWidth);
      currentWidthRef.current = newWidth;
    },
    [dragging],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onResize(liveWidthRef.current);
  }, [dragging, onResize]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 5;
      let newWidth: number | null = null;
      if (e.key === "ArrowLeft") {
        newWidth = Math.max(10, currentWidthRef.current - step);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        newWidth = Math.min(100, currentWidthRef.current + step);
        e.preventDefault();
      }
      if (newWidth !== null) {
        currentWidthRef.current = newWidth;
        setLiveWidth(newWidth);
        onResize(newWidth);
      }
    },
    [onResize],
  );

  return (
    <span
      ref={containerRef}
      className="group/resize relative my-2 block"
      style={{ width: `${liveWidth}%` }}
    >
      {children}

      {/* Right-edge drag handle */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        aria-label="Resize image"
        className="absolute top-0 right-0 flex h-full w-2 cursor-col-resize items-center justify-center border-none bg-transparent p-0 opacity-0 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:opacity-100 group-hover/resize:opacity-100"
        tabIndex={0}
      >
        <span className="h-8 w-1 bg-accent/60" />
      </button>

      {/* Width badge — visible while dragging */}
      {dragging && (
        <span className="absolute top-1 left-1 bg-card/80 px-1.5 py-0.5 text-[10px] tabular-nums text-accent">
          {liveWidth}%
        </span>
      )}
    </span>
  );
}
