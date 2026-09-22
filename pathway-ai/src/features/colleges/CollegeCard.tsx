import { Link } from 'react-router-dom';
import type { CollegeMatch } from '@/domain/types';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { Button, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { FitDimensionGrid, FitBadge } from '@/components/ui/shared';
import { ProvenanceChip } from '@/components/ui/Provenance';
import { useAppStore } from '@/store/useAppStore';
import { compactCurrency, percent } from '@/lib/format';

export function CollegeMatchCard({ match, showRank }: { match: CollegeMatch; showRank?: boolean }) {
  const college = COLLEGE_BY_ID.get(match.collegeId);
  const { state, addToCollegeList, removeCollegeEntry, recordFeedback, toast } = useAppStore();
  if (!college) return null;
  const entry = state.collegeList.find((e) => e.collegeId === college.id);

  return (
    <Card pad="md" hover className="relative">
      <div className="row between g-3 items-start">
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row g-2 wrap items-center">
            {showRank ? <span className="badge mono">{match.rank}</span> : null}
            <Link to={`/app/colleges/${college.id}`} className="t-md w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
              {college.shortName ?? college.name}
            </Link>
            <FitBadge band={match.overallBand} />
          </div>
          <p className="t-xs subtle mt-1">
            {college.city}, {college.state} · {college.control} · {college.undergradEnrollment.toLocaleString()} undergraduates
          </p>
        </div>
        <ProvenanceChip provenance={college.provenance} compact />
      </div>

      <p className="t-sm muted mt-3">{match.headline}</p>

      <div className="mt-4">
        <FitDimensionGrid dimensions={match.dimensions} compact />
      </div>

      {match.academicContext.testNote || match.academicContext.gpaNote ? (
        <div className="notice mt-4 t-xs">
          <Icon name="info" size={14} className="notice-icon" />
          <div className="col g-1">
            {match.academicContext.gpaNote ? <span>{match.academicContext.gpaNote}</span> : null}
            {match.academicContext.testNote ? <span>{match.academicContext.testNote}</span> : null}
          </div>
        </div>
      ) : null}

      {match.matchedPrograms.length ? (
        <div className="mt-3">
          <p className="t-2xs eyebrow mb-2">Relevant programmes</p>
          <ul className="col g-1">
            {match.matchedPrograms.slice(0, 2).map((p) => (
              <li key={p.name} className="t-xs subtle">
                • <span className="w-600">{p.name}</span> — {p.description}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.concerns.length ? (
        <p className="t-xs c-warn mt-3">
          <Icon name="alert" size={12} /> {match.concerns[0]}
        </p>
      ) : null}

      <div className="row between g-3 mt-4 wrap items-center">
        <div className="row g-3 t-2xs subtle wrap">
          {college.acceptanceRate !== undefined ? <span>{percent(college.acceptanceRate)} admit rate</span> : null}
          {college.avgNetPrice !== undefined ? <span>{compactCurrency(college.avgNetPrice)} avg net price</span> : null}
          <span>{college.testPolicy === 'blind' ? 'Test-blind' : college.testPolicy === 'optional' ? 'Test-optional' : college.testPolicy}</span>
        </div>
        <div className="row g-2">
          {entry ? (
            <Button size="sm" variant="soft" icon="check" onClick={() => removeCollegeEntry(entry.id)}>
              On your list
            </Button>
          ) : (
            <Button
              size="sm"
              icon="plus"
              onClick={() => {
                addToCollegeList(college.id);
                toast(`${college.shortName ?? college.name} added to your list.`, 'ok');
              }}
            >
              Add to list
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon="x"
            aria-label="Not interested"
            onClick={() => {
              recordFeedback({ targetType: 'college', targetId: college.id, kind: 'not-interested' });
              toast('Hidden. It will not appear in matches again.', 'default');
            }}
          />
          <Button size="sm" variant="ghost" to={`/app/colleges/${college.id}`} iconRight="chevron-right">
            Open
          </Button>
        </div>
      </div>
    </Card>
  );
}
