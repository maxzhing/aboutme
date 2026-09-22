import { useMemo } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, PriorityBadge, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { findBlindSpots } from '@/domain/engine/planning';
import { countLabel, groupBy, humanizeKey } from '@/lib/format';

/* Section 34 — "What am I missing?" */

export function BlindSpotsPage() {
  const ctx = useEngine();
  const { dismissRecommendation, toast } = useAppStore();
  const spots = useMemo(() => findBlindSpots(ctx), [ctx]);
  const byArea = useMemo(() => groupBy(spots, (s) => s.area), [spots]);
  const counts = {
    important: spots.filter((s) => s.priority === 'important').length,
    useful: spots.filter((s) => s.priority === 'useful').length,
    optional: spots.filter((s) => s.priority === 'optional').length,
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Find my blind spots"
        title="What your profile is missing"
        description="Sorted by how much it actually matters. Nothing here is invented to give you more work — if a section is empty, that is the answer."
      />

      <AIGuidanceNote>
        <strong>This list is deliberately short.</strong> We separate <em>important</em> from <em>useful</em> and{' '}
        <em>optional</em>, and we do not manufacture weaknesses. If nothing appears, nothing needs your attention.
      </AIGuidanceNote>

      {spots.length ? (
        <>
          <div className="grid-3 mt-6">
            {(['important', 'useful', 'optional'] as const).map((p) => (
              <Card key={p} pad="md" inset>
                <div className="row between items-center">
                  <div>
                    <p className="stat-label">{humanizeKey(p)}</p>
                    <p className="stat-value stat-value-sm mt-1">{counts[p]}</p>
                  </div>
                  <Icon
                    name={p === 'important' ? 'alert' : p === 'useful' ? 'info' : 'lightbulb'}
                    size={20}
                    className={p === 'important' ? 'c-danger' : p === 'useful' ? 'c-warn' : 'subtle'}
                  />
                </div>
              </Card>
            ))}
          </div>

          {Object.entries(byArea).map(([area, items]) => (
            <section key={area} className="mt-8">
              <SectionHeader title={humanizeKey(area)} description={`${countLabel(items.length, 'finding')} in this area.`} />
              <div className="col g-3">
                {items.map((spot) => (
                  <Card key={spot.id} pad="md">
                    <div className="row between g-3 items-start wrap">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="row g-2 wrap items-center">
                          <PriorityBadge priority={spot.priority} />
                          <h3 className="t-md w-600" style={{ fontFamily: 'var(--font-sans)' }}>
                            {spot.title}
                          </h3>
                        </div>
                        <p className="t-sm muted mt-3">{spot.finding}</p>
                        <div className="row-top g-2 mt-3">
                          <Icon name="arrow-right" size={14} className="c-accent shrink-0" style={{ marginTop: 3 }} />
                          <p className="t-sm w-500">{spot.action}</p>
                        </div>
                        {spot.evidence.length ? (
                          <div className="mt-3">
                            <p className="t-2xs eyebrow mb-2">What this is based on</p>
                            <ul className="col g-1">
                              {spot.evidence.map((e, i) => (
                                <li key={i} className="t-2xs faint">
                                  • {e}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                      <div className="col g-2 shrink-0">
                        {spot.route ? (
                          <Button size="sm" variant="soft" to={spot.route} iconRight="chevron-right">
                            Fix this
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="x"
                          onClick={() => {
                            dismissRecommendation(spot.id);
                            toast('Dismissed. It will not appear again.', 'default');
                          }}
                        >
                          Not relevant
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon="check"
            title="Nothing significant is missing"
            description="Your profile is complete enough that we have nothing worth raising. We will not invent gaps to fill this page."
            action={
              <Button to="/app" variant="soft" iconRight="arrow-right">
                Back to your dashboard
              </Button>
            }
          />
        </div>
      )}

      <Card pad="md" className="mt-8" inset>
        <div className="row g-3">
          <Icon name="info" size={17} className="subtle shrink-0" style={{ marginTop: 2 }} />
          <div>
            <p className="t-sm w-600">Dismissed something by mistake?</p>
            <p className="t-xs subtle mt-1">
              Dismissals are stored with your profile. You can clear them from{' '}
              <a href="/app/settings/memory">Settings → What the AI remembers</a>.
            </p>
          </div>
        </div>
      </Card>

      <div className="row g-2 mt-6 wrap">
        <Badge tone="ok" dot>
          Nothing here is a judgement of you
        </Badge>
        <Badge tone="accent" dot>
          Priority is about timing, not worth
        </Badge>
      </div>
    </div>
  );
}
