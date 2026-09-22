import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Notice, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { ProgressRing } from '@/components/charts';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { brainstormEssay, checkAuthenticity, ESSAY_ETHICS_NOTE } from '@/domain/engine/writing';
import { wordCount } from '@/lib/format';
import { formatDateTime } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';

/* Sections 41–42 — essay workshop. Brainstorming and checking, never writing. */

const COMMON_APP_PROMPTS = [
  'Some students have a background, identity, interest, or talent so meaningful they believe their application would be incomplete without it.',
  'The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time you faced a challenge, setback, or failure.',
  'Reflect on a time you questioned or challenged a belief or idea.',
  'Reflect on something someone has done for you that has made you happy or thankful in a surprising way.',
  'Discuss an accomplishment, event, or realisation that sparked a period of personal growth.',
  'Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time.',
  'Share an essay on any topic of your choice.',
];

export function EssayWorkshop() {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();
  const ctx = useEngine();
  const { state, addEssay, updateEssay, removeEssay, toast } = useAppStore();
  const [tab, setTab] = useState('write');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', promptText: COMMON_APP_PROMPTS[0], collegeId: '', wordLimit: '650' });

  const essay = essayId ? state.essays.find((e) => e.id === essayId) : undefined;
  const words = essay ? wordCount(essay.body) : 0;

  const brainstorm = useMemo(() => (essay ? brainstormEssay(ctx, essay.promptText) : undefined), [ctx, essay]);
  const authenticity = useMemo(
    () => (essay && essay.body.trim().length > 40 ? checkAuthenticity(ctx, essay.body) : undefined),
    [ctx, essay],
  );

  function create() {
    if (!form.title.trim()) {
      toast('Give the essay a title so you can find it later.', 'warn');
      return;
    }
    const id = addEssay({
      title: form.title.trim(),
      promptText: form.promptText,
      collegeId: form.collegeId || undefined,
      wordLimit: form.wordLimit ? Number(form.wordLimit) : undefined,
      body: '',
    });
    setOpen(false);
    setForm({ title: '', promptText: COMMON_APP_PROMPTS[0], collegeId: '', wordLimit: '650' });
    navigate(`/app/applications/essays/${id}`);
  }

  /* ---------------------------------------------------------------- Index */
  if (!essay) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Applications"
          title="Essay workshop"
          description="Brainstorming drawn from what you have already told us, and an honest check on whether a draft sounds like you. It will not write anything for you."
          back={{ to: '/app/applications', label: 'Applications' }}
          actions={
            <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
              Start an essay
            </Button>
          }
        />

        <Notice tone="ai" icon="shield">
          <span className="w-600">{ESSAY_ETHICS_NOTE}</span>
        </Notice>

        {state.essays.length ? (
          <div className="grid-fit mt-6">
            {state.essays.map((e) => {
              const college = e.collegeId ? COLLEGE_BY_ID.get(e.collegeId) : undefined;
              const w = wordCount(e.body);
              return (
                <Card key={e.id} pad="md" hover>
                  <div className="row between g-2 items-start">
                    <Link to={`/app/applications/essays/${e.id}`} className="t-sm w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                      {e.title}
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash"
                      aria-label={`Delete ${e.title}`}
                      onClick={() => {
                        removeEssay(e.id);
                        toast('Draft deleted.', 'default');
                      }}
                    />
                  </div>
                  {college ? <p className="t-2xs eyebrow mt-1">{college.shortName ?? college.name}</p> : null}
                  <p className="t-xs subtle mt-3 clamp-3">{e.promptText}</p>
                  <div className="row between g-2 mt-4 items-center">
                    <span className="t-2xs mono faint">
                      {w} words{e.wordLimit ? ` / ${e.wordLimit}` : ''}
                    </span>
                    <Button size="sm" variant="ghost" to={`/app/applications/essays/${e.id}`} iconRight="chevron-right">
                      Open
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card pad="lg" className="mt-6">
            <p className="t-sm subtle ta-center">
              No drafts yet. Start one and the brainstorming tools will pull from your activities, awards and the notes you wrote about why they
              matter to you.
            </p>
            <div className="row center mt-4">
              <Button icon="plus" onClick={() => setOpen(true)}>
                Start an essay
              </Button>
            </div>
          </Card>
        )}

        <Card pad="md" className="mt-6">
          <SectionHeader title="What actually makes a personal statement work" description="Consistent advice from people who read thousands of them." />
          <ul className="col g-2">
            {[
              'It is about something small. A whole life does not fit in 650 words; one afternoon might.',
              'It shows you thinking, not just doing. The reader wants to know how your mind works.',
              'It sounds like a seventeen-year-old wrote it. Polished-beyond-your-years prose reads as coached, and coached reads as dishonest.',
              'It is specific enough that nobody else could have written it. If a classmate could submit your essay with the names changed, start again.',
              'It does not explain its own moral in the last paragraph. Trust the reader.',
            ].map((s) => (
              <li key={s} className="row g-2 t-sm subtle">
                <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        <EssayModal open={open} onClose={() => setOpen(false)} form={form} setForm={setForm} onCreate={create} colleges={state.collegeList.map((e) => e.collegeId)} />
      </div>
    );
  }

  /* -------------------------------------------------------------- Editor */
  const overLimit = essay.wordLimit ? words > essay.wordLimit : false;

  return (
    <div className="page">
      <PageHeader
        eyebrow={essay.collegeId ? COLLEGE_BY_ID.get(essay.collegeId)?.shortName ?? 'Supplement' : 'Personal statement'}
        title={essay.title}
        description={essay.promptText}
        back={{ to: '/app/applications/essays', label: 'All essays' }}
        actions={
          <span className={`mono t-sm w-600${overLimit ? ' c-danger' : ''}`}>
            {words}
            {essay.wordLimit ? ` / ${essay.wordLimit}` : ''} words
          </span>
        }
      />

      <div className="mt-2">
        <Tabs
          ariaLabel="Essay workshop sections"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'write', label: 'Write' },
            { id: 'brainstorm', label: 'Brainstorm', count: brainstorm?.stories.length },
            { id: 'check', label: 'Authenticity check' },
          ]}
        />
      </div>

      {tab === 'write' ? (
        <div className="split-aside mt-4">
          <Card pad="md">
            <label className="sr-only" htmlFor="essay-body">
              Essay draft
            </label>
            <textarea
              id="essay-body"
              className="input textarea essay-area"
              rows={26}
              value={essay.body}
              onChange={(e) => updateEssay(essay.id, { body: e.target.value })}
              placeholder="Start anywhere. The first paragraph is almost always the last thing you fix."
            />
            {overLimit ? (
              <p className="t-xs c-danger mt-2">
                <Icon name="alert" size={12} /> {words - (essay.wordLimit ?? 0)} words over the limit. Most application portals cut you off
                rather than warning you.
              </p>
            ) : null}
            <p className="t-2xs faint mt-3">Saved automatically. Last edited {formatDateTime(essay.updatedAt)}.</p>
          </Card>

          <div className="col g-4">
            <Card pad="md">
              <h3 className="t-sm w-600">The prompt</h3>
              <p className="t-xs subtle mt-2">{essay.promptText}</p>
              <p className="t-2xs faint mt-3">
                Prompt wording here is as commonly published. Confirm the exact current wording on the application itself.
              </p>
            </Card>

            <Card pad="md">
              <h3 className="t-sm w-600">While you write</h3>
              <ul className="col g-2 mt-3">
                {[
                  'Write badly first. You cannot edit a blank page.',
                  'Cut the first paragraph when you finish — it is usually throat-clearing.',
                  'Read it aloud. Anything you stumble over is a sentence to rewrite.',
                  'Show it to one person who knows you well, not five who do not.',
                ].map((t) => (
                  <li key={t} className="t-xs subtle">
                    • {t}
                  </li>
                ))}
              </ul>
            </Card>

            <Card pad="md">
              <p className="t-2xs eyebrow">What this app will not do</p>
              <p className="t-xs subtle mt-2">
                It will not draft paragraphs, rewrite your sentences into someone else&rsquo;s voice, or generate a story you did not live.
                Admissions offices increasingly check for generated text, and — more importantly — an essay that is not yours cannot do the one
                job an essay has.
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'brainstorm' && brainstorm ? (
        <div className="col g-4 mt-4">
          <Notice tone="ai" icon="sparkles">
            Everything below is drawn from things you wrote in your own profile — activities, awards and the notes you added about why they matter
            to you. Nothing here is invented, and none of it is a draft.
          </Notice>

          {brainstorm.stories.length ? (
            <Card pad="md">
              <SectionHeader title="Material you already have" description="Each of these points at something you recorded. The question after it is the useful part." />
              <div className="col g-3">
                {brainstorm.stories.map((s) => (
                  <div key={s.title} className="card card-pad-sm">
                    <p className="t-sm w-600">{s.title}</p>
                    <p className="t-sm subtle mt-2">{s.seed}</p>
                    <p className="t-xs mt-3" style={{ color: 'var(--ai-text)' }}>
                      {s.whyItWorks}
                    </p>
                    <p className="t-2xs faint mt-2">Source: {s.fromProfile}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card pad="md">
              <p className="t-sm subtle">
                There is not much in your profile to draw on yet. Adding &ldquo;why it matters to you&rdquo; notes to your{' '}
                <Link to="/app/activities/mine" className="c-accent">
                  activities
                </Link>{' '}
                gives this something real to work with — and those notes are usually where the essay is hiding.
              </p>
            </Card>
          )}

          {brainstorm.questions.length ? (
            <Card pad="md">
              <SectionHeader title="Questions to answer out loud" description="Say the answers before you write them. What you say is usually more honest than what you type." />
              <ol className="col g-2">
                {brainstorm.questions.map((q, i) => (
                  <li key={q} className="row g-2 t-sm subtle">
                    <span className="step-num">{i + 1}</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {brainstorm.structures.length ? (
            <Card pad="md">
              <SectionHeader title="Shapes that work" description="Structures, not templates. Fill them with your own material or ignore them entirely." />
              <div className="grid-fit">
                {brainstorm.structures.map((s) => (
                  <div key={s.name} className="card card-pad-sm">
                    <p className="t-sm w-600">{s.name}</p>
                    <ol className="col g-1 mt-2">
                      {s.outline.map((o) => (
                        <li key={o} className="t-xs subtle">
                          • {o}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {brainstorm.cautions.length ? (
            <Card pad="md">
              <SectionHeader title="Worth avoiding" description="Not rules — just the patterns that make essays blur together." />
              <ul className="col g-2">
                {brainstorm.cautions.map((c) => (
                  <li key={c} className="row g-2 t-sm subtle">
                    <Icon name="alert" size={13} className="c-warn mt-1 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'check' ? (
        <div className="col g-4 mt-4">
          {authenticity ? (
            <>
              <Card pad="md">
                <div className="row g-5 wrap items-center">
                  <ProgressRing
                    value={authenticity.specificityScore}
                    size={92}
                    stroke={8}
                    label={String(authenticity.specificityScore)}
                    sublabel="specific"
                    tone={authenticity.specificityScore >= 70 ? 'var(--ok)' : authenticity.specificityScore >= 50 ? 'var(--accent)' : 'var(--warn)'}
                    ariaLabel={`Specificity ${authenticity.specificityScore} out of 100`}
                  />
                  <div className="grow">
                    <h2 className="t-md w-600">Specificity, not quality</h2>
                    <p className="t-sm subtle mt-2">
                      This measures how concrete and personal the writing is — named things, real numbers, connections to your own record. It is
                      not a judgement of whether the essay is good, and no algorithm should make that call.
                    </p>
                  </div>
                </div>
                <div className="row g-5 mt-4 wrap">
                  <Stat label="Words" value={String(authenticity.wordCount)} />
                  <Stat label="Stock phrases" value={String(authenticity.genericPhrases.length)} tone={authenticity.genericPhrases.length ? 'var(--warn)' : undefined} />
                  <Stat label="Profile connections" value={String(authenticity.profileConnections.length)} />
                </div>
              </Card>

              {authenticity.unsupportedClaims.length ? (
                <Card pad="md">
                  <SectionHeader
                    title="Claims we cannot corroborate"
                    description="Nothing in your recorded profile matches these. If they are true, add them to your profile. If they are not, take them out — an application that overstates is a serious problem, not a strategy."
                  />
                  <ul className="col g-2">
                    {authenticity.unsupportedClaims.map((c) => (
                      <li key={c} className="row g-2 t-sm">
                        <Icon name="alert" size={13} className="c-danger mt-1 shrink-0" />
                        <span className="subtle">{c}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {authenticity.genericPhrases.length ? (
                <Card pad="md">
                  <SectionHeader title="Phrases that appear in thousands of essays" description="Each one is a place where a specific detail could go instead." />
                  <div className="col g-3">
                    {authenticity.genericPhrases.map((g) => (
                      <div key={g.phrase} className="card card-pad-sm">
                        <p className="t-sm w-600" style={{ fontFamily: 'var(--font-mono)' }}>
                          &ldquo;{g.phrase}&rdquo;
                        </p>
                        <p className="t-xs subtle mt-2">{g.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {authenticity.profileConnections.length ? (
                <Card pad="md">
                  <SectionHeader title="Grounded in your own record" description="Places where the essay connects to something you actually did." />
                  <ul className="col g-1">
                    {authenticity.profileConnections.map((c) => (
                      <li key={c} className="t-sm subtle row g-2">
                        <Icon name="check" size={13} className="c-ok mt-1 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              <Card pad="md">
                <SectionHeader title="What would help most" description="Ordered by impact." />
                <ol className="col g-2">
                  {authenticity.suggestions.map((s, i) => (
                    <li key={s} className="row g-2 t-sm subtle">
                      <span className="step-num">{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Notice tone="info" icon="info">
                Every suggestion here is about your own writing. None of it rewrites a sentence for you, because the moment it does, the essay
                stops being evidence of how you think.
              </Notice>
            </>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                Write at least a paragraph and the check will run. It gets genuinely useful past about 250 words.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      <div className="row g-2 mt-8 items-center">
        <Badge tone="ai">AI guidance</Badge>
        <span className="t-2xs faint">
          Brainstorming and checks are generated from your own profile. The draft above is entirely yours.
        </span>
      </div>
    </div>
  );
}

function EssayModal({
  open,
  onClose,
  form,
  setForm,
  onCreate,
  colleges,
}: {
  open: boolean;
  onClose: () => void;
  form: { title: string; promptText: string; collegeId: string; wordLimit: string };
  setForm: (f: { title: string; promptText: string; collegeId: string; wordLimit: string }) => void;
  onCreate: () => void;
  colleges: string[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start an essay"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onCreate}>
            Create draft
          </Button>
        </>
      }
    >
      <div className="col g-4">
        <Field label="Title" required hint="Just for you — 'Personal statement v1', 'Why Michigan'.">
          {(p) => <input {...p} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
        </Field>
        <Field label="Prompt" hint="Pick a Common App prompt or paste a supplement prompt.">
          {(p) => (
            <textarea
              {...p}
              className="input textarea"
              rows={3}
              value={form.promptText}
              onChange={(e) => setForm({ ...form, promptText: e.target.value })}
            />
          )}
        </Field>
        <div className="row g-2 wrap">
          {COMMON_APP_PROMPTS.map((prompt, i) => (
            <button key={prompt} type="button" className="chip chip-sm" onClick={() => setForm({ ...form, promptText: prompt })}>
              Prompt {i + 1}
            </button>
          ))}
        </div>
        <div className="row g-3 wrap">
          <Field label="For which college" hint="Leave blank for the main personal statement.">
            {(p) => (
              <select {...p} className="select" value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })}>
                <option value="">Personal statement</option>
                {colleges.map((id) => (
                  <option key={id} value={id}>
                    {COLLEGE_BY_ID.get(id)?.shortName ?? id}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Word limit">
            {(p) => <input {...p} className="input" inputMode="numeric" value={form.wordLimit} onChange={(e) => setForm({ ...form, wordLimit: e.target.value.replace(/[^0-9]/g, '') })} />}
          </Field>
        </div>
        <p className="t-2xs faint">
          Common App prompt wording changes between cycles. Confirm the exact prompt on the application itself before you submit.
        </p>
      </div>
    </Modal>
  );
}
