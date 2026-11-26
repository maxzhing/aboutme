'use client';
import Link from 'next/link';
import { ArrowLeft, Check, Ear, Music, PenLine, Piano, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { STUDIO_EXERCISES } from '@/data/music/studio';
import { EAR_KINDS, makeEar, type EarKind, type EarQ } from '@/lib/music/ear';
import { playChord, playSeq, stopAll } from '@/lib/music/synth';
import {
  CHORD_WORDS, identify, ivName, ivWords, isConsonant, keyFromFifths, keyName, midi, romanOf, scale, semitones, show, simpleName, spell,
  type Key, type ScaleKind,
} from '@/lib/music/theory';
import { Keyboard, ListenButton, TaskView } from '@/components/music/MusicBits';
import { StaffPad, type Clef } from '@/components/music/Staff';
import { useStore } from '@/lib/store';
import { sfx } from '@/lib/sfx';
import { Badge, Card, PageHeader, Tabs, cn } from '@/components/ui';

type Tab = 'write' | 'ear' | 'parts' | 'keys';
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const spellMidi = (m: number, flats: boolean) => `${(flats ? FLATS : SHARPS)[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const KEYS: Key[] = [...Array.from({ length: 15 }, (_, i) => keyFromFifths(i - 7, 'major')), ...Array.from({ length: 15 }, (_, i) => keyFromFifths(i - 7, 'minor'))];

/** read a session-scoped convenience value (never required for the page to work) */
const load = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) ?? '[]'); } catch { return []; } };
const save = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

/** The Music Studio: write and hear anything, train your ear, and practise four-part writing with instant checking. */
export function StudioPage() {
  const [tab, setTab] = useState<Tab>('write');
  useEffect(() => () => stopAll(), []);
  return (
    <div className="mx-auto max-w-5xl space-y-5" data-testid="studio">
      <Link href="/music" className="btn-quiet !px-2 text-sm"><ArrowLeft size={16} />AP Music Theory</Link>
      <PageHeader eyebrow="AP Music Theory" title="Music Studio" subtitle="Hands-on practice for the whole course. Write notes and chords and the studio names them, train your ear with endless generated questions, and write four-part harmony that is checked rule by rule. Everything plays through your speakers, even offline." />
      <Tabs label="Studio tools" value={tab} onChange={setTab} tabs={[{ id: 'write', label: 'Write and hear' }, { id: 'ear', label: 'Ear training' }, { id: 'parts', label: 'Part writing' }, { id: 'keys', label: 'Scale explorer' }]} />
      {tab === 'write' && <WritePanel />}
      {tab === 'ear' && <EarPanel />}
      {tab === 'parts' && <PartsPanel />}
      {tab === 'keys' && <KeysPanel />}
    </div>
  );
}

function WritePanel() {
  const [clef, setClef] = useState<Clef>('treble');
  const [notes, setNotes] = useState<string[]>(['C4', 'E4', 'G4']);
  const [key, setKey] = useState(7); // C major
  const [flats, setFlats] = useState(false);
  const k = KEYS[key];
  const sorted = [...notes].sort((a, b) => midi(a) - midi(b));
  const analysis = useMemo(() => analyse(sorted, k), [sorted.join(), k.tonic, k.mode]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold"><PenLine size={18} className="text-accent" />Write anything</h2>
          <div className="flex gap-1" role="radiogroup" aria-label="Clef">{(['treble', 'bass', 'alto'] as Clef[]).map((c) => <button key={c} type="button" role="radio" aria-checked={clef === c} onClick={() => { setClef(c); setNotes([]); }} className={cn('rounded-xl border px-3 py-1.5 text-sm font-semibold capitalize', clef === c ? 'border-accent bg-accent/15 text-ink' : 'border-line text-muted hover:border-accent/50')}>{c}</button>)}</div>
        </div>
        <p className="text-sm text-muted">Click the staff to add a note (click it again to remove it). Choose a sharp or flat first for an altered note. Up to six notes.</p>
        <StaffPad clef={clef} mode="chord" value={notes} onChange={setNotes} maxNotes={6} label="Free writing staff" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={!notes.length} onClick={() => playChord(sorted, 1.8)} data-testid="studio-play"><Volume2 size={16} />Play together</button>
          <button type="button" className="btn-ghost" disabled={!notes.length} onClick={() => playSeq(sorted, { tempo: 140 })}><Play size={15} />Play one by one</button>
          <button type="button" className="btn-quiet" disabled={!notes.length} onClick={() => setNotes([])}><RotateCcw size={15} />Clear</button>
        </div>
        <div className="border-t border-line pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Or play the keyboard to add notes</span><label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={flats} onChange={(e) => setFlats(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />Spell black keys as flats</label></div>
          <Keyboard from={clef === 'bass' ? 36 : clef === 'alto' ? 48 : 55} octaves={2} highlight={notes} label="Keyboard: click a key to add or remove that note" onKey={(m) => { const p = spellMidi(m, flats); const at = notes.findIndex((n) => midi(n) === m); if (at >= 0) setNotes(notes.filter((_, i) => i !== at)); else if (notes.length < 6) setNotes([...notes, p]); }} />
        </div>
      </Card>
      <Card className="space-y-3 self-start" data-testid="studio-analysis">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles size={18} className="text-gold" />What you wrote</h2>
        <label className="block text-sm"><span className="label">Key (for Roman numerals)</span>
          <select className="input" value={key} onChange={(e) => setKey(Number(e.target.value))}>{KEYS.map((x, i) => <option key={i} value={i}>{keyName(x)}</option>)}</select>
        </label>
        {analysis.map((line, i) => <p key={i} className={cn('rounded-xl border p-3 text-sm leading-relaxed', i === 0 ? 'border-accent/40 bg-accent/[.07] font-semibold' : 'border-line bg-raised/40')}>{line}</p>)}
      </Card>
    </div>
  );
}

/** Plain-words analysis of a set of notes. */
export function analyse(sorted: string[], k: Key): string[] {
  if (!sorted.length) return ['Nothing written yet. Add a note or two.'];
  if (sorted.length === 1) return [`${show(sorted[0])}`, `Frequency about ${Math.round(440 * 2 ** ((midi(sorted[0]) - 69) / 12))} Hz.`];
  if (sorted.length === 2) {
    let iv: string;
    try { iv = ivName(sorted[0], sorted[1]); } catch { return ['Those two notes are too far apart to name.']; }
    const simple = simpleName(iv);
    return [`${ivWords(iv)} (${iv})`, `${semitones(iv)} half steps. ${isConsonant(simple) ? 'A consonance' : 'A dissonance'}${simple !== iv ? `; it is a compound ${ivWords(simple)}` : ''}.`];
  }
  const id = identify(sorted);
  if (!id) return ['Not a triad or seventh chord.', `Notes: ${sorted.map((n) => show(n)).join(', ')}. A triad stacks a root, third and fifth; a seventh chord adds a 7th.`];
  const inv = ['root position', 'first inversion', 'second inversion', 'third inversion'][id.inversion];
  const rn = romanOf(sorted, k);
  const above = sorted.slice(1).map((n) => { try { return simpleName(ivName(sorted[0], n)).replace(/\D/g, ''); } catch { return '?'; } });
  return [
    `${show(id.root, false)} ${CHORD_WORDS[id.q]}${id.q.length === 1 ? ' triad' : ' chord'}, ${inv}`,
    rn ? `In ${keyName(k)}: ${rn.replace(/o/g, '°')}` : `It is not a diatonic or secondary chord in ${keyName(k)}.`,
    `Intervals above the bass: ${[...new Set(above)].sort((a, b) => Number(b) - Number(a)).join(', ')}${id.figure ? ` (figured bass ${id.figure.split('').join('/')})` : ''}.`,
  ];
}

function EarPanel() {
  const [kind, setKind] = useState<EarKind>('interval');
  const [q, setQ] = useState<EarQ>(() => makeEar('interval'));
  const [picked, setPicked] = useState<number | null>(null);
  const [stats, setStats] = useState({ right: 0, total: 0, streak: 0, best: 0 });
  const [round, setRound] = useState(0);
  const [awarded, setAwarded] = useState(false);
  const award = useStore((s) => s.awardXp);
  const next = (k = kind) => { stopAll(); setQ(makeEar(k)); setPicked(null); };
  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.answer;
    sfx(ok ? 'correct' : 'wrong');
    setStats((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0, best: Math.max(s.best, ok ? s.streak + 1 : 0) }));
    setRound((r) => r + 1);
  };
  const roundDone = round >= 10;
  useEffect(() => {
    if (roundDone && !awarded) { setAwarded(true); if (stats.right > 0) award(Math.min(20, stats.right * 2), `Ear training: ${stats.right}/${stats.total}`); }
  }, [roundDone]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="What to train">{EAR_KINDS.map((x) => <button key={x.id} type="button" role="radio" aria-checked={kind === x.id} onClick={() => { setKind(x.id); next(x.id); }} className={cn('chip !px-3 !py-1.5 text-sm', kind === x.id && 'border-accent bg-accent/15 !text-ink')}>{x.label}</button>)}</div>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Card className="space-y-4" data-testid="ear-card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Ear size={18} className="text-accent" />{q.prompt}</h2>
          <div><ListenButton key={q.explain + q.answer} spec={q.listen} label="Play" primary /></div>
          <div className="grid gap-2 sm:grid-cols-2">{q.choices.map((c, i) => { const right = picked !== null && i === q.answer; const wrong = picked === i && i !== q.answer; return (
            <button key={c} type="button" data-choice={'ABCD'[i]} disabled={picked !== null} onClick={() => choose(i)} className={cn('flex items-center gap-3 rounded-xl border px-3 py-3 text-left font-semibold', right ? 'border-ok bg-ok/10' : wrong ? 'border-bad bg-bad/10' : 'border-line hover:border-accent/60')} data-testid="ear-choice">
              <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs', right ? 'border-ok bg-ok text-white' : wrong ? 'border-bad bg-bad text-white' : 'border-line text-muted')}>{right ? <Check size={14} /> : 'ABCD'[i]}</span>{c}
            </button>
          ); })}</div>
          {picked !== null && (
            <div className={cn('rounded-xl border p-3 text-sm', picked === q.answer ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10')} aria-live="polite" data-testid="ear-result">
              <b className={picked === q.answer ? 'text-ok' : 'text-bad'}>{picked === q.answer ? 'Correct!' : `It was: ${q.choices[q.answer]}.`}</b> {q.explain}
              <div className="mt-2 flex flex-wrap gap-2"><ListenButton spec={q.listen} label="Hear it again" /><button type="button" className="btn-primary !py-1.5 text-sm" onClick={() => next()} data-testid="ear-next">Next question</button></div>
            </div>
          )}
        </Card>
        <Card className="space-y-2 self-start">
          <h3 className="font-bold">This session</h3>
          <p className="font-display text-3xl font-bold tabular-nums" data-testid="ear-score">{stats.right}/{stats.total}</p>
          <p className="text-sm text-muted">Streak {stats.streak} · best {stats.best}</p>
          {roundDone ? <p className="rounded-xl border border-ok/40 bg-ok/10 p-2 text-sm">Round of 10 done{stats.right ? `: +${Math.min(20, stats.right * 2)} XP for your companion` : ''}. Keep going as long as you like.</p> : <p className="text-xs text-muted">Answer 10 questions to earn XP (2 per correct answer, up to 20).</p>}
        </Card>
      </div>
    </div>
  );
}

function PartsPanel() {
  const [sel, setSel] = useState(0);
  const [done, setDone] = useState<string[]>(() => load('stellify-studio-parts'));
  const award = useStore((s) => s.awardXp);
  const ex = STUDIO_EXERCISES[sel];
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <ol className="space-y-2" aria-label="Part-writing exercises">{STUDIO_EXERCISES.map((x, i) => (
        <li key={x.id}><button type="button" onClick={() => setSel(i)} aria-current={sel === i} className={cn('flex w-full items-start gap-3 rounded-2xl border p-3 text-left', sel === i ? 'border-accent bg-accent/[.07]' : 'border-line bg-surface hover:border-accent/50')} data-testid={`pw-${i + 1}`}>
          <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold', done.includes(x.id) ? 'bg-ok text-white' : 'bg-raised text-muted')}>{done.includes(x.id) ? <Check size={14} /> : i + 1}</span>
          <span className="min-w-0"><span className="block text-sm font-semibold leading-snug">{x.title}</span><span className="text-xs text-muted">{x.level}</span></span>
        </button></li>
      ))}</ol>
      <Card className="space-y-3" data-testid="pw-card">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{ex.title}</h2><Badge tone={ex.level === 'Challenge' ? 'bad' : ex.level === 'AP level' ? 'warn' : 'ok'}>{ex.level}</Badge></div>
        <p className="text-sm text-muted">{ex.brief} The engine checks spelling, doubling, ranges, spacing, crossing, overlap, parallels and the resolution of tendency tones.</p>
        <TaskView key={ex.id} task={ex.task} onDone={(ok) => { if (ok && !done.includes(ex.id)) { const nd = [...done, ex.id]; setDone(nd); save('stellify-studio-parts', nd); award(15, `Part writing: ${ex.title}`); } }} />
      </Card>
    </div>
  );
}

const SCALE_KINDS: { id: ScaleKind; label: string }[] = [
  { id: 'major', label: 'Major' }, { id: 'natural', label: 'Natural minor' }, { id: 'harmonic', label: 'Harmonic minor' }, { id: 'melodic', label: 'Melodic minor' },
  { id: 'dorian', label: 'Dorian' }, { id: 'phrygian', label: 'Phrygian' }, { id: 'lydian', label: 'Lydian' }, { id: 'mixolydian', label: 'Mixolydian' }, { id: 'locrian', label: 'Locrian' },
];
const TONICS = ['C4', 'G4', 'D4', 'A3', 'E4', 'B3', 'F#4', 'F4', 'Bb3', 'Eb4', 'Ab3', 'Db4', 'C#4', 'G#3'];
function KeysPanel() {
  const [tonic, setTonic] = useState('C4');
  const [kind, setKind] = useState<ScaleKind>('major');
  const notes = scale(tonic, kind).map(spell);
  return (
    <Card className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold"><Piano size={18} className="text-accent" />Scale explorer</h2>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm"><span className="label">Tonic</span><select className="input !w-32" value={tonic} onChange={(e) => setTonic(e.target.value)}>{TONICS.map((t) => <option key={t} value={t}>{show(t, false)}</option>)}</select></label>
        <label className="text-sm"><span className="label">Scale or mode</span><select className="input !w-52" value={kind} onChange={(e) => setKind(e.target.value as ScaleKind)}>{SCALE_KINDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <button type="button" className="btn-primary self-end" onClick={() => playSeq(notes, { tempo: 120 })}><Music size={16} />Play the scale</button>
      </div>
      <p className="font-display text-xl font-bold" data-testid="scale-notes">{notes.map((n) => show(n, false)).join(' ')}</p>
      <Keyboard from={midi(tonic) - (((midi(tonic) % 12) + 12) % 12)} octaves={2} highlight={notes} label={`${show(tonic, false)} ${SCALE_KINDS.find((s) => s.id === kind)!.label} on the keyboard`} />
      <p className="text-sm text-muted">Highlighted keys are the scale. Click any key to hear it.</p>
    </Card>
  );
}
