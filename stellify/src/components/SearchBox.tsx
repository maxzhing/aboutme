'use client';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { search } from '@/lib/search';
import { Badge, Modal } from './ui';

/** Smart Search across questions, lessons, topics, rules, formulas, words, mistakes and notes. */
export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const notes = useStore((s) => s.notes);
  const mistakes = useStore((s) => s.mistakes);
  const hits = useMemo(() => (q.trim().length > 1 ? search(q, { notes, mistakes }, 30) : []), [q, notes, mistakes]);
  return (
    <Modal open={open} onClose={onClose} title="Search Stellify" wide>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-faint" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “semicolon”, “discriminant”, “margin of error”, “ephemeral”…" className="input pl-9" aria-label="Search" />
      </div>
      <ul className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto" aria-label="Search results">
        {hits.map((h, i) => (
          <li key={i}>
            <Link href={h.href} onClick={onClose} className="block rounded-xl px-3 py-2 hover:bg-raised">
              <div className="flex items-center gap-2"><Badge tone={h.kind === 'Mistake' ? 'bad' : h.kind === 'Question' ? 'default' : 'brand'}>{h.kind}</Badge><span className="truncate text-sm font-semibold">{h.title}</span></div>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{h.snippet}</p>
            </Link>
          </li>
        ))}
        {q.trim().length > 1 && !hits.length && <li className="px-3 py-6 text-center text-sm text-muted">No matches. Try a topic name or a single keyword.</li>}
        {q.trim().length <= 1 && <li className="px-3 py-6 text-center text-sm text-muted">Search every question, lesson, grammar rule, formula, vocabulary word, your mistakes and your notes.</li>}
      </ul>
    </Modal>
  );
}
