import { Fragment, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { Badge, Button, Card, Modal, SearchInput } from '@/components/ui/primitives';
import { PageHeader } from '@/components/ui/shared';
import { DemoDataBanner } from '@/components/ui/Provenance';
import { MAJOR_BY_ID, MAJORS } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { buildStudentDNA } from '@/domain/engine/dna';
import { searchItems } from '@/lib/search';
import { downloadCSV } from '@/lib/export';
import { useAppStore } from '@/store/useAppStore';
import { Icon } from '@/components/ui/Icon';
import type { Major } from '@/domain/types';

/* Section 14 — major comparison. Rows, not a winner. */

const INTENSITY = ['', 'very light', 'light', 'moderate', 'heavy', 'very heavy'];

interface Row {
  label: string;
  group: string;
  render: (m: Major) => React.ReactNode;
  raw: (m: Major) => string;
}

const ROWS: Row[] = [
  { label: 'Family', group: 'Overview', render: (m) => m.family, raw: (m) => m.family },
  { label: 'In one line', group: 'Overview', render: (m) => <span className="t-xs subtle">{m.summary}</span>, raw: (m) => m.summary },
  {
    label: 'What you study',
    group: 'The work',
    render: (m) => (
      <ul className="col g-1">
        {m.whatYouStudy.slice(0, 4).map((w) => (
          <li key={w} className="t-xs subtle">
            • {w}
          </li>
        ))}
      </ul>
    ),
    raw: (m) => m.whatYouStudy.join('; '),
  },
  {
    label: 'Quantitative load',
    group: 'The work',
    render: (m) => <span>{INTENSITY[m.mathIntensity]} ({m.mathIntensity}/5)</span>,
    raw: (m) => `${INTENSITY[m.mathIntensity]} (${m.mathIntensity}/5)`,
  },
  {
    label: 'Writing load',
    group: 'The work',
    render: (m) => <span>{INTENSITY[m.writingIntensity]} ({m.writingIntensity}/5)</span>,
    raw: (m) => `${INTENSITY[m.writingIntensity]} (${m.writingIntensity}/5)`,
  },
  {
    label: 'Lab / studio load',
    group: 'The work',
    render: (m) => <span>{INTENSITY[m.labIntensity]} ({m.labIntensity}/5)</span>,
    raw: (m) => `${INTENSITY[m.labIntensity]} (${m.labIntensity}/5)`,
  },
  {
    label: 'Skills built',
    group: 'The work',
    render: (m) => (
      <div className="row g-1 wrap">
        {m.skills.slice(0, 5).map((s) => (
          <span key={s} className="chip chip-static chip-sm">
            {s}
          </span>
        ))}
      </div>
    ),
    raw: (m) => m.skills.join('; '),
  },
  {
    label: 'AP that genuinely prepares',
    group: 'Preparation',
    render: (m) => (
      <div className="row g-1 wrap">
        {m.recommendedAP.map((id) => (
          <span key={id} className="chip chip-static chip-sm">
            {AP_COURSE_BY_ID.get(id)?.name ?? id}
          </span>
        ))}
      </div>
    ),
    raw: (m) => m.recommendedAP.map((id) => AP_COURSE_BY_ID.get(id)?.name ?? id).join('; '),
  },
  {
    label: 'Ways to test it early',
    group: 'Preparation',
    render: (m) => (
      <ul className="col g-1">
        {m.projectIdeas.slice(0, 3).map((p) => (
          <li key={p} className="t-xs subtle">
            • {p}
          </li>
        ))}
      </ul>
    ),
    raw: (m) => m.projectIdeas.join('; '),
  },
  {
    label: 'Common careers',
    group: 'Where it leads',
    render: (m) => (
      <div className="row g-1 wrap">
        {m.careers.slice(0, 5).map((c) => (
          <Link key={c} to={`/app/careers/${c}`} className="chip chip-sm">
            {CAREER_BY_ID.get(c)?.name ?? c}
          </Link>
        ))}
      </div>
    ),
    raw: (m) => m.careers.map((c) => CAREER_BY_ID.get(c)?.name ?? c).join('; '),
  },
  {
    label: 'Research directions',
    group: 'Where it leads',
    render: (m) => (
      <ul className="col g-1">
        {m.researchDirections.slice(0, 3).map((r) => (
          <li key={r} className="t-xs subtle">
            • {r}
          </li>
        ))}
      </ul>
    ),
    raw: (m) => m.researchDirections.join('; '),
  },
  {
    label: 'Close alternatives',
    group: 'Where it leads',
    render: (m) => (
      <div className="row g-1 wrap">
        {m.relatedMajors.map((id) => (
          <Link key={id} to={`/app/majors/${id}`} className="chip chip-sm">
            {MAJOR_BY_ID.get(id)?.name ?? id}
          </Link>
        ))}
      </div>
    ),
    raw: (m) => m.relatedMajors.map((id) => MAJOR_BY_ID.get(id)?.name ?? id).join('; '),
  },
];

const GROUPS = Array.from(new Set(ROWS.map((r) => r.group)));

export function MajorCompare() {
  const ctx = useEngine();
  const { toast } = useAppStore();
  const [params, setParams] = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);

  const selected = useMemo(() => {
    const fromUrl = params.getAll('a').filter((id) => MAJOR_BY_ID.has(id));
    if (fromUrl.length) return fromUrl.slice(0, 4);
    const seeds = [...ctx.majorIds, ...dna.majorMatches.map((m) => m.majorId)];
    return Array.from(new Set(seeds)).slice(0, 3);
  }, [params, ctx.majorIds, dna.majorMatches]);

  const majors = selected.map((id) => MAJOR_BY_ID.get(id)).filter((m): m is Major => Boolean(m));

  function setSelection(ids: string[]) {
    const next = new URLSearchParams();
    for (const id of ids.slice(0, 4)) next.append('a', id);
    setParams(next, { replace: true });
  }

  const candidates = useMemo(() => {
    const pool = MAJORS.filter((m) => m.id !== 'undecided' && !selected.includes(m.id));
    if (!query.trim()) return pool;
    return searchItems(query, pool, [
      { get: (m) => m.name, weight: 1 },
      { get: (m) => m.family, weight: 0.6 },
      { get: (m) => m.skills, weight: 0.5 },
    ]).map((r) => r.item);
  }, [query, selected]);

  function exportCsv() {
    downloadCSV(
      'pathway-major-comparison.csv',
      ROWS.map((r) => {
        const row: Record<string, unknown> = { Attribute: r.label, Group: r.group };
        for (const m of majors) row[m.name] = r.raw(m);
        return row;
      }),
    );
    toast('Comparison exported as CSV.', 'ok');
  }

  return (
    <div className="page page-wide">
      <PageHeader
        eyebrow="Academics"
        title="Compare majors"
        description="Attribute by attribute, so you can see where two fields genuinely differ. There is no combined score here and no winner — the right choice depends on what you want your weeks to look like."
        back={{ to: '/app/majors', label: 'All majors' }}
        actions={
          <>
            <Button variant="ghost" icon="plus" onClick={() => setPickerOpen(true)} disabled={majors.length >= 4}>
              Add major
            </Button>
            <Button variant="ghost" icon="download" onClick={exportCsv} disabled={!majors.length}>
              Export CSV
            </Button>
          </>
        }
      />

      <DemoDataBanner what="Course lists, competitions and project ideas" />

      {majors.length ? (
        <Card pad="none" className="mt-4">
          <div className="table-wrap">
            <table className="table table-compare">
              <thead>
                <tr>
                  <th scope="col" style={{ minWidth: 190 }}>
                    Attribute
                  </th>
                  {majors.map((m) => (
                    <th key={m.id} scope="col" style={{ minWidth: 240 }}>
                      <div className="row between g-2 items-start">
                        <div>
                          <Link to={`/app/majors/${m.id}`}>{m.name}</Link>
                          {ctx.majorIds.includes(m.id) ? (
                            <span className="block">
                              <Badge tone="info">Your direction</Badge>
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="subtle"
                          aria-label={`Remove ${m.name} from the comparison`}
                          onClick={() => setSelection(selected.filter((id) => id !== m.id))}
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((group) => (
                  <Fragment key={group}>
                    <tr>
                      <th scope="row" colSpan={majors.length + 1} className="t-2xs eyebrow">
                        {group}
                      </th>
                    </tr>
                    {ROWS.filter((r) => r.group === group).map((row) => (
                      <tr key={row.label}>
                        <th scope="row" className="t-xs">
                          {row.label}
                        </th>
                        {majors.map((m) => (
                          <td key={m.id} className="t-sm">
                            {row.render(m)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card pad="lg" className="mt-4">
          <p className="t-sm subtle ta-center">
            Nothing to compare yet.{' '}
            <button type="button" className="c-accent" onClick={() => setPickerOpen(true)}>
              Add a major
            </button>{' '}
            to start.
          </p>
        </Card>
      )}

      <Card pad="md" className="mt-6">
        <h2 className="t-sm w-600">How to read this</h2>
        <p className="t-xs subtle mt-2">
          Load ratings describe the shape of the work, not its difficulty — a heavy writing load is only a problem if you dislike writing.
          Career rows list where graduates commonly go; they are not exclusive, and almost every career here is reachable from several of these
          majors. If two columns look nearly identical, that is a real finding: the decision may matter less than you think, and you can defer it.
        </p>
      </Card>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add a major to the comparison" size="md">
        <SearchInput value={query} onChange={setQuery} label="Search majors" placeholder="Search…" />
        <div className="col g-1 mt-3" style={{ maxHeight: 380, overflowY: 'auto' }}>
          {candidates.slice(0, 40).map((m) => (
            <button
              key={m.id}
              type="button"
              className="list-row"
              onClick={() => {
                setSelection([...selected, m.id]);
                setPickerOpen(false);
                setQuery('');
              }}
            >
              <span className="col g-0 ta-left">
                <span className="t-sm w-600">{m.name}</span>
                <span className="t-2xs subtle">{m.family}</span>
              </span>
              <Icon name="plus" size={14} />
            </button>
          ))}
          {!candidates.length ? <p className="t-sm subtle ta-center p-4">No majors matched.</p> : null}
        </div>
      </Modal>
    </div>
  );
}
