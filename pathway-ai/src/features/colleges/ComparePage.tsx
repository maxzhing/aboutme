import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, EmptyState, Notice } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/shared';
import { DemoDataBanner } from '@/components/ui/Provenance';
import { COLLEGES, COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { matchColleges } from '@/domain/engine/collegeMatch';
import { BAND_LABEL } from '@/domain/engine/explain';
import { currency, listJoin, number, percent } from '@/lib/format';
import { useLocalState } from '@/components/ui/primitives';
import { downloadCSV } from '@/lib/export';

/* Section 7 — comparison board. Dimension by dimension, never one score. */

type RowKind = 'text' | 'number' | 'boolean' | 'list' | 'fit';

interface CompareRow {
  label: string;
  group: string;
  kind: RowKind;
  get: (collegeId: string) => React.ReactNode;
  /** Text used for the CSV export. */
  raw: (collegeId: string) => string | number;
}

export function ComparePage() {
  const ctx = useEngine();
  const { state, toast } = useAppStore();
  const [selected, setSelected] = useLocalState<string[]>(
    'compare',
    state.collegeList.slice(0, 4).map((e) => e.collegeId),
  );
  const [adding, setAdding] = useState(false);

  const matches = useMemo(() => matchColleges(ctx, { respectExclusions: false }), [ctx]);
  const matchById = useMemo(() => new Map(matches.map((m) => [m.collegeId, m])), [matches]);

  const rows: CompareRow[] = useMemo(() => {
    const dim = (key: 'academic' | 'personal' | 'opportunity' | 'financial', label: string): CompareRow => ({
      label,
      group: 'Your fit',
      kind: 'fit',
      get: (id) => {
        const d = matchById.get(id)?.dimensions.find((x) => x.key === key);
        if (!d) return '—';
        return (
          <div className="col g-1">
            <Badge tone={d.band === 'strong' ? 'ok' : d.band === 'good' ? 'accent' : d.band === 'moderate' ? 'warn' : 'default'}>
              {BAND_LABEL[d.band]}
            </Badge>
            {d.reasons[0] ? <span className="t-2xs subtle clamp-2">{d.reasons[0]}</span> : null}
          </div>
        );
      },
      raw: (id) => matchById.get(id)?.dimensions.find((x) => x.key === key)?.score ?? '',
    });

    return [
      dim('academic', 'Academic fit'),
      dim('personal', 'Personal fit'),
      dim('opportunity', 'Opportunity fit'),
      dim('financial', 'Financial fit'),
      {
        label: 'Your majors offered',
        group: 'Academics',
        kind: 'list',
        get: (id) => {
          const c = COLLEGE_BY_ID.get(id);
          if (!c || !ctx.majorIds.length) return <span className="subtle">No majors set</span>;
          const offered = ctx.majorIds.filter((m) => c.majors.includes(m));
          const missing = ctx.majorIds.filter((m) => !c.majors.includes(m));
          return (
            <div className="col g-1">
              {offered.map((m) => (
                <span key={m} className="row g-1 t-xs">
                  <Icon name="check" size={12} className="c-ok" />
                  {MAJOR_BY_ID.get(m)?.name}
                </span>
              ))}
              {missing.map((m) => (
                <span key={m} className="row g-1 t-xs subtle">
                  <Icon name="x" size={12} className="c-danger" />
                  {MAJOR_BY_ID.get(m)?.name}
                </span>
              ))}
            </div>
          );
        },
        raw: (id) => {
          const c = COLLEGE_BY_ID.get(id);
          return c ? ctx.majorIds.filter((m) => c.majors.includes(m)).map((m) => MAJOR_BY_ID.get(m)?.name).join('; ') : '';
        },
      },
      {
        label: 'Known for',
        group: 'Academics',
        kind: 'list',
        get: (id) => (
          <div className="tag-list">
            {(COLLEGE_BY_ID.get(id)?.strengths ?? []).slice(0, 4).map((s) => (
              <span key={s} className="badge">
                {MAJOR_BY_ID.get(s)?.name ?? s}
              </span>
            ))}
          </div>
        ),
        raw: (id) => (COLLEGE_BY_ID.get(id)?.strengths ?? []).map((s) => MAJOR_BY_ID.get(s)?.name ?? s).join('; '),
      },
      {
        label: 'Signature programmes',
        group: 'Academics',
        kind: 'list',
        get: (id) => (
          <ul className="col g-1">
            {(COLLEGE_BY_ID.get(id)?.signaturePrograms ?? []).slice(0, 2).map((p) => (
              <li key={p.name} className="t-xs">
                {p.name}
              </li>
            ))}
          </ul>
        ),
        raw: (id) => (COLLEGE_BY_ID.get(id)?.signaturePrograms ?? []).map((p) => p.name).join('; '),
      },
      { label: 'Location', group: 'Place', kind: 'text', get: (id) => `${COLLEGE_BY_ID.get(id)?.city}, ${COLLEGE_BY_ID.get(id)?.state}`, raw: (id) => `${COLLEGE_BY_ID.get(id)?.city}, ${COLLEGE_BY_ID.get(id)?.state}` },
      { label: 'Setting', group: 'Place', kind: 'text', get: (id) => COLLEGE_BY_ID.get(id)?.setting ?? '—', raw: (id) => COLLEGE_BY_ID.get(id)?.setting ?? '' },
      { label: 'Undergraduates', group: 'Place', kind: 'number', get: (id) => number(COLLEGE_BY_ID.get(id)?.undergradEnrollment), raw: (id) => COLLEGE_BY_ID.get(id)?.undergradEnrollment ?? '' },
      { label: 'Public or private', group: 'Place', kind: 'text', get: (id) => COLLEGE_BY_ID.get(id)?.control ?? '—', raw: (id) => COLLEGE_BY_ID.get(id)?.control ?? '' },
      { label: 'Acceptance rate', group: 'Admissions', kind: 'number', get: (id) => (COLLEGE_BY_ID.get(id)?.acceptanceRate !== undefined ? percent(COLLEGE_BY_ID.get(id)!.acceptanceRate) : '—'), raw: (id) => COLLEGE_BY_ID.get(id)?.acceptanceRate ?? '' },
      { label: 'Testing policy', group: 'Admissions', kind: 'text', get: (id) => COLLEGE_BY_ID.get(id)?.testPolicy ?? '—', raw: (id) => COLLEGE_BY_ID.get(id)?.testPolicy ?? '' },
      { label: 'SAT middle 50%', group: 'Admissions', kind: 'text', get: (id) => { const c = COLLEGE_BY_ID.get(id); return c?.sat25 ? `${c.sat25}–${c.sat75}` : 'Not used'; }, raw: (id) => { const c = COLLEGE_BY_ID.get(id); return c?.sat25 ? `${c.sat25}-${c.sat75}` : ''; } },
      { label: 'Graduation rate', group: 'Admissions', kind: 'number', get: (id) => (COLLEGE_BY_ID.get(id)?.graduationRate ? percent(COLLEGE_BY_ID.get(id)!.graduationRate) : '—'), raw: (id) => COLLEGE_BY_ID.get(id)?.graduationRate ?? '' },
      { label: 'Application rounds', group: 'Admissions', kind: 'list', get: (id) => (COLLEGE_BY_ID.get(id)?.deadlines ?? []).map((d) => d.kind).join(', '), raw: (id) => (COLLEGE_BY_ID.get(id)?.deadlines ?? []).map((d) => d.kind).join(', ') },
      { label: 'Published total cost', group: 'Cost', kind: 'number', get: (id) => { const c = COLLEGE_BY_ID.get(id); return currency((c?.tuitionOutState ?? 0) + (c?.roomAndBoard ?? 0)); }, raw: (id) => { const c = COLLEGE_BY_ID.get(id); return (c?.tuitionOutState ?? 0) + (c?.roomAndBoard ?? 0); } },
      { label: 'Average net price', group: 'Cost', kind: 'number', get: (id) => currency(COLLEGE_BY_ID.get(id)?.avgNetPrice), raw: (id) => COLLEGE_BY_ID.get(id)?.avgNetPrice ?? '' },
      { label: 'Meets full need', group: 'Cost', kind: 'boolean', get: (id) => (COLLEGE_BY_ID.get(id)?.meetsFullNeed ? <Icon name="check" size={15} className="c-ok" /> : <span className="subtle t-xs">Not recorded</span>), raw: (id) => (COLLEGE_BY_ID.get(id)?.meetsFullNeed ? 'Yes' : 'No') },
      { label: 'Merit aid', group: 'Cost', kind: 'boolean', get: (id) => (COLLEGE_BY_ID.get(id)?.meritAid ? <Icon name="check" size={15} className="c-ok" /> : <span className="subtle t-xs">Not recorded</span>), raw: (id) => (COLLEGE_BY_ID.get(id)?.meritAid ? 'Yes' : 'No') },
      { label: 'AP credit policy', group: 'Academics', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.apCreditPolicy ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.apCreditPolicy ?? '' },
      { label: 'Undergraduate research', group: 'Opportunities', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.opportunities.undergradResearch ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.opportunities.undergradResearch ?? '' },
      { label: 'Co-op / internships', group: 'Opportunities', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.opportunities.coop ?? COLLEGE_BY_ID.get(id)?.opportunities.internships ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.opportunities.coop ?? COLLEGE_BY_ID.get(id)?.opportunities.internships ?? '' },
      { label: 'Study abroad', group: 'Opportunities', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.opportunities.studyAbroad ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.opportunities.studyAbroad ?? '' },
      { label: 'Housing', group: 'Student life', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.studentLife.housing ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.studentLife.housing ?? '' },
      { label: 'Athletics', group: 'Student life', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.studentLife.athletics ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.studentLife.athletics ?? '' },
      { label: 'Music', group: 'Student life', kind: 'text', get: (id) => <span className="t-xs">{COLLEGE_BY_ID.get(id)?.studentLife.music ?? 'Not recorded'}</span>, raw: (id) => COLLEGE_BY_ID.get(id)?.studentLife.music ?? '' },
    ];
  }, [ctx.majorIds, matchById]);

  const groups = useMemo(() => Array.from(new Set(rows.map((r) => r.group))), [rows]);

  const exportCompare = () => {
    downloadCSV(
      'pathway-college-comparison.csv',
      rows.map((r) => {
        const row: Record<string, unknown> = { Dimension: r.label, Group: r.group };
        for (const id of selected) row[COLLEGE_BY_ID.get(id)?.shortName ?? id] = r.raw(id);
        return row;
      }),
    );
    toast('Comparison exported as CSV.', 'ok');
  };

  return (
    <div className="page page-wide">
      <PageHeader
        eyebrow="Compare"
        title="Comparison board"
        description="Dimension by dimension. We deliberately do not compute an overall score, because a single number hides the trade-off you actually need to see."
        actions={
          <>
            <Button size="sm" icon="plus" onClick={() => setAdding(true)}>
              Add college
            </Button>
            {selected.length ? (
              <Button size="sm" icon="download" onClick={exportCompare}>
                Export CSV
              </Button>
            ) : null}
          </>
        }
      />

      {selected.length ? (
        <>
          <DemoDataBanner what="Every figure in this table" />

          <div className="row g-2 mb-4 wrap">
            {selected.map((id) => (
              <span key={id} className="chip">
                {COLLEGE_BY_ID.get(id)?.shortName ?? id}
                <button type="button" className="chip-remove" onClick={() => setSelected(selected.filter((s) => s !== id))} aria-label={`Remove ${COLLEGE_BY_ID.get(id)?.name}`}>
                  <Icon name="x" size={11} />
                </button>
              </span>
            ))}
          </div>

          <div className="table-wrap">
            <table className="table table-compare">
              <thead>
                <tr>
                  <th scope="col">Dimension</th>
                  {selected.map((id) => (
                    <th key={id} scope="col">
                      <Link to={`/app/colleges/${id}`} style={{ color: 'inherit' }}>
                        {COLLEGE_BY_ID.get(id)?.shortName ?? id}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <>
                    <tr key={`g-${group}`}>
                      <th scope="row" colSpan={selected.length + 1} style={{ background: 'var(--surface-2)', paddingTop: 12 }}>
                        <span className="eyebrow">{group}</span>
                      </th>
                    </tr>
                    {rows
                      .filter((r) => r.group === group)
                      .map((r) => (
                        <tr key={r.label}>
                          <th scope="row">{r.label}</th>
                          {selected.map((id) => (
                            <td key={id}>{r.get(id)}</td>
                          ))}
                        </tr>
                      ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <Notice tone="info" className="mt-5">
            <strong>How to read this.</strong> Look for the dimension where the colleges genuinely differ — usually cost, size
            or a specific programme. A college that wins on three rows and loses badly on the one that matters most to you is
            not the better choice.
          </Notice>

          {ctx.majorIds.length ? (
            <Card pad="md" className="mt-5">
              <p className="t-sm">
                <strong>Reading this against {listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}:</strong>{' '}
                check the "Your majors offered" row first. A college that does not offer what you want to study is not a
                trade-off, it is a disqualification — unless you are genuinely open to changing direction.
              </p>
            </Card>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon="grid"
          title="Nothing to compare yet"
          description="Add at least two colleges to see them side by side."
          action={
            <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
              Add colleges
            </Button>
          }
        />
      )}

      {adding ? (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setAdding(false)}>
          <div className="modal modal-lg" role="dialog" aria-modal="true" aria-label="Add colleges to compare">
            <div className="modal-head">
              <h2 className="modal-title">Add colleges to compare</h2>
              <Button variant="ghost" size="sm" icon="x" onClick={() => setAdding(false)} aria-label="Close" />
            </div>
            <div className="modal-body">
              {state.collegeList.length ? (
                <>
                  <p className="eyebrow mb-3">From your list</p>
                  <div className="tag-list mb-5">
                    {state.collegeList.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="chip"
                        aria-pressed={selected.includes(e.collegeId)}
                        onClick={() =>
                          setSelected(selected.includes(e.collegeId) ? selected.filter((s) => s !== e.collegeId) : [...selected, e.collegeId])
                        }
                      >
                        {COLLEGE_BY_ID.get(e.collegeId)?.shortName ?? e.collegeId}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              <p className="eyebrow mb-3">All colleges</p>
              <div className="tag-list">
                {COLLEGES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip chip-sm"
                    aria-pressed={selected.includes(c.id)}
                    onClick={() => setSelected(selected.includes(c.id) ? selected.filter((s) => s !== c.id) : [...selected, c.id])}
                  >
                    {c.shortName ?? c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <Button variant="primary" onClick={() => setAdding(false)}>
                Done ({selected.length} selected)
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
