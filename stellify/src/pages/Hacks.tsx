import Link from 'next/link';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { HACKS } from '@/data/hacks';
import { SKILL } from '@/lib/taxonomy';
import { plain } from '@/lib/richtext';
import { HackCard } from '@/components/HackCard';
import { Empty, PageHeader, Tabs } from '@/components/ui';

export function HacksPage() {
  const [q, setQ] = useState('');
  const [sec, setSec] = useState<'all' | 'rw' | 'math'>('all');
  const list = HACKS.filter((h) => (sec === 'all' || SKILL[h.skill].section === sec) && (!q.trim() || plain(`${h.title} ${h.what} ${h.test}`).toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader eyebrow="Learn" title="SAT Hacks" subtitle={`${HACKS.length} one-idea cards. Each tells you what the thing is, the quick test to run, and what to decide before you look at the answer choices. The same cards appear on lessons and on every question.`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-faint" /><input className="input pl-9" placeholder="Search hacks: non-essential, colon, discriminant…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search hacks" /></div>
        <Tabs label="Section" value={sec} onChange={setSec} tabs={[{ id: 'all', label: 'All' }, { id: 'rw', label: 'Reading & Writing' }, { id: 'math', label: 'Math' }]} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((h) => (
          <div key={h.id}>
            <HackCard hack={h} />
            <div className="mt-1.5 flex gap-4 px-1 text-sm"><Link href={`/learn/${h.skill}`} className="text-brand2 hover:underline">Lesson: {SKILL[h.skill].short}</Link><Link href={`/practice/session?mode=skill&skill=${h.skill}&n=6`} className="text-brand2 hover:underline">Practice it →</Link></div>
          </div>
        ))}
      </div>
      {!list.length && <Empty title="No hacks match" body="Try a simpler keyword." />}
    </div>
  );
}
