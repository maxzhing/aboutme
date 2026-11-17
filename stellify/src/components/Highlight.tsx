'use client';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { Eraser, Highlighter, StickyNote, Trash2, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { uid } from '@/lib/util';
import { addTextMark, cutRange, findBands, hitBoxes, MARK_COLORS, markAt, selectBoxes, trimRange, type Band, type Box, type Mark, type MarkColor } from '@/lib/highlight';
import { cn } from './ui';

/*
 * Highlights & notes, as on the real Digital SAT.
 *
 * Text: select any words in a passage or question and a small toolbar appears (yellow, blue, pink,
 * underline, note, remove). Highlights are painted with the browser's CSS Custom Highlight API, so
 * the question's own text and markup are never changed. Clicking a highlight opens it again.
 *
 * Official page images: drag across the printed words. The image's pixels are read once to find its
 * printed lines, so the highlight snaps to the lines like a real text selection.
 */

const NONE: Mark[] = [];
const supported = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

// ─── text: offsets ↔ ranges ───
/** characters from the start of root to a boundary point (counts every text node, so it is stable across renders) */
function offsetIn(root: Node, node: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, offset);
  return r.toString().length;
}
function rangeFrom(root: Node, s: number, e: number): Range | null {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let pos = 0, started = false;
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const len = n.textContent?.length ?? 0;
    if (!started && s < pos + len) { r.setStart(n, s - pos); started = true; }
    if (started && e <= pos + len) { r.setEnd(n, e - pos); return r; }
    pos += len;
  }
  return null;
}
const fullText = (root: Node) => { const r = document.createRange(); r.selectNodeContents(root); return r.toString(); };

// ─── painting every mounted block at once ───
const blocks = new Map<string, { el: HTMLElement; marks: Mark[] }>();
let frame = 0;
function paint() {
  if (!supported()) return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const groups: Record<string, Range[]> = { yellow: [], blue: [], pink: [], underline: [], note: [] };
    for (const { el, marks } of blocks.values()) for (const m of marks) {
      if (m.s === undefined || m.e === undefined) continue;
      const r = rangeFrom(el, m.s, m.e);
      if (!r) continue;
      groups[m.c].push(r);
      if (m.note) groups.note.push(r);
    }
    for (const [k, rs] of Object.entries(groups)) CSS.highlights.set(`hl-${k}`, new Highlight(...rs));
  });
}

// ─── the shared toolbar state ───
type Target = { kind: 'text'; key: string; s: number; e: number; text: string } | { kind: 'image'; key: string; boxes: Box[] };
interface Anchor { x: number; top: number; bottom: number }
interface HlUi {
  open: { target: Target; editId?: string; at: Anchor } | null;
  note: { key: string; id: string; at: Anchor } | null;
  hint: { at: Anchor; text: string } | null;
}
export const useHl = create<HlUi>(() => ({ open: null, note: null, hint: null }));
const rectAnchor = (r: { left: number; width: number; top: number; bottom: number }): Anchor => ({ x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
const marksOf = (key: string) => useStore.getState().highlights?.[key]?.marks ?? NONE;

/** Turns the current text selection into a target, if it lies inside one highlightable block. */
function selectionTarget(): { target: Target; at: Anchor } | null {
  if (!supported()) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  const host = (r.startContainer.nodeType === 1 ? r.startContainer as Element : r.startContainer.parentElement)?.closest<HTMLElement>('[data-hl]');
  const host2 = (r.endContainer.nodeType === 1 ? r.endContainer as Element : r.endContainer.parentElement)?.closest<HTMLElement>('[data-hl]');
  if (!host || host !== host2) return null;
  const full = fullText(host);
  const [s, e] = trimRange(full, offsetIn(host, r.startContainer, r.startOffset), offsetIn(host, r.endContainer, r.endOffset));
  if (e <= s) return null;
  return { target: { kind: 'text', key: host.dataset.hl!, s, e, text: full.slice(s, e) }, at: rectAnchor(r.getBoundingClientRect()) };
}
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null };
  if (d.caretPositionFromPoint) { const p = d.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, offset: p.offset } : null; }
  if (d.caretRangeFromPoint) { const r = d.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, offset: r.startOffset } : null; }
  return null;
}
/** A click (no drag) on highlighted text opens that highlight. */
function clickedMark(x: number, y: number): { target: Target; editId: string; at: Anchor } | null {
  const c = caretAt(x, y);
  const host = c && (c.node.nodeType === 1 ? c.node as Element : c.node.parentElement)?.closest<HTMLElement>('[data-hl]');
  if (!c || !host) return null;
  const marks = marksOf(host.dataset.hl!);
  const off = offsetIn(host, c.node, c.offset);
  for (const m of [markAt(marks, off), markAt(marks, off - 1)]) {
    if (!m) continue;
    const r = rangeFrom(host, m.s!, m.e!);
    const hit = r && [...r.getClientRects()].find((b) => x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 1 && y <= b.bottom + 1);
    if (hit) return { target: { kind: 'text', key: host.dataset.hl!, s: m.s!, e: m.e!, text: m.text ?? '' }, editId: m.id, at: rectAnchor(hit) };
  }
  return null;
}

