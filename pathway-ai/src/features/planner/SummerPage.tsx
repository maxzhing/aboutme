import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { summerPaths } from '@/domain/engine/planning';
import { findOpportunities } from '@/domain/engine/opportunities';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';

/* Section 30 — summer planning, including permission to rest. */

const KIND_ICON: Record<string, IconName> = {
  research: 'microscope',
  coursework: 'book',
  project: 'rocket',
  internship: 'building',
  competition: 'trophy',
  volunteer: 'heart',
  creative: 'palette',
  work: 'wallet',
  rest: 'moon',
};

const COST_TONE: Record<string, 'ok' | 'accent' | 'warn' | 'default'> = {
  free: 'ok',
  paid: 'ok',
  low: 'accent',
  varies: 'default',
};

export function SummerPage() {
  const ctx = useEngine();
  const { state } = useAppStore();

  const paths = useMemo(() => summerPaths(ctx), [ctx]);
  const summerOps = useMemo(
    () => findOpportunities(ctx, { categories: ['summer-program', 'research', 'internship'] }, 6),
    [ctx],
  );

  const gradeNote: Record<number, string> = {
    9: 'After grade 9, almost nothing is expected of you. This is the summer to try something with no plan attached and find out what you actually like.',
    10: 'After grade 10, depth starts to matter more than novelty. Going further into something you already do usually beats starting something new.',
    11: 'The summer after grade 11 is the one that carries most weight — partly for what you do, mostly because it is when applications get written. Leave real time for essays.',
    12: 'After grade 12 the applications are behind you. Work, rest, earn money, and enjoy it.',
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Planner"
        title="Summer planning"
        description="What a summer can realistically be for, given where you are and what is actually available to you."
        back={{ to: '/app/planner', label: 'Planner' }}
      />

      <Notice tone="info" icon="sun">
        {gradeNote[ctx.grade] ?? 'Summers matter, but not equally and not in the way most advice implies.'}
      </Notice>

      <Card pad="md" className="mt-4">
        <SectionHeader
          title="The thing nobody says out loud"
          description="Worth reading before you spend a summer, or several thousand dollars, on the wrong thing."
        />
        <p className="t-sm subtle">
          Expensive summer programmes at prestigious universities are, with a handful of genuine exceptions, revenue businesses. Admission to one
          is usually admission to a payment page, and admissions readers know which is which. A summer spent working a job, caring for family,
          teaching yourself something properly, or building one real thing is not a lesser summer — it is frequently a more interesting one, and it
          is honest about your circumstances in a way that reads well.
        </p>
      </Card>

      <AIGuidanceNote>
        These paths are generated from your stated direction, grade and budget. They are options, not a ranking, and the right one depends on
        things this app does not know — your family&rsquo;s situation, whether you need to earn, and how tired you are.
      </AIGuidanceNote>

      <SectionHeader title="Paths worth considering" className="mt-6" />
      <div className="grid-fit">
        {paths.map((p) => (
          <Card key={p.id} pad="md" hover>
            <div className="row between g-2 items-start">
              <span className="empty-art" style={{ width: 32, height: 32, borderRadius: 'var(--r-md)' }}>
                <Icon name={KIND_ICON[p.kind] ?? 'compass'} size={16} />
              </span>
              <Badge tone={COST_TONE[p.cost] ?? 'default'}>{p.cost === 'paid' ? 'Pays you' : p.cost}</Badge>
            </div>

            <h3 className="t-sm w-600 mt-4">{p.title}</h3>
            <p className="t-xs subtle mt-2">{p.purpose}</p>

            <p className="t-2xs mt-3" style={{ color: 'var(--ai-text)' }}>
              <Icon name="sparkles" size={11} /> {p.fitsYou}
            </p>

            <div className="mt-3">
              <p className="t-2xs eyebrow mb-1">Reality check</p>
              <p className="t-xs subtle">{p.realityCheck}</p>
            </div>

            <div className="mt-3">
              <p className="t-2xs eyebrow mb-1">First step</p>
              <p className="t-xs subtle">{p.firstStep}</p>
            </div>

            {p.route ? (
              <Button size="sm" variant="ghost" to={p.route} iconRight="arrow-right" className="mt-4">
                Start here
              </Button>
            ) : null}
          </Card>
        ))}
      </div>

      {summerOps.length ? (
        <>
          <SectionHeader
            title="Programmes in the catalog that fit you"
            className="mt-8"
            description="From the demo opportunity set, matched against your direction and constraints."
            action={
              <Button size="sm" variant="ghost" to="/app/activities" iconRight="arrow-right">
                Full finder
              </Button>
            }
          />
          <div className="col g-3">
            {summerOps.map(({ opportunity: op, reasons, blockers }) => (
              <Card key={op.id} pad="md" hover>
                <div className="row between g-3 items-start wrap">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row g-2 items-center wrap">
                      <h3 className="t-sm w-600">{op.name}</h3>
                      <Badge>{op.category.replace(/-/g, ' ')}</Badge>
                      {op.cost === 'free' || op.cost === 'stipend' ? <Badge tone="ok">{op.cost === 'stipend' ? 'Paid' : 'Free'}</Badge> : null}
                    </div>
                    <p className="t-2xs subtle mt-1">
                      {op.organization ?? ''} {op.durationText ? `· ${op.durationText}` : ''} {op.deadlineText ? `· ${op.deadlineText}` : ''}
                    </p>
                  </div>
                  {op.website ? (
                    <Button size="sm" variant="ghost" href={op.website} iconRight="external">
                      Site
                    </Button>
                  ) : null}
                </div>
                <p className="t-sm muted mt-3">{op.description}</p>
                {reasons.length ? <p className="t-2xs subtle mt-2">{reasons[0]}</p> : null}
                {blockers.length ? <p className="t-2xs c-warn mt-2">{blockers[0]}</p> : null}
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <Card pad="md" className="mt-8">
        <SectionHeader title="Planning backwards from the deadlines" description="Most summer programmes close applications between December and February — long before summer feels relevant." />
        <ul className="col g-2">
          {[
            'October to December — research what exists, and email anyone you want to work with directly.',
            'December to February — most competitive programme deadlines fall here.',
            'February to April — decisions arrive; local and rolling options are still open.',
            'April to May — confirm logistics, and if nothing came together, commit to a self-directed project instead.',
          ].map((s) => (
            <li key={s} className="row g-2 t-sm subtle">
              <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
        <p className="t-2xs faint mt-3">
          Those windows are the usual pattern, not verified dates for this cycle. Check each programme&rsquo;s own page.
        </p>
      </Card>

      {state.profile.activities.length ? (
        <Card pad="md" className="mt-4">
          <p className="t-2xs eyebrow">What you already have running</p>
          <div className="row g-2 mt-2 wrap">
            {state.profile.activities.map((a) => (
              <span key={a.id} className="chip chip-static chip-sm">
                {a.name}
              </span>
            ))}
          </div>
          <p className="t-xs subtle mt-3">
            Going deeper on one of these over a summer — taking on more responsibility, building something for it, running it properly — is
            usually a better use of the time than adding an unrelated programme.{' '}
            <Link to="/app/activities/depth" className="c-accent">
              See where each one is thin
            </Link>
            .
          </p>
        </Card>
      ) : null}

      <Notice tone="ok" icon="moon" className="mt-6">
        <span className="w-600">Rest is a legitimate plan.</span> Students who spend every summer optimising arrive at college exhausted and
        unsure what they actually enjoy. If you need a summer off, take one — no admissions officer has ever rejected someone for having had a
        normal July.
      </Notice>
    </div>
  );
}
