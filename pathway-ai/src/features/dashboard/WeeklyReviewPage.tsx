import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { Button, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { StatTile } from '@/components/ui/primitives';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { buildWeeklyReview } from '@/domain/engine/briefing';
import { formatDate } from '@/lib/date';

/* Section 50 — weekly review. */

const SECTIONS: { key: 'accomplished' | 'improved' | 'unfinished' | 'patterns' | 'nextWeek'; title: string; icon: 'check' | 'trending-up' | 'clock' | 'lens' | 'arrow-right'; tone: string }[] = [
  { key: 'accomplished', title: 'What you accomplished', icon: 'check', tone: 'c-ok' },
  { key: 'improved', title: 'What improved', icon: 'trending-up', tone: 'c-accent' },
  { key: 'unfinished', title: 'What remains unfinished', icon: 'clock', tone: 'c-warn' },
  { key: 'patterns', title: 'Patterns worth noticing', icon: 'lens', tone: 'c-ai' },
  { key: 'nextWeek', title: 'What should happen next week', icon: 'arrow-right', tone: 'c-accent' },
];

export function WeeklyReviewPage() {
  const ctx = useEngine();
  const [offset, setOffset] = useState(0);
  const review = useMemo(() => buildWeeklyReview(ctx, offset), [ctx, offset]);

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <PageHeader
        eyebrow="Weekly review"
        title={`Week of ${formatDate(review.weekOf, 'long')}`}
        description="Built from what actually happened, not from what would look encouraging. If a week was quiet, it says so."
        actions={
          <>
            <Button size="sm" icon="chevron-left" onClick={() => setOffset(offset + 1)}>
              Earlier
            </Button>
            <Button size="sm" iconRight="chevron-right" onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0}>
              Later
            </Button>
          </>
        }
      />

      <div className="grid-fit-sm">
        {review.stats.map((s) => (
          <Card key={s.label} pad="md" inset>
            <StatTile label={s.label} value={s.value} small />
          </Card>
        ))}
      </div>

      <div className="col g-5 mt-6">
        {SECTIONS.map((section) => (
          <Card key={section.key} pad="md">
            <SectionHeader title={section.title} />
            <ul className="col g-3">
              {review[section.key].map((item, i) => (
                <li key={i} className="row-top g-3">
                  <Icon name={section.icon} size={15} className={`${section.tone} shrink-0`} style={{ marginTop: 3 }} />
                  <span className="t-sm">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <AIGuidanceNote>
          <strong>No exaggerated judgements.</strong> One quiet week is noise, not a trend. This review reports counts and
          observable changes, and it says when there is not enough data to conclude anything.
        </AIGuidanceNote>
      </div>
    </div>
  );
}
