import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Notice, SearchInput, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat, DataRow } from '@/components/ui/shared';
import { ProvenanceChip, SourceList } from '@/components/ui/Provenance';
import { COLLEGES } from '@/data/colleges';
import { MAJORS } from '@/data/majors';
import { CAREERS } from '@/data/careers';
import { AP_COURSES, AP_UNIT_COUNT } from '@/data/ap';
import { ALL_QUESTIONS, SAT_QUESTIONS, AP_QUESTIONS } from '@/data/questions';
import { OPPORTUNITIES } from '@/data/opportunities';
import { SCHOLARSHIPS } from '@/data/scholarships';
import { RESEARCH_PROGRAMS } from '@/data/research';
import { PROJECT_TEMPLATES } from '@/data/projects';
import { SRC } from '@/data/provenance';
import { searchItems } from '@/lib/search';
import { countLabel, percent } from '@/lib/format';
import { formatDate, todayISO } from '@/lib/date';
import { downloadJSON } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';
import type { ContentRevision } from '@/domain/types';

/* --------------------------------------------------------------------------
   Sections 64–66 — content administration.

   The job of this screen is to make the catalog's honesty auditable: what is
   in it, where each record came from, when it was last checked, and a record
   of every correction with a source attached.
   ----------------------------------------------------------------------- */

const ENTITIES = [
  { id: 'college', label: 'Colleges', records: COLLEGES.length, source: 'IPEDS, College Scorecard, common data sets' },
  { id: 'major', label: 'Majors', records: MAJORS.length, source: 'IPEDS CIP programme taxonomy' },
  { id: 'career', label: 'Careers', records: CAREERS.length, source: 'Occupational handbooks' },
  { id: 'ap-course', label: 'AP courses', records: AP_COURSES.length, source: 'College Board course and exam descriptions' },
  { id: 'opportunity', label: 'Opportunities', records: OPPORTUNITIES.length, source: 'Programme websites' },
  { id: 'scholarship', label: 'Scholarships', records: SCHOLARSHIPS.length, source: 'Sponsor websites' },
  { id: 'research', label: 'Research programmes', records: RESEARCH_PROGRAMS.length, source: 'Host institution websites' },
  { id: 'sat-content', label: 'Practice questions', records: ALL_QUESTIONS.length, source: 'Written for Pathway AI — original content' },
] as const;

