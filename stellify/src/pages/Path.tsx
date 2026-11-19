'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, List, Route } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LessonPath, Stars, type HexInfo } from '@/components/HexMap';
import { LeverChart } from '@/components/LeverChart';
import { SessionRunner } from '@/components/SessionRunner';
import { CoachToday, useCoach } from '@/components/Coach';
import { Card, Empty, Modal, PageHeader, cn } from '@/components/ui';
import { getQuestion, QUESTIONS } from '@/data/questions';
import { WORKED_BY_SKILL } from '@/data/worked';
import { useOverview, useWeekRhythm } from '@/lib/hooks';
import { engineInput, CHAPTER_IDS } from '@/lib/path/input';
import { formatFor, hexState, nextStep, prereqsMet, skillStars, todayPlan, upcomingSkills } from '@/lib/path/next';
import { pickSet } from '@/lib/path/sets';
import { PATH, PATH_SKILLS, pathOf } from '@/lib/path/skills';
import { SET_RULES } from '@/lib/path/stars';
import { snapshot, useStore } from '@/lib/store';
import { DOMAIN, SECTION_NAME } from '@/lib/taxonomy';
import type { PathSetKind, PathSetResult, Section, SkillId } from '@/lib/types';
import { MASTERY_LEVELS } from '@/lib/engine/mastery';

const VIEW_KEY = 'stellify-path-view';
const readView = (): 'map' | 'list' => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'map'; } catch { return 'map'; } };

/** Everything the Path page and the dashboard need, recomputed when progress changes. */
export function usePathModel(section?: Section) {
  const s = useStore();
  const ov = useOverview();
  const level = { math: ov.estimate.math?.mid, rw: ov.estimate.rw?.mid };
  const key = `${s.attempts.length}|${JSON.stringify(s.path?.stars)}|${s.path?.sets.length}|${Object.keys(s.chapters).length}|${Object.keys(s.srs).length}|${Object.keys(s.path?.worked ?? {}).length}`;
  return useMemo(() => {
    const now = Date.now();
    const input = engineInput(snapshot(), now, section, level);
    const next = nextStep(input);
    const today = todayPlan(input);
    const upcoming = upcomingSkills(input, 3);
    return { input, next, today, upcoming };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, section]);
}

