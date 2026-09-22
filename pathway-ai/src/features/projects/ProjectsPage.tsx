import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Modal, Notice, SearchInput, Tabs } from '@/components/ui/primitives';
import { ExplainCard, FeedbackButtons, PageHeader, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { generateProjects } from '@/domain/engine/projects';
import { MAJOR_BY_ID } from '@/data/majors';
import { PROJECT_TEMPLATES } from '@/data/projects';
import { countLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { ProjectSuggestion } from '@/domain/engine/projects';

/* Section 26 — the project studio. Ideas with a route to finishing them. */

const FEASIBILITY_TONE: Record<ProjectSuggestion['feasibility'], 'ok' | 'warn' | 'danger'> = {
  comfortable: 'ok',
  'a-stretch': 'warn',
  'too-much': 'danger',
};

const FEASIBILITY_LABEL: Record<ProjectSuggestion['feasibility'], string> = {
  comfortable: 'Fits your hours',
  'a-stretch': 'A stretch',
  'too-much': 'More than you have free',
};

export default function ProjectsPage() {
  const ctx = useEngine();
  const { state, toggleSaved, recordFeedback, addActivity, toast } = useAppStore();
  const [tab, setTab] = useState('suggested');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<ProjectSuggestion | undefined>(undefined);

  const suggestions = useMemo(() => generateProjects(ctx, PROJECT_TEMPLATES.length), [ctx]);

  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'project' && s.status !== 'dismissed').map((s) => s.targetId),
  );

  const shown = useMemo(() => {
    let pool = suggestions;
    if (tab === 'saved') pool = pool.filter((p) => savedIds.has(p.template.id));
    if (tab === 'doable') pool = pool.filter((p) => p.feasibility === 'comfortable');
    if (query.trim()) {
      const q = query.toLowerCase();
      pool = pool.filter((p) => `${p.template.title} ${p.template.objective} ${p.template.skills.join(' ')} ${p.template.tools.join(' ')}`.toLowerCase().includes(q));
    }
    return pool;
  }, [suggestions, tab, savedIds, query]);

  function startProject(s: ProjectSuggestion) {
    addActivity({
      name: s.template.title,
      category: 'project',
      gradesInvolved: [ctx.grade],
      hoursPerWeek: s.template.hoursPerWeek,
      weeksPerYear: s.template.estimatedWeeks,
      description: '',
      accomplishments: [],
      leadership: false,
      onApplicationList: false,
    });
    toast('Added to your activities as a project in progress. Write your own description as you go — we deliberately left it blank.', 'ok');
    setDetail(undefined);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Beyond class"
        title="Project studio"
        description="Self-directed projects generated from the specific combination of things you are interested in — with a milestone route, so they get finished rather than abandoned."
        actions={
          <Button variant="ghost" icon="users" to="/app/activities/mine">
            My activities
          </Button>
        }
      />

      <Notice tone="info" icon="lightbulb">
        <span className="w-600">A finished small project beats an abandoned ambitious one.</span> The value is in having made something real and
        being able to talk about what broke and what you did about it. Nobody is impressed by a project that exists only as a plan.
      </Notice>

      <AIGuidanceNote>
        These are generated ideas, not assignments. They are matched to your stated interests, your grade and the hours you actually have free —
        about {ctx.constraints.availableWeeklyHours} a week. Change any of them, or ignore all of them and build the thing you already had in mind.
      </AIGuidanceNote>

      <div className="mt-6">
        <Tabs
          ariaLabel="Project views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'suggested', label: 'Suggested for you', count: suggestions.length },
            { id: 'doable', label: 'Fits your hours' },
            { id: 'saved', label: 'Saved', count: savedIds.size },
          ]}
        />
      </div>

      <Card pad="md" className="mt-4">
        <SearchInput value={query} onChange={setQuery} label="Search projects" placeholder="Search by title, skill or tool…" />
      </Card>

      <p className="t-xs subtle mt-4">{countLabel(shown.length, 'project')} shown.</p>

      {shown.length ? (
        <div className="grid-fit mt-3">
          {shown.map((s) => (
            <Card key={s.template.id} pad="md" hover>
              <div className="row between g-2 items-start">
                <h3 className="t-sm w-600">{s.template.title}</h3>
                <Badge tone={FEASIBILITY_TONE[s.feasibility]}>{FEASIBILITY_LABEL[s.feasibility]}</Badge>
              </div>

              <p className="t-xs subtle mt-3">{s.template.objective}</p>

              <p className="t-2xs mt-3" style={{ color: 'var(--ai-text)' }}>
                <Icon name="sparkles" size={11} /> {s.framing}
              </p>

              <div className="row g-3 mt-4 t-2xs faint wrap">
                <span>{s.template.estimatedWeeks} weeks</span>
                <span>{s.template.hoursPerWeek}h/week</span>
                <span>Difficulty {s.template.difficulty}/5</span>
              </div>

              {s.matchedFrom.length ? (
                <div className="row g-1 mt-3 wrap">
                  {s.matchedFrom.slice(0, 3).map((m) => (
                    <span key={m} className="chip chip-static chip-sm">
                      {m}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="row between g-2 mt-4 items-center">
                <Button size="sm" variant="ghost" onClick={() => setDetail(s)} iconRight="chevron-right">
                  See the plan
                </Button>
                <Button
                  size="sm"
                  variant={savedIds.has(s.template.id) ? 'soft' : 'ghost'}
                  icon="bookmark"
                  aria-label="Save project"
                  onClick={() => toggleSaved('project', s.template.id)}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card pad="lg" className="mt-3">
          <p className="t-sm subtle ta-center">
            {tab === 'saved'
              ? 'Nothing saved yet.'
              : 'Nothing matched. Add interests or a major in your profile and the generator will have more to work with.'}
          </p>
        </Card>
      )}

      <Card pad="md" className="mt-8">
        <SectionHeader
          title="What makes a project worth doing"
          description="None of this is about how it looks to a college. It is about whether the thing is real."
        />
        <div className="grid-fit">
          {[
            { icon: 'target' as const, title: 'It answers a question you actually have', body: 'Not one you picked because it sounded impressive. The difference shows in how you talk about it.' },
            { icon: 'users' as const, title: 'Someone other than you can use it', body: 'A tool your class uses, a dataset a local group needs, a piece someone performs. An audience of one is fine; an audience of zero is a diary.' },
            { icon: 'flame' as const, title: 'It survives contact with reality', body: 'The part worth writing about is what broke and what you changed. Projects that go smoothly teach very little.' },
            { icon: 'check' as const, title: 'It finishes', body: 'Scope it so a version exists in six weeks, even if you keep going afterwards.' },
          ].map((c) => (
            <div key={c.title} className="col g-2">
              <span className="empty-art" style={{ width: 30, height: 30, borderRadius: 'var(--r-md)' }}>
                <Icon name={c.icon} size={15} />
              </span>
              <p className="t-sm w-600">{c.title}</p>
              <p className="t-xs subtle">{c.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={Boolean(detail)} onClose={() => setDetail(undefined)} title={detail?.template.title ?? 'Project'} size="lg">
        {detail ? (
          <div className="col g-4">
            <div className="row g-2 wrap">
              <Badge tone={FEASIBILITY_TONE[detail.feasibility]}>{FEASIBILITY_LABEL[detail.feasibility]}</Badge>
              <Badge>{detail.template.estimatedWeeks} weeks</Badge>
              <Badge>{detail.template.hoursPerWeek}h per week</Badge>
              <Badge>Difficulty {detail.template.difficulty}/5</Badge>
            </div>

            <p className="t-sm">{detail.template.objective}</p>

            {detail.feasibility === 'too-much' ? (
              <Notice tone="warn" icon="alert">
                At {detail.template.hoursPerWeek} hours a week this is more than the {ctx.constraints.availableWeeklyHours} you have free. That is
                not a reason to abandon it — halve the scope, or drop something else deliberately rather than by accident.
              </Notice>
            ) : null}

            <div>
              <p className="t-2xs eyebrow mb-2">Milestones</p>
              <ol className="col g-2">
                {detail.template.milestones.map((m, i) => (
                  <li key={m} className="row g-2 t-sm subtle">
                    <span className="step-num">{i + 1}</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="t-2xs eyebrow mb-2">What exists at the end</p>
              <ul className="col g-1">
                {detail.template.finalProduct.map((f) => (
                  <li key={f} className="t-sm subtle row g-2">
                    <Icon name="check" size={13} className="c-ok mt-1 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="row g-4 wrap">
              <div className="col g-2 grow">
                <p className="t-2xs eyebrow">Skills you build</p>
                <div className="row g-1 wrap">
                  {detail.template.skills.map((s) => (
                    <span key={s} className="chip chip-static chip-sm">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col g-2 grow">
                <p className="t-2xs eyebrow">Tools</p>
                <div className="row g-1 wrap">
                  {detail.template.tools.map((t) => (
                    <span key={t} className="chip chip-static chip-sm">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {detail.template.extensions.length ? (
              <div>
                <p className="t-2xs eyebrow mb-2">If it goes well</p>
                <ul className="col g-1">
                  {detail.template.extensions.map((e) => (
                    <li key={e} className="t-xs subtle">
                      • {e}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.template.majorTags.length ? (
              <div>
                <p className="t-2xs eyebrow mb-2">Connects to</p>
                <div className="row g-1 wrap">
                  {detail.template.majorTags.map((m) => (
                    <Link key={m} to={`/app/majors/${m}`} className="chip chip-sm" onClick={() => setDetail(undefined)}>
                      {MAJOR_BY_ID.get(m)?.name ?? m}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <ExplainCard explanation={detail.explanation} />

            <div className="row between g-3 wrap items-center">
              <div className="row g-2">
                <Button icon="plus" onClick={() => startProject(detail)}>
                  Start this project
                </Button>
                <Button
                  variant="ghost"
                  icon="bookmark"
                  onClick={() => {
                    toggleSaved('project', detail.template.id);
                    toast(savedIds.has(detail.template.id) ? 'Removed from saved.' : 'Saved.', 'default');
                  }}
                >
                  {savedIds.has(detail.template.id) ? 'Saved' : 'Save for later'}
                </Button>
              </div>
              <FeedbackButtons
                compact
                onFeedback={(kind) => {
                  recordFeedback({ targetType: 'project', targetId: detail.template.id, kind });
                  toast(kind === 'not-interested' ? 'Hidden from future suggestions.' : 'Noted.', 'default');
                  setDetail(undefined);
                }}
              />
            </div>

            <p className="t-2xs faint">
              &ldquo;Start this project&rdquo; adds it to your activities with an empty description. You write what you actually did as you go —
              this app will never fill that in for you.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