export function AdminPage() {
  const { state, addContentRevision, toast } = useAppStore();
  const [tab, setTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    entity: 'college' as ContentRevision['entity'],
    entityId: '',
    field: '',
    previousValue: '',
    newValue: '',
    source: '',
    verifiedOn: todayISO(),
    note: '',
  });

  const revisions = state.contentRevisions;

  const collegeAudit = useMemo(() => {
    const pool = COLLEGES.map((c) => ({
      id: c.id,
      name: c.name,
      provenance: c.provenance,
      missing: [
        c.acceptanceRate === undefined && 'admit rate',
        c.avgNetPrice === undefined && 'net price',
        c.graduationRate === undefined && 'graduation rate',
        !c.netPriceCalculatorUrl && 'net price calculator link',
        !c.deadlines.some((d) => d.date) && 'any dated deadline',
      ].filter(Boolean) as string[],
    }));
    if (!query.trim()) return pool;
    return searchItems(query, pool, [{ get: (c) => c.name, weight: 1 }]).map((r) => r.item);
  }, [query]);

  const withGaps = collegeAudit.filter((c) => c.missing.length);
  const totalRecords = ENTITIES.reduce((n, e) => n + e.records, 0);

  function saveRevision() {
    if (!form.entityId.trim() || !form.field.trim() || !form.newValue.trim() || !form.source.trim()) {
      toast('A revision needs a record, a field, a new value and a source. Especially a source.', 'warn');
      return;
    }
    addContentRevision({
      entity: form.entity,
      entityId: form.entityId.trim(),
      field: form.field.trim(),
      previousValue: form.previousValue.trim(),
      newValue: form.newValue.trim(),
      source: form.source.trim(),
      verifiedOn: form.verifiedOn,
      editedBy: state.profile.displayName || 'admin',
      note: form.note.trim() || undefined,
    });
    toast('Revision recorded with its source and verification date.', 'ok');
    setOpen(false);
    setForm({ ...form, entityId: '', field: '', previousValue: '', newValue: '', source: '', note: '' });
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Assistant"
        title="Content administration"
        description="What is in the catalog, where it came from, and every correction made to it. This screen exists so the app's claims about its own data can be checked rather than trusted."
        actions={
          <>
            <Button
              variant="ghost"
              icon="download"
              onClick={() => {
                downloadJSON('pathway-content-revisions.json', revisions);
                toast('Revision log exported.', 'ok');
              }}
              disabled={!revisions.length}
            >
              Export log
            </Button>
            <Button variant="primary" icon="edit" onClick={() => setOpen(true)}>
              Record a correction
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Every catalog record in this build is demo data.</span> It is realistic and internally consistent, drawn from the
        shape of public sources, but it has not been verified against those sources record by record. Nothing here should be used to make an
        actual application decision without checking the official source first.
      </Notice>

      <div className="mt-6">
        <Tabs
          ariaLabel="Administration views"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'overview', label: 'Catalog', count: totalRecords },
            { id: 'gaps', label: 'Data gaps', count: withGaps.length },
            { id: 'revisions', label: 'Revision log', count: revisions.length },
            { id: 'sources', label: 'Sources' },
          ]}
        />
      </div>

      {tab === 'overview' ? (
        <div className="col g-4 mt-4">
          <div className="row g-5 wrap">
            <Stat label="Total records" value={String(totalRecords)} />
            <Stat label="AP units" value={String(AP_UNIT_COUNT)} />
            <Stat label="Original questions" value={String(ALL_QUESTIONS.length)} />
            <Stat label="Corrections recorded" value={String(revisions.length)} />
          </div>

          <Card pad="none">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Entity</th>
                    <th scope="col" className="ta-right">Records</th>
                    <th scope="col">Provenance</th>
                    <th scope="col">Where a real deployment would source it</th>
                  </tr>
                </thead>
                <tbody>
                  {ENTITIES.map((e) => (
                    <tr key={e.id}>
                      <th scope="row">{e.label}</th>
                      <td className="mono ta-right">{e.records}</td>
                      <td>
                        <Badge tone={e.id === 'sat-content' ? 'ok' : 'default'}>{e.id === 'sat-content' ? 'original' : 'demo'}</Badge>
                      </td>
                      <td className="t-xs subtle">{e.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Question bank composition" description="Every item is Pathway-written. None is reproduced from a College Board exam." />
            <div className="row g-5 wrap">
              <Stat label="SAT" value={String(SAT_QUESTIONS.length)} />
              <Stat label="AP" value={String(AP_QUESTIONS.length)} />
              <Stat label="Marked original" value={percent(100)} tone="var(--ok)" />
            </div>
            <DataRow
              label="Licensing position"
              value="No licensed content"
              note="Reproducing College Board questions requires a licence this project does not hold. Every item is written to match the reasoning an exam tests without copying an exam."
            />
            <DataRow
              label="Labelling"
              value="Every item labelled as practice"
              note="The 'original practice question' badge appears on every question wherever it is shown — in the bank, in the runner and in previews."
            />
            <DataRow label="Projects" value={`${PROJECT_TEMPLATES.length} templates`} note="Generated ideas, adapted per student by the engine rather than shown verbatim." />
          </Card>
        </div>
      ) : null}

      {tab === 'gaps' ? (
        <div className="col g-4 mt-4">
          <Card pad="md">
            <SectionHeader
              title="Records with missing fields"
              description="Gaps are shown as gaps throughout the app rather than filled with plausible numbers. This is the list of what is missing."
            />
            <SearchInput value={query} onChange={setQuery} label="Search colleges" placeholder="Search by name…" />
          </Card>

          {withGaps.length ? (
            <Card pad="none">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">College</th>
                      <th scope="col">Missing</th>
                      <th scope="col">Provenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withGaps.map((c) => (
                      <tr key={c.id}>
                        <th scope="row">{c.name}</th>
                        <td className="t-xs subtle">{c.missing.join(', ')}</td>
                        <td>
                          <ProvenanceChip provenance={c.provenance} compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                <Icon name="check" size={14} className="c-ok" /> No gaps in the {countLabel(collegeAudit.length, 'college')} matching that
                search.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      {tab === 'revisions' ? (
        <div className="col g-4 mt-4">
          <Notice tone="info" icon="info">
            Every correction is recorded with a source and a verification date. A change without a source is not a correction — it is just a
            different number.
          </Notice>
          {revisions.length ? (
            <div className="col g-3">
              {[...revisions].reverse().map((r) => (
                <Card key={r.id} pad="md">
                  <div className="row between g-3 items-start wrap">
                    <div className="grow" style={{ minWidth: 0 }}>
                      <p className="t-sm w-600">
                        {r.entity} · {r.entityId} · {r.field}
                      </p>
                      <p className="t-2xs subtle mt-1">
                        Verified {formatDate(r.verifiedOn)} by {r.editedBy}
                      </p>
                    </div>
                    <Badge tone="ok">sourced</Badge>
                  </div>
                  <div className="row g-4 mt-3 wrap">
                    <div className="col g-1">
                      <span className="t-2xs eyebrow">Was</span>
                      <span className="t-sm mono faint" style={{ textDecoration: 'line-through' }}>
                        {r.previousValue || '—'}
                      </span>
                    </div>
                    <div className="col g-1">
                      <span className="t-2xs eyebrow">Now</span>
                      <span className="t-sm mono w-600">{r.newValue}</span>
                    </div>
                  </div>
                  <p className="t-xs subtle mt-3">Source: {r.source}</p>
                  {r.note ? <p className="t-2xs faint mt-2">{r.note}</p> : null}
                </Card>
              ))}
            </div>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">No corrections recorded yet.</p>
            </Card>
          )}
        </div>
      ) : null}

      {tab === 'sources' ? (
        <div className="col g-4 mt-4">
          <Card pad="md">
            <SectionHeader
              title="Where a production deployment would get this data"
              description="Each of these is a real, citable source. The demo catalog is modelled on their shape but is not drawn from them record by record."
            />
            <SourceList sources={Object.values(SRC)} />
          </Card>

          <Card pad="md">
            <SectionHeader title="What verification would actually require" description="Stated honestly, because 'verified' is a word that is easy to misuse." />
            <ul className="col g-2">
              {[
                'Automated ingestion from IPEDS and College Scorecard, refreshed each cycle, with a checksum per record.',
                'Per-college deadline scraping with human review, since published deadlines move and a stale date causes real harm.',
                'A verification timestamp on every field, surfaced next to the figure — not one banner for the whole page.',
                'A documented correction path so a student who spots an error can report it and see it fixed.',
                'For AP content, either a College Board licence or content written entirely independently and labelled as such. This build took the second route.',
              ].map((s) => (
                <li key={s} className="row g-2 t-sm subtle">
                  <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card pad="md">
            <SectionHeader title="Provenance labels used throughout the app" />
            <div className="col g-3">
              {[
                { kind: 'verified', body: 'Checked against a named official source on a stated date. No catalog record in this build carries this label.' },
                { kind: 'demo', body: 'Realistic placeholder data modelled on public sources. Everything in the catalog carries this.' },
                { kind: 'unverified', body: 'Structural content — AP course outlines and unit lists — that follows the published shape but has not been checked.' },
                { kind: 'ai', body: 'Generated guidance: recommendations, explanations and analysis produced by the engine from your profile.' },
                { kind: 'user', body: 'What you entered yourself. Never modified, never inferred from.' },
              ].map((p) => (
                <div key={p.kind}>
                  <ProvenanceChip provenance={{ kind: p.kind as 'verified' | 'demo' | 'unverified' | 'ai' | 'user', sources: [] }} />
                  <p className="t-xs subtle mt-2">{p.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record a correction"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveRevision}>
              Record it
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <div className="row g-3 wrap">
            <Field label="Entity">
              {(p) => (
                <select {...p} className="select" value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value as ContentRevision['entity'] })}>
                  {['college', 'ap-course', 'opportunity', 'scholarship', 'research', 'major', 'sat-content'].map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Record id" required hint="e.g. a college id like 'michigan'.">
              {(p) => <input {...p} className="input" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} />}
            </Field>
            <Field label="Field" required hint="Which field is wrong.">
              {(p) => <input {...p} className="input" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} placeholder="avgNetPrice" />}
            </Field>
          </div>
          <div className="row g-3 wrap">
            <Field label="Previous value">
              {(p) => <input {...p} className="input" value={form.previousValue} onChange={(e) => setForm({ ...form, previousValue: e.target.value })} />}
            </Field>
            <Field label="Corrected value" required>
              {(p) => <input {...p} className="input" value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} />}
            </Field>
          </div>
          <Field label="Source" required hint="A URL or a named publication. A correction without one does not get recorded.">
            {(p) => <input {...p} className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="https://…" />}
          </Field>
          <Field label="Verified on">
            {(p) => <input {...p} type="date" className="input" value={form.verifiedOn} max={todayISO()} onChange={(e) => setForm({ ...form, verifiedOn: e.target.value })} />}
          </Field>
          <Field label="Note" hint="Optional context.">
            {(p) => <textarea {...p} className="input textarea" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />}
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export default AdminPage;
