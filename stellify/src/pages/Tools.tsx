import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { REF_CATS, REFERENCE } from '@/data/reference';
import { RESOURCES } from '@/data/resources';
import { VOCAB, type VocabWord } from '@/data/vocabulary';
import { getQuestion } from '@/data/questions';
import { useStore } from '@/lib/store';
import { SKILL } from '@/lib/taxonomy';
import { dateKey, rng, shuffle } from '@/lib/util';
import type { Note, SkillId } from '@/lib/types';
import { RichText } from '@/components/RichText';
import { TutorChat } from '@/components/TutorChat';
import { Badge, Card, Empty, PageHeader, Stat, Tabs, cn } from '@/components/ui';

export function TutorPage() {
  const sp = useSearchParams();
  const topic = sp.get('topic');
  const threads = useStore((s) => s.tutor);
  const del = useStore((s) => s.tutorDelete);
  const [active, setActive] = useState<string | null>(null);
  const [fresh, setFresh] = useState(0);
  const thread = threads.find((t) => t.id === active);
  const suggestions = topic && SKILL[topic as SkillId]
    ? [`Explain ${SKILL[topic as SkillId].name} from scratch`, `What are the common traps in ${SKILL[topic as SkillId].short}?`, 'What should I study next?']
    : ['What should I study next?', 'When do I use a semicolon?', 'Explain the discriminant', 'What does margin of error mean?', 'How do transitions work?', 'What does "equivocal" mean?'];
  return (
    <div>
      <PageHeader eyebrow="Tools" title="AI Tutor" subtitle="Ask about any rule, formula, word or strategy, or open the tutor from inside a question for step-by-step help. The built-in tutor works offline and answers only from validated explanations. An optional AI model can be enabled in Settings." actions={<Link href="/settings#ai" className="btn-ghost">AI settings</Link>} />
      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <Card className="self-start !p-3">
          <button className="btn-primary w-full" onClick={() => { setActive(null); setFresh((n) => n + 1); }}><Plus size={16} />New conversation</button>
          <div className="mt-3 text-xs font-bold uppercase tracking-wide text-faint">History</div>
          <ul className="mt-1 max-h-[50vh] space-y-0.5 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center gap-1">
                <button onClick={() => setActive(t.id)} className={cn('min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-sm', active === t.id ? 'bg-brand/15' : 'hover:bg-raised')}>{t.title}</button>
                <button className="btn-quiet !p-1.5 opacity-60 hover:opacity-100" aria-label={`Delete conversation ${t.title}`} onClick={() => { del(t.id); if (active === t.id) setActive(null); }}><Trash2 size={14} /></button>
              </li>
            ))}
            {!threads.length && <li className="px-2 py-3 text-xs text-muted">Conversations are saved on this device only.</li>}
          </ul>
        </Card>
        <Card><TutorChat key={active ?? `new-${fresh}`} threadId={active} qid={thread?.qid} answer={thread?.qid ? useStore.getState().attempts.filter((a) => a.qid === thread.qid).pop()?.answer : undefined} suggestions={suggestions} /></Card>
      </div>
    </div>
  );
}

type QuizItem = { word: VocabWord; options: string[] };
const makeQuiz = (seed: string, pool: VocabWord[], n: number): QuizItem[] => {
  const rand = rng(seed);
  return shuffle(pool, rand).slice(0, n).map((word) => ({ word, options: shuffle([word.w, ...shuffle(VOCAB.filter((v) => v.pos === word.pos && v.w !== word.w && !word.syn.includes(v.w)), rand).slice(0, 3).map((v) => v.w)], rand) }));
};

