import { useMemo } from 'react';
import { useEngine } from '@/store/useEngine';
import { Badge, Button, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { buildFourYearPlan } from '@/domain/engine/graph';
import { ProgressRing } from '@/components/charts';
import { printPDF } from '@/lib/export';

/* Section 25 — personalised four-year plan. */

export function FourYearPage() {
  const ctx = useEngine();
  const plan = useMemo(() => buildFourYearPlan(ctx), [ctx]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Four-year plan"
        title="Your roadmap through high school"
        description="Adapted to the grade you are actually in and what you have already done. Past years show what was marked complete; future years show what matters most."
        actions={
          <Button size="sm" icon="download" onClick={printPDF}>
            Export as PDF
          </Button>
        }
      />

      <AIGuidanceNote />

      <div className="col g-5 mt-6">
        {plan.map((year) => {
          const done = year.focuses.filter((f) => f.done).length;
          return (
            <Card
              key={year.grade}
              pad="none"
              className={year.isCurrent ? 'card-accent' : undefined}
              raised={year.isCurrent}
            >
              <div className="card-head">
                <div className="row g-3">
                  <span
                    className="badge badge-lg mono"
                    style={{ minWidth: 60, justifyContent: 'center' }}
                  >
                    Grade {year.grade}
                  </span>
                  <div className="col">
                    <span className="t-md w-600">{year.theme}</span>
                    <span className="t-2xs subtle">
                      {year.isCurrent ? 'You are here' : year.isPast ? 'Behind you' : 'Ahead of you'}
                    </span>
                  </div>
                </div>
                <div className="row g-3 items-center">
                  {year.isCurrent ? <Badge tone="accent">Current year</Badge> : null}
                  <ProgressRing
                    value={(done / year.focuses.length) * 100}
                    size={42}
                    stroke={4}
                    label={`${done}/${year.focuses.length}`}
                    ariaLabel={`Grade ${year.grade}: ${done} of ${year.focuses.length} complete`}
                  />
                </div>
              </div>
              <div className="card-body">
                <ul className="timeline">
                  {year.focuses.map((f, i) => (
                    <li className="tl-item" key={i}>
                      <span className={`tl-dot${f.done ? ' is-done' : year.isCurrent ? ' is-now' : ''}`} aria-hidden="true" />
                      <div className="row between g-3 wrap">
                        <span className={`t-sm w-600${f.done ? ' subtle' : ''}`}>{f.title}</span>
                        {f.done ? (
                          <Badge tone="ok">
                            <Icon name="check" size={11} /> Done
                          </Badge>
                        ) : null}
                      </div>
                      <p className="t-xs subtle mt-1">{f.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      <Card pad="md" inset className="mt-6">
        <p className="t-sm">
          <strong>A note on this plan.</strong> It is a set of priorities, not a checklist to complete. Students who do three
          of these well are in a better position than students who do all of them shallowly, and the years behind you cannot
          be redone — so the useful part of this page is always the current year and the next one.
        </p>
      </Card>
    </div>
  );
}