/** Saves a highlight in the chosen color (or recolors the one being edited) and returns its id. */
function applyColor(c: MarkColor): string | null {
  const o = useHl.getState().open;
  if (!o) return null;
  const { setMarks } = useStore.getState();
  const marks = marksOf(o.target.key);
  let id = o.editId ?? uid();
  if (o.editId) setMarks(o.target.key, marks.map((m) => (m.id === o.editId ? { ...m, c } : m)));
  else if (o.target.kind === 'text') setMarks(o.target.key, addTextMark(marks, { id, c, s: o.target.s, e: o.target.e, text: o.target.text }));
  else { id = uid(); setMarks(o.target.key, [...marks, { id, c, boxes: o.target.boxes }]); }
  window.getSelection()?.removeAllRanges();
  return id;
}
function removeTarget() {
  const o = useHl.getState().open;
  if (!o) return;
  const { setMarks } = useStore.getState();
  const marks = marksOf(o.target.key);
  if (o.editId) setMarks(o.target.key, marks.filter((m) => m.id !== o.editId));
  else if (o.target.kind === 'text') setMarks(o.target.key, cutRange(marks, o.target.s, o.target.e));
  window.getSelection()?.removeAllRanges();
  useHl.setState({ open: null });
}
const overlaps = (t: Target) => t.kind === 'text' && marksOf(t.key).some((m) => m.s !== undefined && m.s < t.e && m.e! > t.s);

/** A block of question text whose words can be highlighted. */
export function HighlightText({ hkey, className, children, inline }: { hkey: string; className?: string; children: React.ReactNode; inline?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const marks = useStore((s) => s.highlights?.[hkey]?.marks) ?? NONE;
  const id = useId();
  useLayoutEffect(() => { if (ref.current) { blocks.set(id, { el: ref.current, marks }); paint(); } }, [id, marks]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mo = new MutationObserver(paint);
    mo.observe(el, { subtree: true, childList: true, characterData: true });
    return () => { mo.disconnect(); blocks.delete(id); paint(); };
  }, [id]);
  return inline
    ? <span ref={ref as React.RefObject<HTMLSpanElement>} data-hl={hkey} className={className}>{children}</span>
    : <div ref={ref as React.RefObject<HTMLDivElement>} data-hl={hkey} className={className}>{children}</div>;
}