export function VocabularyPage() {
  const sp = useSearchParams();
  const srs = useStore((s) => s.vocabSrs);
  const review = useStore((s) => s.reviewVocab);
  const award = useStore((s) => s.awardXp);
  const [tab, setTab] = useState<'cards' | 'quiz' | 'list'>(sp.get('word') ? 'list' : 'cards');
  const [q, setQ] = useState(sp.get('word') ?? '');
  const [flip, setFlip] = useState(false);
  const [session, setSession] = useState(0);
  const now = Date.now();
  const due = useMemo(() => { const d = VOCAB.filter((v) => srs[v.w] && srs[v.w].due <= now); const fresh = VOCAB.filter((v) => !srs[v.w]); return [...d, ...fresh].slice(0, 12); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]);
  const [i, setI] = useState(0);
  const learned = Object.values(srs).filter((c) => c.reps >= 2).length;
  const mine = VOCAB.filter((v) => srs[v.w] && srs[v.w].lapses > 0);
  const quiz = useMemo(() => makeQuiz(`vocab-${dateKey()}-${session}`, mine.length >= 6 && session % 2 === 1 ? mine : VOCAB, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session]);
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [claimed, setClaimed] = useState(false);
  const card = due[i];
  const grade = (knew: boolean) => { review(card.w, knew); setFlip(false); if (i + 1 >= due.length) { award(15, 'Vocabulary session'); setI(0); setSession((n) => n + 1); } else setI(i + 1); };
  const list = VOCAB.filter((v) => !q.trim() || `${v.w} ${v.def} ${v.syn.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  const right = quiz.filter((it, k) => picks[k] === it.word.w).length;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Tools" title="Vocabulary Center" subtitle="High-utility academic words, taught the way the SAT tests them: in context, with attention to nuance. Flashcards return at growing intervals, and words you miss form your personal list." />
      <div className="grid grid-cols-3 gap-3"><Stat label="Words" value={VOCAB.length} /><Stat label="Learned" value={learned} sub="recalled twice or more" /><Stat label="My tricky words" value={mine.length} sub="missed at least once" /></div>
      <Tabs label="Vocabulary mode" value={tab} onChange={setTab} tabs={[{ id: 'cards', label: 'Flashcards' }, { id: 'quiz', label: 'Daily quiz' }, { id: 'list', label: 'Word list' }]} />
      {tab === 'cards' && (card ? (
        <Card className="mx-auto max-w-xl text-center" data-testid="flashcard">
          <div className="text-xs text-faint">Card {i + 1} of {due.length} · {srs[card.w] ? 'review' : 'new word'}</div>
          <div className="mt-4 font-display text-3xl font-bold">{card.w}</div><div className="text-sm italic text-muted">{card.pos}</div>
          <p className="mx-auto mt-4 max-w-md font-serif text-lg">“{card.ex.replace(new RegExp(`\\b${card.w}\\b`, 'i'), '_____')}”</p>
          <p className="mt-1 text-xs text-faint">Work out the meaning from the sentence before you flip.</p>
          {flip ? (
            <div className="mt-4 border-t border-line pt-4 text-left">
              <p><b>Meaning:</b> {card.def}</p><p className="mt-1 text-sm text-muted"><b>Similar:</b> {card.syn.join(', ')}</p>{card.nuance && <p className="mt-1 text-sm text-muted"><b>Nuance:</b> {card.nuance}</p>}<p className="mt-1 font-serif text-sm">“{card.ex}”</p>
              <div className="mt-4 flex justify-center gap-2"><button className="btn-ghost" onClick={() => grade(false)}>Not yet</button><button className="btn-primary" onClick={() => grade(true)} data-testid="knew-it">I knew it</button></div>
            </div>
          ) : <button className="btn-primary mt-5" onClick={() => setFlip(true)} data-testid="flip">Show meaning</button>}
        </Card>
      ) : <Empty title="All caught up" body="No cards are due. Come back tomorrow or try the daily quiz." />)}
      {tab === 'quiz' && (
        <div className="space-y-3">
          {quiz.map((it, k) => { const p = picks[k]; return (
            <Card key={`${session}-${k}`} className="!p-4">
              <p className="font-serif text-[16px]">{k + 1}. {it.word.ex.replace(new RegExp(`\\b${it.word.w}\\b`, 'i'), '______')}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">{it.options.map((o) => <button key={o} disabled={!!p} onClick={() => { setPicks((x) => ({ ...x, [k]: o })); review(it.word.w, o === it.word.w); }} className={cn('chip !px-3 !py-1.5', p ? (o === it.word.w ? 'border-ok bg-ok/15 text-ink' : p === o ? 'border-bad bg-bad/15 text-ink' : 'opacity-60') : 'hover:text-ink')}>{o}</button>)}</div>
              {p && <p className="mt-2 text-sm text-muted"><b className="text-ink">{it.word.w}</b>: {it.word.def}.{it.word.nuance ? ` ${it.word.nuance}` : ''}</p>}
            </Card>
          ); })}
          {Object.keys(picks).length === quiz.length && <Card className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm">Score: <b>{right}/{quiz.length}</b>. Missed words were added to your tricky list and will come back in flashcards.</span><div className="flex gap-2"><button className="btn-ghost" disabled={claimed} onClick={() => { award(10 + right, 'Vocabulary quiz'); setClaimed(true); }}>{claimed ? 'XP claimed' : 'Claim XP'}</button><button className="btn-primary" onClick={() => { setPicks({}); setClaimed(false); setSession((n) => n + 1); }}>New quiz</button></div></Card>}
        </div>
      )}
      {tab === 'list' && (
        <div>
          <div className="relative mb-3"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-faint" /><input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search words, meanings or synonyms" aria-label="Search vocabulary" /></div>
          <div className="grid gap-2 md:grid-cols-2">{list.map((v) => <Card key={v.w} className="!p-3.5"><div className="flex items-baseline gap-2"><h2 className="font-display text-lg font-bold">{v.w}</h2><span className="text-xs italic text-muted">{v.pos}</span>{srs[v.w]?.reps >= 2 && <Badge tone="ok">Learned</Badge>}{srs[v.w]?.lapses > 0 && <Badge tone="warn">Tricky</Badge>}</div><p className="text-sm">{v.def}</p><p className="mt-1 font-serif text-sm text-muted">“{v.ex}”</p><p className="mt-1 text-xs text-faint">Similar: {v.syn.join(', ')}{v.nuance ? ` · ${v.nuance}` : ''}</p></Card>)}</div>
        </div>
      )}
    </div>
  );
}

export function ReferencePage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const saveNote = useStore((s) => s.saveNote);
  const [saved, setSaved] = useState<string[]>([]);
  const list = REFERENCE.filter((e) => (cat === 'All' || e.cat === cat) && (!q.trim() || `${e.title} ${e.body} ${e.cat}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader eyebrow="Tools" title="Formula & Grammar Reference" subtitle="Math formulas, algebra and geometry rules, punctuation, grammar, transitions and reading strategies in one searchable sheet." actions={<button className="btn-ghost no-print" onClick={() => window.print()}>Print</button>} />
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-faint" /><input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: slope, vertex, colon, percent…" aria-label="Search reference" /></div>
        <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option>All</option>{REF_CATS.map((c) => <option key={c}>{c}</option>)}</select>
      </div>
      {(cat === 'All' ? REF_CATS : [cat]).map((c) => { const items = list.filter((e) => e.cat === c); if (!items.length) return null; return (
        <section key={c} className="mb-5"><h2 className="mb-2 text-lg font-bold">{c}</h2>
          <div className="grid gap-2 md:grid-cols-2">{items.map((e) => <Card key={e.id} id={e.id} className="scroll-mt-20 !p-3.5"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{e.title}</h3><button className="no-print text-xs text-brand2 hover:underline" disabled={saved.includes(e.id)} onClick={() => { saveNote({ title: e.title, body: e.body, topic: e.cat, kind: 'formula' }); setSaved((s) => [...s, e.id]); }}>{saved.includes(e.id) ? 'Saved' : 'Save to notes'}</button></div><div className="mt-1 text-[15px] leading-relaxed"><RichText text={e.body} /></div></Card>)}</div>
        </section>
      ); })}
      {!list.length && <Empty title="Nothing found" body="Try a simpler keyword." />}
    </div>
  );
}

