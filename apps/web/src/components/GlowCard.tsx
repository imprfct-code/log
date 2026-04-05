import { useRef, useCallback, type ReactNode } from "react";

export function GlowCard({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement[]>([]);

  function getCards(): HTMLElement[] {
    if (cardsRef.current.length === 0 && ref.current) {
      cardsRef.current = Array.from(ref.current.querySelectorAll<HTMLElement>(".glow-card"));
    }
    return cardsRef.current;
  }

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    for (const card of getCards()) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
      card.style.setProperty("--glow-opacity", "1");
    }
  }, []);

  const handleLeave = useCallback(() => {
    for (const card of getCards()) {
      card.style.setProperty("--glow-opacity", "0");
    }
  }, []);

  return (
    <div ref={ref} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
}