/** An official page image whose printed words can be highlighted by dragging across them. */
export function HighlightImage({ hkey, src, alt }: { hkey: string; src: string; alt: string }) {
  const marks = useStore((s) => s.highlights?.[hkey]?.marks) ?? NONE;
  const wrap = useRef<HTMLDivElement>(null);
  const bands = useRef<Band[]>([]);
  const drag = useRef<{ a: { x: number; y: number }; moved: boolean; active: boolean; timer?: number } | null>(null);
  const [live, setLive] = useState<Box[] | null>(null);
  const pending = useHl((s) => (s.open && s.open.target.key === hkey && s.open.target.kind === 'image' && !s.open.editId ? s.open.target.boxes : null));
  const editing = useHl((s) => (s.open?.target.key === hkey ? s.open.editId : undefined));
  const preview = live ?? pending;

  const readLines = (img: HTMLImageElement) => {
    try {
      const scale = Math.min(1, 1200 / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      if (!cx) return;
      cx.drawImage(img, 0, 0, w, h);
      const px = cx.getImageData(0, 0, w, h).data;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      bands.current = findBands(gray, w, h);
      wrap.current?.setAttribute('data-lines', String(bands.current.length));
    } catch { bands.current = []; }
  };
  const pt = (cx: number, cy: number) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (cx - r.left) / r.width)), y: Math.min(1, Math.max(0, (cy - r.top) / r.height)) };
  };
  const anchorOf = (boxes: Box[]): Anchor => {
    const r = wrap.current!.getBoundingClientRect();
    const x0 = Math.min(...boxes.map((b) => b[0])), x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
    const y0 = Math.min(...boxes.map((b) => b[1])), y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
    return { x: r.left + ((x0 + x1) / 2) * r.width, top: r.top + y0 * r.height, bottom: r.top + y1 * r.height };
  };
  const begin = (cx: number, cy: number) => { useHl.setState({ open: null, note: null }); drag.current = { a: pt(cx, cy), moved: false, active: true }; };
  const move = (cx: number, cy: number) => {
    const d = drag.current;
    if (!d?.active) return;
    const b = pt(cx, cy);
    if (Math.hypot(b.x - d.a.x, b.y - d.a.y) > 0.012) d.moved = true;
    if (d.moved) setLive(selectBoxes(bands.current, d.a, b));
  };
  const finish = (cx: number, cy: number) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.active && d.moved) {
      const boxes = selectBoxes(bands.current, d.a, pt(cx, cy));
      setLive(null);
      useHl.setState({ open: { target: { kind: 'image', key: hkey, boxes }, at: anchorOf(boxes) } });
      return;
    }
    setLive(null);
    const p = pt(cx, cy);
    const m = [...marks].reverse().find((x) => hitBoxes(x, p.x, p.y));
    if (m) useHl.setState({ open: { target: { kind: 'image', key: hkey, boxes: m.boxes! }, editId: m.id, at: anchorOf(m.boxes!) }, note: null });
  };

  // touch: hold for a moment, then drag (a quick swipe still scrolls the page)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const d = { a: pt(t.clientX, t.clientY), moved: false, active: false, timer: 0, x: t.clientX, y: t.clientY };
      d.timer = window.setTimeout(() => { d.active = true; try { navigator.vibrate?.(8); } catch { /* optional */ } useHl.setState({ open: null, note: null }); }, 320);
      drag.current = d;
    };
    const moveT = (e: TouchEvent) => {
      const d = drag.current as (typeof drag.current & { x: number; y: number }) | null;
      if (!d) return;
      const t = e.touches[0];
      if (!d.active) { if (Math.hypot(t.clientX - d.x, t.clientY - d.y) > 10) { clearTimeout(d.timer); drag.current = null; } return; }
      e.preventDefault();
      move(t.clientX, t.clientY);
    };
    const end = (e: TouchEvent) => {
      const d = drag.current;
      if (!d) return;
      clearTimeout(d.timer);
      const t = e.changedTouches[0];
      if (d.active || !d.moved) { if (d.active) e.preventDefault(); finish(t.clientX, t.clientY); }
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', moveT, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchmove', moveT); el.removeEventListener('touchend', end); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, hkey]);

  const boxEl = (b: Box, key: string, cls: string) => <span key={key} className={cls} style={{ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${b[2] * 100}%`, height: `${b[3] * 100}%` }} />;
  return (
    <div ref={wrap} className="relative mx-auto w-fit max-w-full cursor-text select-none" data-hl-image={hkey} data-testid="hl-image"
      onPointerDown={(e) => { if (e.pointerType === 'touch' || e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); begin(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (e.pointerType !== 'touch') move(e.clientX, e.clientY); }}
      onPointerUp={(e) => { if (e.pointerType !== 'touch') finish(e.clientX, e.clientY); }}>
      <img src={src} alt={alt} draggable={false} className="block h-auto w-auto max-w-full" onLoad={(e) => readLines(e.currentTarget)} />
      {marks.map((m) => (m.boxes ?? []).map((b, i) => boxEl(b, `${m.id}-${i}`, cn('hl-box', `hl-box-${m.c}`, editing === m.id && 'hl-box-active'))))}
      {marks.filter((m) => m.note && m.boxes?.length).map((m) => { const b = m.boxes![m.boxes!.length - 1]; return <span key={`${m.id}-note`} className="hl-note-dot" style={{ left: `${(b[0] + b[2]) * 100}%`, top: `${b[1] * 100}%` }} aria-hidden />; })}
      {preview?.map((b, i) => boxEl(b, `p-${i}`, 'hl-box hl-box-preview'))}
    </div>
  );
}

/** The floating toolbar and note editor (mounted once, next to the app shell). */
export function HighlightToolbar() {
  const open = useHl((s) => s.open);
  const note = useHl((s) => s.note);
  const hint = useHl((s) => s.hint);
  const down = useRef(false);
  const timer = useRef(0);

  useEffect(() => {
    const show = () => {
      const t = selectionTarget();
      if (t) useHl.setState({ open: { target: t.target, at: t.at }, note: null });
    };
    const onDown = (e: PointerEvent) => {
      down.current = true;
      if (!(e.target as Element).closest?.('[data-hl-ui]')) useHl.setState({ open: null, hint: null, note: null });
    };
    const onUp = (e: PointerEvent) => {
      down.current = false;
      if ((e.target as Element).closest?.('[data-hl-ui],[data-hl-image]')) return;
      window.setTimeout(() => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) { show(); return; }
        const m = clickedMark(e.clientX, e.clientY);
        if (m) useHl.setState({ open: m, note: null });
      }, 0);
    };
    // keyboard selection (Shift + arrows) and touch selection handles
    const onSel = () => { clearTimeout(timer.current); if (!down.current) timer.current = window.setTimeout(show, 450); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') useHl.setState({ open: null, note: null, hint: null }); };
    const onScroll = (e: Event) => { if ((e.target as Element)?.closest?.('[data-hl-ui]')) return; if (useHl.getState().open) useHl.setState({ open: null }); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('selectionchange', onSel);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('selectionchange', onSel); document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll);
    };
  }, []);
  useEffect(() => { if (!hint) return; const t = setTimeout(() => useHl.setState({ hint: null }), 3500); return () => clearTimeout(t); }, [hint]);

  if (typeof document === 'undefined' || (!open && !note && !hint)) return null;
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  /** above the selection (below it on phones, where the system's own copy menu sits above), kept on screen */
  const place = (at: Anchor, h: number, w: number): React.CSSProperties => {
    const below = coarse || at.top < h + 16;
    const half = Math.min(w, window.innerWidth - 24) / 2 + 12;
    return { left: Math.min(Math.max(at.x, half), Math.max(half, window.innerWidth - half)), top: below ? at.bottom + 10 : at.top - 10, translate: below ? '-50% 0' : '-50% -100%' }; // `translate`, not `transform`, so the pop-in animation cannot undo it
  };
  const current = open?.editId ? marksOf(open.target.key).find((m) => m.id === open.editId) : undefined;
  const ui = (
    <>
      {open && !note && (
        <div data-hl-ui role="toolbar" aria-label="Highlight" className="hl-toolbar pop-in" style={place(open.at, 52, 260)} data-testid="hl-toolbar" onPointerDown={(e) => e.preventDefault()}>
          {MARK_COLORS.map(({ c, label }) => (
            <button key={c} type="button" className={cn('hl-swatch', `hl-swatch-${c}`)} aria-pressed={current?.c === c} aria-label={c === 'underline' ? 'Underline' : `Highlight ${label.toLowerCase()}`} title={c === 'underline' ? 'Underline' : `${label} highlight`} data-testid={`hl-${c}`}
              onClick={() => { applyColor(c); useHl.setState({ open: null }); }}>{c === 'underline' ? <span className="font-serif text-[15px] font-bold underline decoration-2 underline-offset-2">U</span> : null}</button>
          ))}
          <span className="mx-0.5 h-6 w-px bg-line" aria-hidden />
          <button type="button" className="hl-tool" aria-label={current?.note ? 'Edit note' : 'Add a note'} title={current?.note ? 'Edit note' : 'Add a note'} data-testid="hl-note"
            onClick={() => { const id = applyColor(current?.c ?? 'yellow'); if (id) useHl.setState({ open: null, note: { key: open.target.key, id, at: open.at } }); }}><StickyNote size={17} /></button>
          {(open.editId || overlaps(open.target)) && <button type="button" className="hl-tool" aria-label="Remove highlight" title="Remove highlight" data-testid="hl-remove" onClick={removeTarget}><Eraser size={17} /></button>}
        </div>
      )}
      {note && <NoteEditor key={`${note.key}:${note.id}`} at={place(note.at, 170, 320)} k={note.key} id={note.id} />}
      {hint && <div data-hl-ui role="status" data-testid="hl-hint" className="hl-toolbar pop-in max-w-[280px] !px-3 !py-2 text-sm" style={place(hint.at, 60, 280)}>{hint.text}</div>}
    </>
  );
  return createPortal(ui, document.body);
}

function NoteEditor({ k, id, at }: { k: string; id: string; at: React.CSSProperties }) {
  const mark = marksOf(k).find((m) => m.id === id);
  const [text, setText] = useState(mark?.note ?? '');
  const setMarks = useStore((s) => s.setMarks);
  const close = () => useHl.setState({ note: null });
  const save = (v: string | undefined) => { setMarks(k, marksOf(k).map((m) => (m.id === id ? { ...m, note: v || undefined } : m))); close(); };
  if (!mark) return null;
  return (
    <div data-hl-ui role="dialog" aria-label="Note" className="hl-toolbar pop-in !block w-[min(320px,calc(100vw-24px))] !p-3" style={at} data-testid="hl-note-editor">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted">
        <span className={cn('inline-block h-3 w-3 rounded-sm', `hl-chip-${mark.c}`)} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{mark.text ? `“${mark.text}”` : 'Highlighted area'}</span>
        <button type="button" className="btn-quiet !p-1" aria-label="Close" onClick={close}><X size={15} /></button>
      </div>
      <textarea autoFocus className="input min-h-[84px] w-full resize-y text-sm" placeholder="Your note: why this matters, what it shows…" value={text} maxLength={400} onChange={(e) => setText(e.target.value)} data-testid="hl-note-text"
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(text.trim()); }} />
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className="btn-primary !px-3 !py-1.5 text-sm" onClick={() => save(text.trim())} data-testid="hl-note-save">Save note</button>
        {mark.note && <button type="button" className="btn-quiet !px-2 !py-1.5 text-sm text-bad" onClick={() => save(undefined)}><Trash2 size={14} />Delete note</button>}
      </div>
    </div>
  );
}

/** Under a question: how many highlights it has, its notes, and a way to clear them. */
export function MarkNotes({ prefix }: { prefix: string }) {
  const all = useStore((s) => s.highlights);
  const clear = useStore((s) => s.clearMarks);
  const entries = useMemo(() => Object.entries(all ?? {}).filter(([k]) => k.startsWith(prefix)), [all, prefix]);
  const count = entries.reduce((n, [, v]) => n + v.marks.length, 0);
  if (!count) return null;
  const notes = entries.flatMap(([k, v]) => v.marks.filter((m) => m.note).map((m) => ({ k, m })));
  return (
    <div className="mt-4 rounded-xl border border-line bg-raised/40 p-3 text-sm" data-testid="hl-summary">
      <div className="flex items-center gap-2 text-muted">
        <Highlighter size={15} className="text-brand2" />
        <span>{count} highlight{count === 1 ? '' : 's'}{notes.length ? ` · ${notes.length} note${notes.length === 1 ? '' : 's'}` : ''}</span>
        <button type="button" className="btn-quiet ml-auto !px-2 !py-1 text-xs" onClick={() => clear(prefix)} data-testid="hl-clear">Clear all</button>
      </div>
      {notes.length > 0 && (
        <ul className="mt-2 space-y-1.5" data-testid="hl-notes">
          {notes.map(({ k, m }) => (
            <li key={m.id} className="flex items-start gap-2">
              <span className={cn('mt-1 inline-block h-3 w-3 shrink-0 rounded-sm', `hl-chip-${m.c}`)} aria-hidden />
              <button type="button" className="min-w-0 text-left hover:underline" onClick={(e) => useHl.setState({ note: { key: k, id: m.id, at: rectAnchor(e.currentTarget.getBoundingClientRect()) } })}>
                {m.text && <span className="text-muted">“{m.text.length > 60 ? `${m.text.slice(0, 60)}…` : m.text}” </span>}<span className="text-ink">{m.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The test header's "Highlights & Notes" button, like Bluebook's: select words, then press it to
 * highlight them and write a note. With nothing selected it explains what to do.
 */
export function AnnotateButton() {
  return (
    <button type="button" className="btn-ghost !px-2.5 !py-1.5" data-hl-ui data-testid="hl-annotate"
      onPointerDown={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        const t = selectionTarget();
        const at = rectAnchor(e.currentTarget.getBoundingClientRect());
        if (!t) { useHl.setState({ open: null, hint: { at, text: supported() ? 'Select words in the question first (or drag across a printed page), then press this to highlight them and add a note.' : 'This browser cannot highlight text. Try a current Chrome, Edge, Safari or Firefox.' } }); return; }
        useHl.setState({ open: { target: t.target, at: t.at } });
        const id = applyColor('yellow');
        if (id) useHl.setState({ open: null, note: { key: t.target.key, id, at: t.at } });
      }}><Highlighter size={15} />Highlights &amp; Notes</button>
  );
}

/** Has the student ever highlighted anything? (used to show a one-line tip until they have) */
export const useHasHighlighted = () => useStore((s) => !!s.highlights && Object.keys(s.highlights).length > 0);
export const canHighlightText = supported;