const KINDS: { id: Note['kind']; label: string }[] = [{ id: 'note', label: 'Note' }, { id: 'strategy', label: 'Strategy' }, { id: 'formula', label: 'Formula' }, { id: 'lesson', label: 'Lesson bookmark' }];

export function NotesPage() {
  const sp = useSearchParams();
  const notes = useStore((s) => s.notes);
  const savedQ = useStore((s) => s.saved);
  const save = useStore((s) => s.saveNote);
  const del = useStore((s) => s.deleteNote);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const [id, setId] = useState<string | null>(sp.get('id'));
  const [filter, setFilter] = useState<'all' | Note['kind']>('all');
  const [q, setQ] = useState('');
  const cur = notes.find((n) => n.id === id);
  const [draft, setDraft] = useState<{ title: string; body: string; kind: Note['kind']; topic: string }>({ title: '', body: '', kind: 'note', topic: '' });
  const [editing, setEditing] = useState<string | null>(null);
  if (cur && editing !== cur.id) { setEditing(cur.id); setDraft({ title: cur.title, body: cur.body, kind: cur.kind, topic: cur.topic ?? '' }); }
  const list = notes.filter((n) => (filter === 'all' || n.kind === filter) && (!q.trim() || `${n.title} ${n.body} ${n.topic ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const blank = () => { setId(null); setEditing(null); setDraft({ title: '', body: '', kind: 'note', topic: '' }); };
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Tools" title="Personal Notebook" subtitle="Your own explanations, strategies, formulas, bookmarked lessons and saved questions. Notes stay on this device and are never included in shared progress summaries." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="self-start !p-3">
          <button className="btn-primary w-full" onClick={blank}><Plus size={16} />New note</button>
          <input className="input mt-2" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search notes" />
          <div className="mt-2 flex flex-wrap gap-1">{(['all', ...KINDS.map((k) => k.id)] as const).map((k) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={cn('chip', filter === k && 'border-brand bg-brand/15 text-ink')}>{k === 'all' ? 'All' : KINDS.find((x) => x.id === k)!.label}</button>)}</div>
          <ul className="mt-2 max-h-[46vh] space-y-0.5 overflow-y-auto">
            {list.map((n) => <li key={n.id}><button onClick={() => setId(n.id)} className={cn('w-full rounded-lg px-2 py-1.5 text-left', id === n.id ? 'bg-brand/15' : 'hover:bg-raised')}><div className="truncate text-sm font-medium">{n.title}</div><div className="truncate text-xs text-muted">{KINDS.find((k) => k.id === n.kind)?.label} · {new Date(n.updatedAt).toLocaleDateString()}</div></button></li>)}
            {!list.length && <li className="px-2 py-4 text-xs text-muted">No notes yet. Add one here, or use “Add to my notebook” after any question.</li>}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!draft.title.trim()) return; const nid = save({ id: cur?.id, title: draft.title.trim(), body: draft.body, kind: draft.kind, topic: draft.topic || undefined }); setId(nid); setEditing(nid); }}>
              <input className="input text-lg font-semibold" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Note title" data-testid="note-title" />
              <div className="flex flex-wrap gap-2"><select className="input !w-auto" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Note['kind'] })} aria-label="Note type">{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select><input className="input !w-auto flex-1" placeholder="Topic (optional)" value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} aria-label="Topic" /></div>
              <textarea className="input min-h-56 font-mono text-[13px] leading-relaxed" placeholder="Write your explanation, strategy or formula. Use $...$ for math." value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} aria-label="Note body" data-testid="note-body" />
              {draft.body.includes('$') && <div className="rounded-xl border border-line bg-raised/40 p-3 text-sm"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-faint">Preview</div><RichText block text={draft.body} className="whitespace-pre-line" /></div>}
              <div className="flex flex-wrap gap-2"><button className="btn-primary" data-testid="save-note">{cur ? 'Save changes' : 'Save note'}</button>{cur?.qid && <Link href={`/practice/session?mode=single&ids=${cur.qid}&back=/notes`} className="btn-ghost">Open linked question</Link>}{cur?.kind === 'lesson' && cur.topic && SKILL[cur.topic as SkillId] && <Link href={`/learn/${cur.topic}`} className="btn-ghost">Open lesson</Link>}{cur && <button type="button" className="btn-quiet ml-auto text-bad" onClick={() => { if (confirm('Delete this note?')) { del(cur.id); blank(); } }}><Trash2 size={15} />Delete</button>}</div>
            </form>
          </Card>
          <Card>
            <h2 className="font-semibold">Saved questions ({savedQ.length})</h2>
            {savedQ.length ? <><ul className="mt-2 divide-y divide-line">{savedQ.map((qid) => { const x = getQuestion(qid); if (!x) return null; return <li key={qid} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate">{SKILL[x.skill].short} · <span className="text-muted">{x.sub}</span></span><Link href={`/practice/session?mode=single&ids=${qid}&back=/notes`} className="text-brand2 hover:underline">Open</Link><button className="text-faint hover:text-bad" onClick={() => toggleSaved(qid)} aria-label="Remove saved question"><Trash2 size={14} /></button></li>; })}</ul><Link href="/practice/session?mode=saved&back=/notes" className="btn-ghost mt-3">Practice all saved</Link></> : <p className="mt-1 text-sm text-muted">Use the bookmark icon on any question to save it here.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ResourcesPage() {
  const [q, setQ] = useState('');
  const [sec, setSec] = useState<'All' | 'Math' | 'Reading & Writing' | 'Both'>('All');
  const list = RESOURCES.filter((r) => (sec === 'All' || r.section === sec) && (!q.trim() || `${r.name} ${r.domain ?? ''} ${r.provider} ${r.opens}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Tools" title="Official SAT Resources" subtitle="Stellify's questions are original. For official questions and official scores, use the sources below. Stellify links to them and never copies or republishes College Board material." />
      <Card className="border-warn/40 text-sm text-muted"><b className="text-ink">Verification status.</b> These addresses were compiled from the College Board&apos;s and Khan Academy&apos;s published site structure, but the environment that built this file had no access to those sites, so the links were not opened and checked. Each entry therefore shows “not yet verified.” If one has moved, start from satsuite.collegeboard.org/practice.</Card>
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[220px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-faint" /><input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resources or domains" aria-label="Search resources" /></div><Tabs label="Section" value={sec} onChange={setSec} tabs={(['All', 'Both', 'Reading & Writing', 'Math'] as const).map((s) => ({ id: s, label: s }))} /></div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((r) => (
          <Card key={r.id} className="!p-4" data-testid="resource">
            <div className="flex flex-wrap items-center gap-1.5"><Badge tone="brand">{r.section}</Badge>{r.domain && <Badge>{r.domain}</Badge>}<span className="text-xs text-faint">{r.provider}</span></div>
            <h2 className="mt-2 font-semibold">{r.name}</h2>
            <dl className="mt-1.5 space-y-1 text-sm text-muted"><div><dt className="inline font-semibold text-ink">Opens: </dt><dd className="inline">{r.opens}</dd></div><div><dt className="inline font-semibold text-ink">Access: </dt><dd className="inline">{r.access}</dd></div>{r.difficulty && <div><dt className="inline font-semibold text-ink">Difficulty: </dt><dd className="inline">{r.difficulty}</dd></div>}<div><dt className="inline font-semibold text-ink">Link verified: </dt><dd className="inline">{r.verifiedOn ?? 'not yet verified'}</dd></div></dl>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3 !py-1.5">Open official site<ExternalLink size={14} /></a>
            <div className="mt-1 break-all text-[11px] text-faint">{r.url}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
