import Link from 'next/link';
import { Bot, CheckCircle2, ChevronDown, NotebookPen, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LESSON } from '@/data/lessons';
import { GRAMMAR } from '@/data/grammar';
import { QUESTIONS, questionsBySkill } from '@/data/questions';
import { useStore } from '@/lib/store';
import { useSkillStats } from '@/lib/hooks';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';
import { DIFFICULTIES, DIFFICULTY_NAME, DOMAIN, DOMAINS, SECTION_NAME, SKILL, SKILLS, skillsOfDomain } from '@/lib/taxonomy';
import { pct } from '@/lib/util';
import type { Section, SkillId } from '@/lib/types';
import { RichText } from '@/components/RichText';
import { Badge, Card, Empty, PageHeader, Progress, Tabs, toneForPct } from '@/components/ui';

const LEVEL_TONE = ['default', 'bad', 'warn', 'brand', 'ok'] as const;

export function CurriculumPage({ section }: { section?: Section }) {
  const stats = useSkillStats();
  const lessonsDone = useStore((s) => s.lessonsDone);
  const domains = DOMAINS.filter((d) => !section || d.section === section);
  const skills = SKILLS.filter((k) => !section || k.section === section);
  const mastered = skills.filter((k) => stats[k.id].level >= 3).length;
  return (
    <div>
      <PageHeader eyebrow="Learn" title={section ? `${SECTION_NAME[section]} Academy` : 'Complete Curriculum'}
        subtitle={`Every skill on the Digital SAT, organized by the official domains. Each lesson has a plain-language start, the full rules, worked examples, common mistakes, shortcuts, and practice at three difficulty levels. ${mastered} of ${skills.length} skills at Proficient or higher.`}
        actions={<>{section !== 'math' && <Link href="/learn/math" className="btn-ghost">Math Academy</Link>}{section !== 'rw' && <Link href="/learn/rw" className="btn-ghost">Reading &amp; Writing Academy</Link>}{section && <Link href="/learn" className="btn-ghost">All</Link>}</>} />
      <div className="space-y-6">
        {domains.map((d) => (
          <section key={d.id} aria-label={d.name}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-3"><h2 className="text-lg font-bold">{d.name}</h2><span className="text-xs text-muted">{SECTION_NAME[d.section]} · about {Math.round(d.weight * 100)}% of the section · {d.blurb}</span></div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {skillsOfDomain(d.id).map((k) => { const st = stats[k.id]; const total = questionsBySkill(k.id).length; return (
                <Link key={k.id} href={`/learn/${k.id}`} className="card flex flex-col p-4 hover:border-brand/60" data-testid={`skill-${k.id}`}>
                  <div className="flex items-start justify-between gap-2"><h3 className="font-semibold leading-snug">{k.name}</h3>{lessonsDone[k.id] && <CheckCircle2 size={17} className="shrink-0 text-ok" aria-label="Lesson completed" />}</div>
                  <div className="mt-2 flex items-center gap-2"><Badge tone={LEVEL_TONE[st.level]}>{MASTERY_LEVELS[st.level]}</Badge><span className="text-xs text-muted">{st.n ? `${pct(st.correct, st.n)}% over ${st.n}` : `${total} questions`}</span></div>
                  <Progress value={st.n ? st.score : 0} className="mt-2.5" tone={st.level >= 3 ? 'ok' : 'brand'} label={`${k.short} mastery`} />
                  <p className="mt-2.5 line-clamp-2 text-xs text-muted">{k.topics.join(' · ')}</p>
                </Link>
              ); })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function LessonPage({ skill }: { skill: string }) {
  const stats = useSkillStats();
  const done = useStore((s) => s.lessonsDone[skill]);
  const complete = useStore((s) => s.completeLesson);
  const saveNote = useStore((s) => s.saveNote);
  const [open, setOpen] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const info = SKILL[skill as SkillId];
  if (!info) return <Empty title="Lesson not found" body="That skill does not exist." action={{ label: 'Back to the curriculum', href: '/learn' }} />;
  const l = LESSON[info.id];
  const st = stats[info.id];
  const bank = questionsBySkill(info.id);
  const rules = GRAMMAR.filter((g) => g.skill === info.id);
  const Section_ = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <Card><h2 className="mb-2 flex items-center gap-2.5 text-lg font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-sm text-brand">{n}</span>{title}</h2><div className="prose-q space-y-3">{children}</div></Card>
  );
  return (
    <div>
      <PageHeader eyebrow={`${SECTION_NAME[info.section]} · ${DOMAIN[info.domain].name}`} title={info.name}
        actions={<><Link href={`/practice/session?mode=skill&skill=${info.id}&n=8`} className="btn-primary">Practice this skill</Link><Link href={info.section === 'math' ? '/learn/math' : '/learn/rw'} className="btn-ghost">All {SECTION_NAME[info.section]} skills</Link></>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Section_ n={1} title="Start here"><p><RichText text={l.intro} /></p></Section_>
          <Section_ n={2} title="The full explanation">{l.detail.map((p, i) => <p key={i}><RichText text={p} /></p>)}</Section_>
          <Section_ n={3} title="Important rules"><ul className="space-y-2">{l.rules.map((r, i) => <li key={i} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span><RichText text={r} /></span></li>)}</ul></Section_>
          <Section_ n={4} title="Worked examples">
            {l.examples.map((e, i) => (
              <div key={i} className="rounded-xl border border-line">
                <button className="flex w-full items-start justify-between gap-3 p-3.5 text-left" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}><span><b className="text-brand2">Example {i + 1}.</b> <RichText text={e.q} /></span><ChevronDown size={18} className={`mt-1 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} /></button>
                {open === i && <div className="border-t border-line bg-raised/40 p-3.5"><b>Solution.</b> <RichText text={e.a} /></div>}
              </div>
            ))}
            <p className="text-xs text-faint">Try each example yourself before opening the solution.</p>
          </Section_>
          <Section_ n={5} title="Common mistakes"><ul className="space-y-2">{l.mistakes.map((r, i) => <li key={i} className="flex gap-2.5"><span className="font-bold text-bad">✗</span><span><RichText text={r} /></span></li>)}</ul></Section_>
          <Section_ n={6} title="SAT shortcuts"><ul className="space-y-2">{l.shortcuts.map((r, i) => <li key={i} className="flex gap-2.5"><span className="font-bold text-gold">★</span><span><RichText text={r} /></span></li>)}</ul></Section_>
          {rules.length > 0 && <Card><h2 className="mb-2 text-lg font-bold">Related grammar rules</h2><div className="flex flex-wrap gap-2">{rules.map((g) => <Link key={g.id} href={`/grammar#${g.id}`} className="chip !py-1 hover:text-ink">{g.title}</Link>)}</div></Card>}
          <Card>
            <h2 className="mb-1 text-lg font-bold">Practice by difficulty</h2>
            <p className="text-sm text-muted">Work upward. Mastery requires success on hard and very hard questions, not just medium ones.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {DIFFICULTIES.map((d) => { const n = bank.filter((q) => q.difficulty === d).length; const b = st.byDiff[d]; return (
                <Link key={d} href={`/practice/session?mode=lesson&skill=${info.id}&diff=${d}&n=${Math.min(n, 8)}`} className="rounded-xl border border-line p-3.5 hover:border-brand/60" data-testid={`lesson-practice-${d}`}>
                  <div className="font-semibold">{DIFFICULTY_NAME[d]}</div><div className="text-xs text-muted">{n} question{n === 1 ? '' : 's'}</div>
                  <div className="mt-2 text-xs">{b.n ? <Badge tone={toneForPct(pct(b.correct, b.n))}>{b.correct}/{b.n} correct</Badge> : <span className="text-faint">Not attempted</span>}</div>
                </Link>
              ); })}
            </div>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card>
            <h2 className="font-bold">Mastery</h2>
            <div className="mt-2 flex items-center gap-2"><Badge tone={LEVEL_TONE[st.level]}>{MASTERY_LEVELS[st.level]}</Badge><span className="text-sm text-muted">{st.n ? `${pct(st.correct, st.n)}% over ${st.n}` : 'No attempts yet'}</span></div>
            <ol className="mt-3 flex gap-1" aria-label="Mastery levels">{MASTERY_LEVELS.map((m, i) => <li key={m} className={`h-2 flex-1 rounded-full ${i <= st.level && st.level > 0 ? 'bg-gradient-to-r from-brand to-brand2' : 'bg-raised'}`} title={m} />)}</ol>
            <p className="mt-3 text-sm"><b>Next:</b> <span className="text-muted">{st.next}</span></p>
            <p className="mt-2 text-xs text-faint">Based on your last 12 attempts in this skill. Answers that needed all three hints do not count as independent.</p>
          </Card>
          <Card>
            <h2 className="font-bold">This lesson</h2>
            <button className={done ? 'btn-ghost mt-3 w-full' : 'btn-primary mt-3 w-full'} onClick={() => complete(info.id)} data-testid="complete-lesson">{done ? <><CheckCircle2 size={16} className="text-ok" />Completed</> : 'Mark lesson complete (+40 XP)'}</button>
            <button className="btn-ghost mt-2 w-full" disabled={bookmarked} onClick={() => { saveNote({ title: `Lesson: ${info.name}`, body: `${l.intro}\n\nKey rules:\n${l.rules.map((r) => `• ${r}`).join('\n')}`, topic: info.id, kind: 'lesson' }); setBookmarked(true); }}><NotebookPen size={16} />{bookmarked ? 'Saved to notebook' : 'Bookmark to my notebook'}</button>
            <Link href={`/tutor?topic=${info.id}`} className="btn-ghost mt-2 w-full"><Bot size={16} />Ask the tutor about this</Link>
          </Card>
          <Card><h2 className="font-bold">Topics covered</h2><div className="mt-2 flex flex-wrap gap-1.5">{info.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div></Card>
        </aside>
      </div>
    </div>
  );
}

export function GrammarPage() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<'All' | (typeof GRAMMAR)[number]['group']>('All');
  const list = useMemo(() => GRAMMAR.filter((g) => (group === 'All' || g.group === group) && (!q.trim() || `${g.title} ${g.rule} ${g.why} ${g.trap} ${g.correct.join(' ')} ${g.subs.join(' ')}`.toLowerCase().includes(q.toLowerCase()))), [q, group]);
  const groups = ['All', 'Punctuation', 'Sentence structure', 'Grammar', 'Advanced'] as const;
  return (
    <div>
      <PageHeader eyebrow="Learn" title="Grammar Masterclass" subtitle={`${GRAMMAR.length} rules covering everything Standard English Conventions tests: the rule, why it exists, correct and incorrect examples, how the SAT tests it, and the trap to avoid.`}
        actions={<><Link href="/learn/bnd" className="btn-ghost">Boundaries lesson</Link><Link href="/learn/fss" className="btn-ghost">Form, Structure &amp; Sense lesson</Link></>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-faint" /><input className="input pl-9" placeholder="Search rules: comma, semicolon, modifier, its…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search grammar rules" /></div>
        <Tabs label="Rule group" tabs={groups.map((g) => ({ id: g, label: g }))} value={group} onChange={setGroup} />
      </div>
      <div className="space-y-3">
        {list.map((g) => { const ids = QUESTIONS.filter((x) => x.skill === g.skill && g.subs.includes(x.sub)).map((x) => x.id); return (
          <Card key={g.id} id={g.id} className="scroll-mt-20">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{g.title}</h2><Badge>{g.group}</Badge></div>
            <p className="mt-2"><b>Rule.</b> {g.rule}</p>
            <p className="mt-1.5 text-sm text-muted"><b className="text-ink">Why.</b> {g.why}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-ok/30 bg-ok/5 p-3"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-ok">Correct</div><ul className="space-y-1 font-serif text-[15px]">{g.correct.map((c) => <li key={c}>✓ {c}</li>)}</ul></div>
              <div className="rounded-xl border border-bad/30 bg-bad/5 p-3"><div className="mb-1 text-xs font-bold uppercase tracking-wide text-bad">Incorrect</div><ul className="space-y-1 font-serif text-[15px]">{g.incorrect.map((c) => <li key={c}>✗ {c}</li>)}</ul></div>
            </div>
            <p className="mt-3 text-sm"><b>On the SAT.</b> <span className="text-muted">{g.sat}</span></p>
            <p className="mt-1 text-sm"><b className="text-bad">Trap.</b> <span className="text-muted">{g.trap}</span></p>
            {ids.length > 0 && <Link href={`/practice/session?mode=custom&ids=${ids.slice(0, 8).join(',')}&back=/grammar`} className="mt-3 inline-block text-sm font-semibold text-brand2 hover:underline">Practice this rule ({Math.min(8, ids.length)} questions) →</Link>}
          </Card>
        ); })}
        {!list.length && <Empty title="No rules match" body="Try a different word, such as “comma” or “pronoun.”" />}
      </div>
    </div>
  );
}
