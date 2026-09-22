import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { Badge, Button, Card, Notice, Tabs } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote, DemoDataBanner } from '@/components/ui/Provenance';
import { matchColleges } from '@/domain/engine/collegeMatch';
import { FIT_DISCLAIMER } from '@/domain/engine/explain';
import { CollegeMatchCard } from './CollegeCard';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { countLabel, listJoin } from '@/lib/format';

/* Section 5 — the AI college matcher. */

const SORTS = [
  { id: 'overall', label: 'Best overall match' },
  { id: 'academic', label: 'Academic fit' },
  { id: 'personal', label: 'Personal fit' },
  { id: 'opportunity', label: 'Opportunity fit' },
  { id: 'financial', label: 'Financial fit' },
  { id: 'accessible', label: 'Higher admit rate first' },
];

export function CollegeMatchPage() {
  const ctx = useEngine();
  const [sort, setSort] = useState('overall');
  const [limit, setLimit] = useState(12);

  const matches = useMemo(() => matchColleges(ctx), [ctx]);

  const sorted = useMemo(() => {
    const copy = matches.slice();
    if (sort === 'overall') return copy;
    if (sort === 'accessible') {
      return copy.sort((a, b) => (COLLEGE_BY_ID.get(b.collegeId)?.acceptanceRate ?? 0) - (COLLEGE_BY_ID.get(a.collegeId)?.acceptanceRate ?? 0));
    }
    return copy.sort((a, b) => {
      const av = a.dimensions.find((d) => d.key === sort)?.score ?? 0;
      const bv = b.dimensions.find((d) => d.key === sort)?.score ?? 0;
      return bv - av;
    });
  }, [matches, sort]);

  const profileGaps: string[] = [];
  if (!ctx.majorIds.length) profileGaps.push('an intended major, even a tentative one');
  if (!ctx.profile.collegePrefs.priorities.length) profileGaps.push('what you actually want from a college');
  if (ctx.constraints.maxCostPerYear === undefined) profileGaps.push('a budget');
  if (!ctx.gpa4) profileGaps.push('your GPA');

  return (
    <div className="page">
      <PageHeader
        eyebrow="Find my colleges"
        title="Your college universe"
        description={
          ctx.majorIds.length
            ? `Matched against ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}, your stated preferences, your constraints and your record.`
            : 'Matched against your stated preferences and record. Naming a major would sharpen this considerably.'
        }
        actions={
          <Button icon="sliders" to="/app/settings/profile">
            Adjust preferences
          </Button>
        }
      />

      <Notice tone="warn" icon="alert">
        <strong>Fit is not admission probability.</strong> {FIT_DISCLAIMER.split('. ').slice(1).join('. ')}
      </Notice>

      {profileGaps.length ? (
        <Card pad="md" className="mt-4">
          <div className="row g-3">
            <Icon name="info" size={17} className="c-warn shrink-0" style={{ marginTop: 2 }} />
            <div>
              <p className="t-sm w-600">These matches are weaker than they could be</p>
              <p className="t-xs subtle mt-1">
                You have not told us {listJoin(profileGaps)}. Each one changes the ordering materially.
              </p>
              <Button size="sm" variant="soft" to="/app/settings/profile" className="mt-3" iconRight="arrow-right">
                Fill these in
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <DemoDataBanner what="Figures shown on these cards" />

      <div className="row between g-3 wrap mb-4">
        <Tabs items={SORTS.map((s) => ({ id: s.id, label: s.label }))} active={sort} onChange={setSort} ariaLabel="Sort matches" pill />
        <Badge>{countLabel(matches.length, 'college')} considered</Badge>
      </div>

      <div className="col g-3">
        {sorted.slice(0, limit).map((m, i) => (
          <CollegeMatchCard key={m.collegeId} match={{ ...m, rank: i + 1 }} showRank />
        ))}
      </div>

      {limit < sorted.length ? (
        <div className="row center mt-6">
          <Button onClick={() => setLimit(limit + 12)} icon="chevron-down">
            Show {Math.min(12, sorted.length - limit)} more
          </Button>
        </div>
      ) : null}

      <div className="mt-8">
        <SectionHeader title="How this ordering works" />
        <Card pad="md">
          <div className="grid-2">
            <div>
              <p className="t-sm">
                Four dimensions are scored independently and shown separately, because collapsing them into one number hides
                exactly the trade-off you need to see. Ordering weights academic and personal fit most, and weights financial
                fit by how important you said aid is to you — currently{' '}
                <strong>{ctx.profile.collegePrefs.aidImportance} out of 5</strong>.
              </p>
            </div>
            <ul className="col g-2">
              {[
                ['Academic fit', 'Does it offer and do well in what you want to study?'],
                ['Personal fit', 'Does it match the kind of place you described wanting?'],
                ['Opportunity fit', 'Research, co-ops, internships, music, arts, entrepreneurship.'],
                ['Financial considerations', 'Cost against your budget, aid commitments and merit awards.'],
              ].map(([t, d]) => (
                <li key={t} className="row-top g-2 t-sm">
                  <Icon name="check" size={14} className="c-accent shrink-0" style={{ marginTop: 3 }} />
                  <span>
                    <strong>{t}</strong> — {d}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <AIGuidanceNote />
      </div>
    </div>
  );
}
