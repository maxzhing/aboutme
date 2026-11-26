import { useEffect, useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';

/**
 * The Line Reader from Bluebook: shades the screen except a band of one to three lines, which the student drags
 * (or moves with the arrow keys) down the passage. The shading lets clicks through, so answering works as usual.
 */
const SIZES = [{ label: '1 line', h: 40 }, { label: '2 lines', h: 68 }, { label: '3 lines', h: 96 }];

export function LineReader({ onClose }: { onClose: () => void }) {
  const [y, setY] = useState(() => Math.round(window.innerHeight * 0.35));
  const [size, setSize] = useState(1);
  const drag = useRef<{ start: number; y0: number } | null>(null);
  const handle = useRef<HTMLDivElement>(null);
  const h = SIZES[size].h;
  const clampY = (v: number) => Math.min(Math.max(0, v), window.innerHeight - h);
  useEffect(() => {
    handle.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const shade = 'pointer-events-none fixed inset-x-0 z-40 bg-black/60';
  return (
    <div data-testid="line-reader">
      <div className={shade} style={{ top: 0, height: y }} aria-hidden />
      <div className={shade} style={{ top: y + h, bottom: 0 }} aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 z-40 border-y-2 border-brand" style={{ top: y, height: h }} aria-hidden />
      <div
        ref={handle}
        role="slider" tabIndex={0} aria-label="Line Reader position: drag, or use the up and down arrow keys" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round((y / Math.max(1, window.innerHeight - h)) * 100)}
        className="fixed right-2 z-50 flex touch-none items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 text-xs shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        style={{ top: clampY(y + h / 2 - 18) }}
        onPointerDown={(e) => { if ((e.target as HTMLElement).closest('button')) return; drag.current = { start: e.clientY, y0: y }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (drag.current) setY(clampY(drag.current.y0 + e.clientY - drag.current.start)); }}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 4 : 24;
          if (e.key === 'ArrowDown') { e.preventDefault(); setY((v) => clampY(v + step)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setY((v) => clampY(v - step)); }
        }}
      >
        <GripVertical size={16} className="cursor-grab text-muted" aria-hidden />
        <button type="button" className="btn-quiet !min-h-0 !px-1.5 !py-0.5 text-xs" onClick={() => setSize((size + 1) % SIZES.length)} aria-label={`Window height: ${SIZES[size].label}. Change`}>{SIZES[size].label}</button>
        <button type="button" className="btn-quiet !min-h-0 !p-0.5" onClick={onClose} aria-label="Close Line Reader"><X size={15} /></button>
      </div>
    </div>
  );
}