export function PathPage({ section = 'math' }: { section?: Section }) {
  const sp = useSearchParams();
  const router = useRouter();
  const syncPath = useStore((s) => s.syncPath);
  const lastSet = useStore((s) => s.path?.sets[s.path.sets.length - 1]);
  const week = useWeekRhythm();
  useEffect(() => { syncPath(); }, [syncPath]);
  const { input, next, upcoming } = usePathModel(section);
  const coach = useCoach(1);
  const [view, setView] = useState<'map' | 'list'>(readView);
  const selected = (sp.get('skill') as SkillId | null) ?? undefined;
  // a step opens its actual lesson (the same course pages as Learn)
  const pick = (id: SkillId) => router.push(`/learn/${id}`);
  const info: Record<string, HexInfo> = Object.fromEntries(pathOf(section).map((s) => { const h = hexState(input, s.id); const rank = upcoming.indexOf(s.id); return [s.id, { state: h.state, stars: h.stars.count, due: h.due, recommended: rank === 0, rank: rank >= 0 ? rank : undefined }]; }));
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  useEffect(() => { const on = () => setNarrow(window.innerWidth < 1024); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  const closePanel = () => router.replace(`/path${section === 'rw' ? '/rw' : ''}`);
  const toggle = (v: 'map' | 'list') => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ } };
  const recent = lastSet && Date.now() - lastSet.at < 15 * 60_000 && lastSet.section === section ? lastSet : undefined;
  return (
    <div className="mx-auto max-w-5xl pb-24 sm:pb-0" data-testid="path-page">
      <PageHeader eyebrow="Path" title={`${SECTION_NAME[section]} path`} subtitle="What to do next, in order. Every skill is open; the highlighted one is the best next step. Learn is the full library."
        actions={<nav aria-label="Path section" className="flex gap-1 rounded-full border border-line bg-surface p-1">
          {(['math', 'rw'] as const).map((sec) => <Link key={sec} href={sec === 'math' ? '/path' : '/path/rw'} aria-current={sec === section ? 'page' : undefined} className={cn('rounded-full px-3.5 py-1.5 text-[14px] font-medium', sec === section ? 'bg-ink text-bg' : 'text-muted hover:text-ink')}>{SECTION_NAME[sec]}</Link>)}
        </nav>} />
      {recent && <SetResultNote r={recent} />}
      <CoachToday plan={coach} className="mb-6" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="map-h">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="map-h" className="text-[22px]">Your path</h2>
            <div className="flex gap-1" role="group" aria-label="Show the skills as">
              <button type="button" className={cn('btn-quiet !min-h-[36px] !px-3 text-[14px]', view === 'map' && '!bg-raised !text-ink')} aria-pressed={view === 'map'} onClick={() => toggle('map')} data-testid="view-map"><Route size={15} aria-hidden />Path</button>
              <button type="button" className={cn('btn-quiet !min-h-[36px] !px-3 text-[14px]', view === 'list' && '!bg-raised !text-ink')} aria-pressed={view === 'list'} onClick={() => toggle('list')} data-testid="view-list"><List size={15} aria-hidden />List</button>
            </div>
          </div>
          {view === 'map' ? (
            <>
              <LessonPath section={section} info={info} selected={selected} onSelect={pick} />
              <p className="mt-4 text-center text-[13px] text-faint">Steps go in lesson order. Coloured steps are started, grey ones are not yet, and the blue one is next. A dot means reviews are due.</p>
            </>
          ) : <SkillList section={section} info={info} onSelect={pick} />}
        </section>
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {selected && PATH[selected]?.section === section && !narrow ? <SkillPanel skill={selected} input={input} recommended={next.skill === selected} /> : (
            <Card><h2 className="text-[20px]">Next step</h2><p className="mt-1 text-[15px] font-medium">{next.title}</p><p className="mt-1 text-[14px] text-muted">{next.reason}</p><Link href={next.href} className="btn-primary mt-3" data-testid="path-next">Start<ArrowRight size={16} aria-hidden /></Link><p className="mt-3 text-[13px] text-faint">Tap any step to open its lesson. Its stars and practice sets are at the top of the lesson.</p></Card>
          )}
        </aside>
      </div>
      {narrow && selected && PATH[selected]?.section === section && <Modal open onClose={closePanel} title={PATH[selected].title}><SkillPanel skill={selected} input={input} recommended={next.skill === selected} bare /></Modal>}
      <div className="mt-6"><LeverChart rows={input.lever.filter((l) => l.section === section)} /></div>
      {/* phones: the next step is always one tap away */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg px-4 py-3 sm:hidden">
        <Link href={next.href} className="btn-primary w-full" data-testid="sticky-next"><span className="truncate">Next: {next.title}</span><ArrowRight size={16} aria-hidden /></Link>
      </div>
    </div>
  );
}

function SetResultNote({ r }: { r: PathSetResult }) {
  const name = { practice: 'Practice set', hard: 'Hard set', check: 'Skip check', gauntlet: 'Gauntlet' }[r.kind];
  return (
    <p className="mb-6 rounded border border-line bg-surface px-4 py-3 text-[15px]" role="status" data-testid="set-result">
      <b className="font-medium">{name}{r.skill ? `: ${PATH[r.skill].title}` : ''}.</b> {r.credit} of {r.n} credit{r.kind !== 'gauntlet' ? ` (pass mark ${SET_RULES[r.kind].pass})` : ''}: {r.kind === 'gauntlet' ? 'retention checks recorded.' : r.passed ? 'passed.' : r.kind === 'practice' && r.first ? 'not passed this time. ★2 can still come from reaching Proficient.' : 'not passed this time.'}
    </p>
  );
}

function SkillList({ section, info, onSelect }: { section: Section; info: Record<string, HexInfo>; onSelect: (s: SkillId) => void }) {
  const skills = [...pathOf(section)].sort((a, b) => a.order - b.order);
  const domains = [...new Set(skills.map((s) => s.domain))];
  return (
    <div className="space-y-5" data-testid="path-list">
      {domains.map((d) => (
        <section key={d} aria-label={DOMAIN[d].name}>
          <h3 className="mb-1 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{DOMAIN[d].name}</h3>
          <ul className="divide-y divide-line border-y border-line">
            {skills.filter((s) => s.domain === d).map((s) => { const h = info[s.id]; return (
              <li key={s.id}>
                <button type="button" onClick={() => onSelect(s.id)} className="flex min-h-[48px] w-full items-center gap-3 px-1 py-2 text-left hover:bg-raised/60">
                  <span className="min-w-0 flex-1"><span className="font-medium">{s.title}</span>{h.recommended && <span className="ml-2 text-[13px] font-medium text-accent">recommended next</span>}</span>
                  {h.due > 0 && <span className="text-[13px] text-warn">{h.due} due</span>}
                  <span className="hidden text-[13px] text-muted sm:inline">{{ 'not-started': 'Not started', 'in-progress': 'In progress', proficient: 'Proficient', mastered: 'Mastered' }[h.state]}</span>
                  <Stars n={h.stars} />
                </button>
              </li>
            ); })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SkillPanel({ skill, input, recommended, bare }: { skill: SkillId; input: ReturnType<typeof engineInput>; recommended: boolean; bare?: boolean }) {
  const s = PATH[skill];
  const st = skillStars(input, skill);
  const ch = CHAPTER_IDS[skill] ?? [];
  const passed = ch.filter((c) => input.chapters[c]?.passedAt).length;
  const fams = WORKED_BY_SKILL[skill] ?? [];
  const lever = input.lever.find((l) => l.skill === skill);
  const f = formatFor(input, skill);
  const open = prereqsMet(input, s);
  const row = (ok: boolean, label: string, detail: string) => (
    <li className="flex gap-2.5 py-2"><span className="mt-0.5 shrink-0" aria-hidden>{ok ? <Check size={17} className="text-ok" /> : <span className="block h-[17px] w-[17px] rounded-full border border-line" />}</span><span><b className="font-medium">{label}</b>{ok ? ' · earned' : ''}<span className="block text-[14px] text-muted">{detail}</span></span></li>
  );
  const sets: [PathSetKind, string, string][] = [
    ['practice', 'Practice set', `${SET_RULES.practice.n} questions; pass on your first try for ★2`],
    ['hard', 'Hard set', `${SET_RULES.hard.n} hard questions; counts toward ★3`],
    ...(st.count < 2 ? [['check', 'Skip check', `${SET_RULES.check.n} questions; pass to earn ★1 and ★2 at once`] as [PathSetKind, string, string]] : []),
  ];
  const Wrap = bare ? 'div' : Card;
  return (
    <Wrap data-testid="skill-panel">
      <p className="text-[13px] text-faint">{DOMAIN[s.domain].name}</p>
      {!bare && <h2 className="text-[24px] leading-tight">{s.title}</h2>}
      <p className="mt-1 flex items-center gap-2 text-[14px] text-muted"><Stars n={st.count} size={16} />{MASTERY_LEVELS[input.levels[skill]]}{recommended ? ' · recommended next' : ''}</p>
      {!open && <p className="mt-2 text-[14px] text-muted">Builds on {s.prereqs.map((p) => PATH[p].title).join(' and ')}. You can start here anyway, or take the skip check.</p>}
      <ol className="mt-3 divide-y divide-line border-y border-line">
        {row(st.learned, '★1 Learned', `${passed} of ${ch.length} chapters${fams.length ? `, or the ${fams.length} worked-example ladder${fams.length === 1 ? '' : 's'}` : ''}, or the 5-minute quick lesson with 2+ stars, or the skip check.`)}
        {row(st.practiced, '★2 Practiced', 'The practice set on your first try, or reaching Proficient.')}
        {row(st.count >= 3, '★3 Retained', 'The hard set (or Mastered), then a right answer in a Gauntlet at least 7 days after ★2.')}
      </ol>
      <p className="mt-2 text-[14px]"><b className="font-medium">Next:</b> {st.next}</p>
      <div className="mt-4 space-y-2">
        <Link href={f.href} className="btn-primary w-full" data-testid="skill-go">{f.title}<ArrowRight size={16} aria-hidden /></Link>
        <Link href={`/learn/${skill}`} className="btn-ghost w-full">Chapters ({passed} of {ch.length})</Link>
        {fams.length > 0 && <Link href={`/worked/${skill}`} className="btn-ghost w-full">Worked examples</Link>}
        {sets.map(([k, label, d]) => <Link key={k} href={`/path/set?kind=${k}&skill=${skill}`} className="btn-ghost w-full !justify-between" title={d} data-testid={`set-${k}`}><span>{label}</span><span className="text-[13px] text-faint">{d.split(';')[0]}</span></Link>)}
      </div>
      {lever && <p className="mt-4 text-[13px] text-faint">Score Lever: {lever.perHour ? `about ${lever.perHour.low}–${lever.perHour.high} points per hour (estimate)` : 'needs a diagnostic'}.</p>}
    </Wrap>
  );
}

/** Runs a Path set and records the result. */
export function PathSetPage() {
  const sp = useSearchParams();
  const kind = (sp.get('kind') ?? 'practice') as PathSetKind | 'confident';
  const skill = (sp.get('skill') as SkillId | null) ?? undefined;
  const section = (sp.get('section') as Section | null) ?? (skill ? PATH[skill]?.section : undefined) ?? 'math';
  const record = useStore((s) => s.recordPathSet);
  const qids = useMemo(() => { const st = snapshot(); return pickSet(kind, { skill, section, seed: `${kind}-${skill}-${Date.now()}` }, QUESTIONS, st.attempts, st.path!, st.srs, Date.now()); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp.toString()]);
  const back = `/path${section === 'rw' ? '/rw' : ''}${skill ? `?skill=${skill}` : ''}`;
  if (!qids.length) return <Empty title="Nothing to practice here yet" body={kind === 'confident' ? 'No confident errors right now. They appear when you mark an answer “sure” and it turns out wrong.' : 'There are no questions for this set.'} action={{ label: 'Back to the Path', href: back }} />;
  const title = { practice: 'Practice set', hard: 'Hard set', check: 'Skip check', gauntlet: 'Gauntlet', confident: 'Confident errors' }[kind] + (skill && kind !== 'gauntlet' ? `: ${PATH[skill].title}` : '');
  return <SessionRunner key={sp.toString()} qids={qids} mode="path" title={title} backHref={back} completeHref={back} completeLabel="Back to the Path"
    onComplete={(r) => { if (kind !== 'confident') record(kind, { section, skill: kind === 'gauntlet' ? undefined : skill }, r.rows.map((x) => ({ qid: x.qid, correct: x.correct, hints: x.hints }))); }}
    reasons={Object.fromEntries(qids.map((id) => [id, kind === 'gauntlet' ? `Mixed review: ${PATH[getQuestion(id)!.skill].title}.` : kind === 'confident' ? 'You were sure of this answer last time, and it was wrong.' : `${title}.`]))} />;
}

/** The Path card on a skill's lesson page: the same stars, next step and sets as the Path itself. */
export function SkillPathCard({ skill }: { skill: SkillId }) {
  const syncPath = useStore((s) => s.syncPath);
  useEffect(() => { syncPath(); }, [syncPath]);
  const { input, upcoming } = usePathModel(PATH[skill].section);
  return (
    <div className="mb-6" data-testid="lesson-path-card">
      <p className="mb-2 text-[14px] text-muted">Step {PATH[skill].order + 1} of {pathOf(PATH[skill].section).length} on your <Link href={`/path${PATH[skill].section === 'rw' ? '/rw' : ''}`} className="text-accent underline">Path</Link>{upcoming[0] === skill ? ' · your next step' : ''}</p>
      <SkillPanel skill={skill} input={input} recommended={upcoming[0] === skill} />
    </div>
  );
}

/** Path stars for every skill, and the recommended next skill per section: shared by Learn, the dashboard and the Path. */
export function usePathStars() {
  const syncPath = useStore((s) => s.syncPath);
  useEffect(() => { syncPath(); }, [syncPath]);
  const m = usePathModel(undefined);
  const rec = { math: upcomingSkills({ ...m.input, section: 'math' }, 1)[0], rw: upcomingSkills({ ...m.input, section: 'rw' }, 1)[0] };
  const stars = Object.fromEntries(PATH_SKILLS.map((p) => [p.id, skillStars(m.input, p.id).count])) as Record<SkillId, number>;
  return { stars, rec };
}
