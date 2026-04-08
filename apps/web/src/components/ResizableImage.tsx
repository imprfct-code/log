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
  const startXRef = useRef(0);
  const startWidthPxRef = useRef(0);
  const parentWidthRef = useRef(0);

  // Sync external changes
  useEffect(() => {
    if (!dragging) setLiveWidth(widthPercent);
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
      setLiveWidth(Math.min(100, Math.max(10, pct)));
    },
    [dragging],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onResize(liveWidth);
  }, [dragging, liveWidth, onResize]);

  return (
    <span
      ref={containerRef}
      className="group/resize relative my-2 block"
      style={{ width: `${liveWidth}%` }}
    >
      {children}

      {/* Right-edge drag handle */}
      <span
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute top-0 right-0 flex h-full w-2 cursor-col-resize items-center justify-center opacity-0 transition-opacity group-hover/resize:opacity-100"
      >
        <span className="h-8 w-1 bg-accent/60" />
      </span>

      {/* Width badge — visible while dragging */}
      {dragging && (
        <span className="absolute top-1 left-1 bg-card/80 px-1.5 py-0.5 text-[10px] tabular-nums text-accent">
          {liveWidth}%
        </span>
      )}
    </span>
  );
}
