import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, SearchInput } from '@/components/ui/primitives';
import { ExplainCard, FeedbackButtons, NavCard, PageHeader } from '@/components/ui/shared';
import { AIGuidanceNote, DemoDataBanner } from '@/components/ui/Provenance';
import { findOpportunities } from '@/domain/engine/opportunities';
import { countLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import type { Opportunity } from '@/domain/types';

/* Sections 22–23 — extracurricular and opportunity discovery. */

const CATEGORIES: { id: Opportunity['category']; label: string }[] = [
  { id: 'research', label: 'Research' },
  { id: 'competition', label: 'Competitions' },
  { id: 'summer-program', label: 'Summer programmes' },
  { id: 'internship', label: 'Internships' },
  { id: 'volunteering', label: 'Volunteering' },
  { id: 'community-service', label: 'Community service' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'entrepreneurship', label: 'Entrepreneurship' },
  { id: 'stem', label: 'STEM' },
  { id: 'arts', label: 'Arts' },
  { id: 'music', label: 'Music' },
  { id: 'business', label: 'Business' },
  { id: 'club', label: 'Clubs' },
  { id: 'academic-program', label: 'Academic programmes' },
];

export function ActivityFinder() {
  const ctx = useEngine();
  const { state, toggleSaved, recordFeedback, toast } = useAppStore();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Opportunity['category'][]>([]);
  const [format, setFormat] = useState<'any' | Opportunity['format']>('any');
  const [maxCommitment, setMaxCommitment] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);

  const results = useMemo(
    () =>
      findOpportunities(
        ctx,
        {
          query: query || undefined,
          categories: categories.length ? categories : undefined,
          format,
          maxCommitment: maxCommitment || undefined,
          costs: freeOnly ? ['free', 'stipend', 'low'] : undefined,
          includeBlocked: showBlocked,
        },
        60,
      ),
    [ctx, query, categories, format, maxCommitment, freeOnly, showBlocked],
  );

  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'opportunity' && s.status !== 'dismissed').map((s) => s.targetId),
  );

  const blockedCount = results.filter((r) => r.blockers.length).length;

  function toggleCategory(id: Opportunity['category']) {
    setCategories((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Beyond class"
        title="Find things worth doing"
        description="Matched against your direction, your available hours and what you have told us about cost and format. Ranked by fit, never by prestige."
        actions={
          <>
            <Button variant="ghost" icon="users" to="/app/activities/mine">
              My activities ({state.profile.activities.length})
            </Button>
            <Button variant="ghost" icon="lens" to="/app/activities/depth">
              Depth analysis
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Two years of one thing beats one term of five.</span> Pathway AI will never suggest padding a list with activities
        you do not care about. A long résumé of shallow involvement reads exactly as it is, and it costs you the time you could have spent going
        deep on something real.
      </Notice>

      <div className="grid-fit-lg mt-4">
        <NavCard to="/app/activities/mine" icon="users" title="What you already do" description="Your activities, with hours, roles and the accomplishments you have recorded." />
        <NavCard to="/app/activities/depth" icon="lens" title="Depth analysis" description="How deep each activity actually goes, and concrete ways to take one further." />
        <NavCard to="/app/projects" icon="rocket" title="Build something instead" description="When nothing on offer fits, a self-directed project is often the strongest option." />
      </div>

      <DemoDataBanner what="Opportunity listings, deadlines and eligibility" />

      <Card pad="md">
        <SearchInput value={query} onChange={setQuery} label="Search opportunities" placeholder="Search by name, organisation or skill…" />
        <div className="row g-2 mt-4 wrap">
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" className="chip chip-sm" aria-pressed={categories.includes(c.id)} onClick={() => toggleCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="row g-3 mt-4 wrap items-end">
          <label className="col g-1">
            <span className="t-2xs eyebrow">Format</span>
            <select className="select" style={{ minWidth: 160 }} value={format} onChange={(e) => setFormat(e.target.value as 'any' | Opportunity['format'])}>
              <option value="any">Any format</option>
              <option value="online">Online</option>
              <option value="in-person">In person</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Maximum commitment</span>
            <select className="select" style={{ minWidth: 190 }} value={maxCommitment} onChange={(e) => setMaxCommitment(Number(e.target.value))}>
              <option value={0}>Any commitment</option>
              <option value={2}>Light (1–2)</option>
              <option value={3}>Moderate (up to 3)</option>
              <option value={4}>Heavy (up to 4)</option>
            </select>
          </label>
          <button type="button" className="chip chip-sm" aria-pressed={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
            Free, low-cost or paid only
          </button>
          <button type="button" className="chip chip-sm" aria-pressed={showBlocked} onClick={() => setShowBlocked((v) => !v)}>
            Include ones you are not eligible for
          </button>
        </div>
        <p className="t-2xs faint mt-3">
          You have about {ctx.constraints.availableWeeklyHours} hours a week free after your current commitments and study time. Anything heavier
          than that means dropping something else — which is sometimes the right call, but should be a decision rather than an accident.
        </p>
      </Card>

      <AIGuidanceNote>
        Fit here means overlap with your stated direction, your grade, your hours and your cost constraints. It is not a judgement of whether you
        would get in, and it is not a claim that these carry weight with admissions offices.
      </AIGuidanceNote>

      <p className="t-xs subtle mt-4">
        {countLabel(results.length, 'opportunity')} shown
        {blockedCount ? `, ${blockedCount} with an eligibility issue flagged` : ''}.
      </p>

      {results.length ? (
        <div className="col g-3 mt-3">
          {results.map(({ opportunity: op, reasons, blockers, explanation }) => (
            <Card key={op.id} pad="md" hover>
              <div className="row between g-3 items-start wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row g-2 items-center wrap">
                    <h3 className="t-md w-600">{op.name}</h3>
                    <Badge>{op.category.replace(/-/g, ' ')}</Badge>
                    {op.cost === 'free' || op.cost === 'stipend' ? <Badge tone="ok">{op.cost === 'stipend' ? 'Paid' : 'Free'}</Badge> : null}
                    {blockers.length ? <Badge tone="warn">Check eligibility</Badge> : null}
                  </div>
                  <p className="t-2xs subtle mt-1">
                    {op.organization ? `${op.organization} · ` : ''}
                    {op.format}
                    {op.location ? ` · ${op.location}` : ''}
                    {op.durationText ? ` · ${op.durationText}` : ''}
                  </p>
                </div>
                <div className="row g-2">
                  <Button
                    size="sm"
                    variant={savedIds.has(op.id) ? 'soft' : 'ghost'}
                    icon="bookmark"
                    onClick={() => toggleSaved('opportunity', op.id)}
                  >
                    {savedIds.has(op.id) ? 'Saved' : 'Save'}
                  </Button>
                  {op.website ? (
                    <Button size="sm" variant="ghost" href={op.website} iconRight="external">
                      Official site
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="t-sm muted mt-3">{op.description}</p>

              {reasons.length ? (
                <ul className="col g-1 mt-3">
                  {reasons.slice(0, 3).map((r) => (
                    <li key={r} className="t-xs subtle row g-2">
                      <Icon name="check" size={12} className="c-ok mt-1 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {blockers.length ? (
                <ul className="col g-1 mt-3">
                  {blockers.map((b) => (
                    <li key={b} className="t-xs c-warn row g-2">
                      <Icon name="alert" size={12} className="mt-1 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="row g-4 mt-4 t-2xs faint wrap">
                <span>Commitment {op.commitment}/5</span>
                <span>Difficulty {op.difficulty}/5</span>
                {op.hoursPerWeek ? <span>{op.hoursPerWeek}</span> : null}
                {op.deadlineText ? <span>Deadline: {op.deadlineText}</span> : null}
                <span>Grades {op.grades.join(', ')}</span>
              </div>

              {op.skillsBuilt.length ? (
                <div className="row g-2 mt-3 wrap">
                  {op.skillsBuilt.map((s) => (
                    <span key={s} className="chip chip-static chip-sm">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <ExplainCard explanation={explanation} />
              </div>

              <div className="row between g-3 mt-4 wrap items-center">
                {op.suggestedPrep.length ? (
                  <p className="t-2xs subtle">
                    <span className="w-600">Prepare by:</span> {op.suggestedPrep.slice(0, 2).join('; ')}
                  </p>
                ) : (
                  <span />
                )}
                <FeedbackButtons
                  compact
                  onFeedback={(kind) => {
                    recordFeedback({ targetType: 'opportunity', targetId: op.id, kind });
                    toast(kind === 'not-interested' ? 'Hidden from future suggestions.' : 'Noted — future matching will lean that way.', 'default');
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card pad="lg" className="mt-3">
          <p className="t-sm subtle ta-center">
            Nothing matched those filters. This is a demo catalog of {countLabel(34, 'opportunity')} — a real deployment would carry thousands,
            filtered by your location.{' '}
            <button
              type="button"
              className="c-accent"
              onClick={() => {
                setQuery('');
                setCategories([]);
                setFormat('any');
                setMaxCommitment(0);
                setFreeOnly(false);
              }}
            >
              Clear the filters
            </button>
          </p>
        </Card>
      )}
    </div>
  );
}
