import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { buildRecommendationPacket } from '@/domain/engine/writing';
import { countLabel } from '@/lib/format';
import { formatDate, todayISO } from '@/lib/date';
import { downloadJSON, printPDF } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';
import type { RecommendationPacket } from '@/domain/types';

/* Section 42 — recommendations: who to ask, when, and what to give them. */

const STATUS_TONE: Record<RecommendationPacket['status'], 'default' | 'accent' | 'warn' | 'ok'> = {
  planned: 'default',
  asked: 'accent',
  confirmed: 'warn',
  submitted: 'ok',
};

const EMPTY = {
  recommenderName: '',
  relationship: '',
  courseOrContext: '',
  dueDate: '',
  memories: [] as string[],
  goalsNote: '',
};

export function RecommendationsPage() {
  const ctx = useEngine();
  const { state, addRecommendationPacket, updateRecommendationPacket, removeRecommendationPacket, toast } = useAppStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [memory, setMemory] = useState('');
  const [viewing, setViewing] = useState<string | undefined>(undefined);

  const packets = state.recommendationPackets;
  const viewingPacket = packets.find((p) => p.id === viewing);
  const content = useMemo(
    () => (viewingPacket ? buildRecommendationPacket(ctx, viewingPacket) : undefined),
    [ctx, viewingPacket],
  );

  function save() {
    if (!form.recommenderName.trim() || !form.relationship.trim()) {
      toast('A recommender needs a name and how they know you.', 'warn');
      return;
    }
    addRecommendationPacket({
      recommenderName: form.recommenderName.trim(),
      relationship: form.relationship.trim(),
      courseOrContext: form.courseOrContext.trim() || undefined,
      dueDate: form.dueDate || undefined,
      status: 'planned',
      includeActivityIds: [],
      includeAwardIds: [],
      memories: form.memories,
      goalsNote: form.goalsNote.trim() || undefined,
    });
    toast('Recommender added.', 'ok');
    setOpen(false);
    setForm(EMPTY);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Applications"
        title="Recommendations"
        description="Who to ask, when to ask them, and a packet of what you have actually done — so the person writing for you has specifics rather than adjectives."
        back={{ to: '/app/applications', label: 'Applications' }}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
            Add a recommender
          </Button>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">Never draft your own letter, and never ask a tool to.</span> If a teacher asks you to write something they will
        sign, that is a conversation to have with your counselor. A letter in your own voice, or a generated one, is straightforwardly dishonest
        and reads as such to people who have read thousands.
      </Notice>

      {packets.length ? (
        <div className="col g-3 mt-6">
          {packets.map((p) => (
            <Card key={p.id} pad="md" hover>
              <div className="row between g-3 items-start wrap">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row g-2 items-center wrap">
                    <h3 className="t-md w-600">{p.recommenderName}</h3>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </div>
                  <p className="t-2xs subtle mt-1">
                    {p.relationship}
                    {p.courseOrContext ? ` · ${p.courseOrContext}` : ''}
                    {p.dueDate ? ` · due ${formatDate(p.dueDate)}` : ''}
                  </p>
                </div>
                <div className="row g-2">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(p.id)}>
                    Build packet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="trash"
                    aria-label={`Remove ${p.recommenderName}`}
                    onClick={() => removeRecommendationPacket(p.id)}
                  />
                </div>
              </div>

              <div className="row g-2 mt-4 wrap">
                {(['planned', 'asked', 'confirmed', 'submitted'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip chip-sm"
                    aria-pressed={p.status === s}
                    onClick={() => updateRecommendationPacket(p.id, { status: s, requestedAt: s === 'asked' ? todayISO() : p.requestedAt })}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {p.memories.length ? (
                <div className="mt-4">
                  <p className="t-2xs eyebrow mb-2">What you want them to remember</p>
                  <ul className="col g-1">
                    {p.memories.map((m) => (
                      <li key={m} className="t-xs subtle">
                        • {m}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card pad="lg" className="mt-6">
          <p className="t-sm subtle ta-center">
            No recommenders yet. Most applications ask for two teachers and a counselor — add them here and you can build each one a packet.
          </p>
          <div className="row center mt-4">
            <Button icon="plus" onClick={() => setOpen(true)}>
              Add your first recommender
            </Button>
          </div>
        </Card>
      )}

      <Card pad="md" className="mt-6">
        <SectionHeader title="How to ask" description="The mechanics matter more than most students expect." />
        <ol className="col g-2">
          {[
            'Ask in person where you can, and early — by the spring of grade 11 if the letter is for autumn applications. Teachers write dozens; the ones who agreed first get the most time.',
            'Ask someone who saw you struggle with something and get better at it. A teacher who gave you an A but never spoke to you cannot write a specific letter.',
            'Say explicitly that they should decline if they cannot write strongly. A lukewarm letter does real damage, and giving them an exit is a kindness.',
            'Give them the packet below, a deadline, and then leave them alone until a polite reminder two weeks out.',
            'Waive your right to see the letter. Unwaived letters are read as less credible.',
            'Write a thank-you note afterwards, and tell them where you ended up going.',
          ].map((s, i) => (
            <li key={s} className="row g-2 t-sm subtle">
              <span className="step-num">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a recommender"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Add recommender
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <div className="row g-3 wrap">
            <Field label="Name" required>
              {(p) => <input {...p} className="input" value={form.recommenderName} onChange={(e) => setForm({ ...form, recommenderName: e.target.value })} placeholder="Ms Alvarez" />}
            </Field>
            <Field label="How they know you" required>
              {(p) => <input {...p} className="input" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Chemistry teacher" />}
            </Field>
          </div>
          <div className="row g-3 wrap">
            <Field label="Course or context" hint="Optional — which class, which year.">
              {(p) => <input {...p} className="input" value={form.courseOrContext} onChange={(e) => setForm({ ...form, courseOrContext: e.target.value })} placeholder="AP Chemistry, grade 11" />}
            </Field>
            <Field label="Due date" hint="Optional.">
              {(p) => <input {...p} type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />}
            </Field>
          </div>

          <div>
            <p className="label">Moments you want them to remember</p>
            <p className="hint mb-2">
              In your own words. These go in the packet as notes from you — they are never presented as things the recommender said or thought.
            </p>
            {form.memories.length ? (
              <div className="col g-2 mb-3">
                {form.memories.map((m, i) => (
                  <div key={m} className="row between g-2">
                    <span className="t-sm">{m}</span>
                    <button type="button" className="subtle" aria-label={`Remove ${m}`} onClick={() => setForm({ ...form, memories: form.memories.filter((_, x) => x !== i) })}>
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="row g-2">
              <input
                className="input grow"
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                placeholder="The titration lab I redid three times until it worked"
                aria-label="A moment to remember"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && memory.trim()) {
                    e.preventDefault();
                    setForm({ ...form, memories: [...form.memories, memory.trim()] });
                    setMemory('');
                  }
                }}
              />
              <Button
                variant="ghost"
                icon="plus"
                onClick={() => {
                  if (!memory.trim()) return;
                  setForm({ ...form, memories: [...form.memories, memory.trim()] });
                  setMemory('');
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <Field label="What you are hoping to study" hint="Optional. Helps them connect the letter to where you are going.">
            {(p) => <textarea {...p} className="input textarea" rows={3} value={form.goalsNote} onChange={(e) => setForm({ ...form, goalsNote: e.target.value })} />}
          </Field>
        </div>
      </Modal>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(undefined)} title={`Packet for ${viewingPacket?.recommenderName ?? ''}`} size="lg">
        {content && viewingPacket ? (
          <div className="col g-4">
            <Notice tone="info" icon="info">
              Print this and give it to them, or paste it into an email. Everything in it came from your own profile — it is a reference sheet,
              not a draft of their letter.
            </Notice>

            <div className="card card-pad-sm">
              <p className="t-2xs eyebrow">Student</p>
              <p className="t-sm w-600 mt-1">
                {content.studentName} · grade {content.grade}
              </p>
              {content.intendedMajors.length ? <p className="t-xs subtle mt-1">Intending to study {content.intendedMajors.join(', ')}</p> : null}
              {content.academicInterests.length ? <p className="t-xs subtle mt-1">Interests: {content.academicInterests.join(', ')}</p> : null}
            </div>

            {content.activities.length ? (
              <div>
                <p className="t-2xs eyebrow mb-2">Activities ({content.activities.length})</p>
                <div className="col g-2">
                  {content.activities.map((a) => (
                    <div key={a.name} className="card card-pad-sm">
                      <p className="t-sm w-600">
                        {a.name}
                        {a.role ? ` — ${a.role}` : ''}
                      </p>
                      <p className="t-2xs faint mt-1">
                        {countLabel(a.years, 'year')}
                        {a.hours ? `, ${a.hours}h/week` : ''}
                      </p>
                      {a.description ? <p className="t-xs subtle mt-2">{a.description}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {content.achievements.length ? (
              <div>
                <p className="t-2xs eyebrow mb-2">Awards and achievements</p>
                <ul className="col g-1">
                  {content.achievements.map((a) => (
                    <li key={a} className="t-sm subtle">
                      • {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {content.memories.length ? (
              <div>
                <p className="t-2xs eyebrow mb-2">Moments the student hopes you remember</p>
                <ul className="col g-1">
                  {content.memories.map((m) => (
                    <li key={m} className="t-sm subtle">
                      • {m}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {content.goals ? (
              <div>
                <p className="t-2xs eyebrow mb-2">Where they are heading</p>
                <p className="t-sm subtle">{content.goals}</p>
              </div>
            ) : null}

            <p className="t-2xs faint">{content.note}</p>

            <div className="row g-2">
              <Button icon="download" onClick={printPDF}>
                Print / PDF
              </Button>
              <Button
                variant="ghost"
                icon="copy"
                onClick={() => {
                  downloadJSON(`packet-${viewingPacket.recommenderName.replace(/\s+/g, '-').toLowerCase()}.json`, content);
                  toast('Packet exported.', 'ok');
                }}
              >
                Export
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <p className="t-2xs faint mt-6 row g-2">
        <Icon name="shield" size={12} className="mt-1 shrink-0" />
        <span>
          Packets contain only what you entered. Pathway AI does not write, draft or suggest letter content, and it never contacts a recommender
          on your behalf.{' '}
          <Link to="/app/activities/mine" className="c-accent">
            Edit what goes in
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
