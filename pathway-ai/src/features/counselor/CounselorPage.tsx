import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, EmptyState, Modal } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/ui/shared';
import { answer, starterPrompts, chatContextSummary } from '@/domain/engine/counselor';
import { MAJOR_BY_ID } from '@/data/majors';
import { listJoin } from '@/lib/format';
import { timeAgo } from '@/lib/date';

/* ==========================================================================
   AI counselor — sections 33, 43, 80
   ========================================================================== */

/** Minimal, safe renderer for the small markdown subset the engine emits. */
function RichText({ content }: { content: string }) {
  const blocks = content.split('\n\n');
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^[-•]\s/.test(l.trim()))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^[-•]\s*/, ''))}</li>
              ))}
            </ul>
          );
        }
        if (/^\*\*[^*]+\*\*$/.test(block.trim())) {
          return <h4 key={bi}>{block.trim().replace(/\*\*/g, '')}</h4>;
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {inline(l)}
                {li < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function inline(text: string) {
  // Splits on **bold** and _italic_ runs, leaving everything else as text.
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

export default function CounselorPage() {
  const ctx = useEngine();
  const { state, addChatMessage, clearChat, addLearnedPreference, toast } = useAppStore();
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const chat = state.chat;
  const starters = useMemo(() => starterPrompts(ctx), [ctx]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length, thinking]);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    addChatMessage({ role: 'user', content: question });
    setDraft('');
    setThinking(true);
    // A short delay so the reply does not appear before the question renders.
    window.setTimeout(() => {
      const reply = answer(ctx, question);
      for (const learned of reply.learned) {
        addLearnedPreference({ statement: learned, kind: 'note', source: 'chat' });
        toast(`Remembered: ${learned}`, 'ai');
      }
      addChatMessage({
        role: 'assistant',
        content: reply.content,
        citedProfileFields: reply.citedProfileFields,
        suggestions: reply.suggestions,
        links: reply.links,
        learned: reply.learned,
      });
      setThinking(false);
    }, 320);
  };

  const active = state.learnedPreferences.filter((p) => p.active);

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHeader
        eyebrow="Pathway AI Counselor"
        title="Ask anything about your path"
        description="Answers come from your actual profile — your courses, scores, activities, constraints and stated goals — using the same engine as the rest of the app."
        actions={
          <>
            <Button size="sm" icon="brain" onClick={() => setShowMemory(true)}>
              What it remembers{active.length ? ` (${active.length})` : ''}
            </Button>
            {chat.length ? (
              <Button size="sm" variant="ghost" icon="trash" onClick={clearChat}>
                Clear
              </Button>
            ) : null}
          </>
        }
      />

      <Card pad="sm" inset className="mb-5">
        <div className="row g-3 wrap t-xs subtle">
          <span className="row g-1">
            <Icon name="user" size={13} /> Grade {ctx.grade}
          </span>
          {ctx.majorIds.length ? (
            <span className="row g-1">
              <Icon name="book" size={13} /> {listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}
            </span>
          ) : null}
          {ctx.gpa4 ? (
            <span className="row g-1">
              <Icon name="chart" size={13} /> GPA {ctx.gpa4.toFixed(2)}
            </span>
          ) : null}
          {ctx.satTotal ? (
            <span className="row g-1">
              <Icon name="target" size={13} /> SAT {ctx.satTotal}
            </span>
          ) : null}
          <span className="ml-auto">{chatContextSummary(ctx, chat)}</span>
        </div>
      </Card>

      {chat.length ? (
        <div className="chat mb-6">
          {chat.map((m) => (
            <div key={m.id} className={`msg msg-${m.role === 'user' ? 'user' : 'ai'}`}>
              <span className="msg-avatar" aria-hidden="true">
                {m.role === 'user' ? 'You'.slice(0, 1) : <Icon name="sparkles" size={14} />}
              </span>
              <div className="col g-2" style={{ minWidth: 0, maxWidth: m.role === 'user' ? '80%' : '100%' }}>
                <div className="msg-bubble">
                  <RichText content={m.content} />
                </div>
                {m.learned?.length ? (
                  <div className="tag-list">
                    {m.learned.map((l) => (
                      <Badge key={l} tone="ai" dot>
                        Remembered: {l}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {m.links?.length ? (
                  <div className="tag-list">
                    {m.links.map((l) => (
                      <Link key={l.route} to={l.route} className="chip chip-sm" style={{ textDecoration: 'none' }}>
                        {l.label}
                        <Icon name="arrow-right" size={12} />
                      </Link>
                    ))}
                  </div>
                ) : null}
                {m.suggestions?.length ? (
                  <div className="tag-list">
                    {m.suggestions.map((s) => (
                      <button key={s} type="button" className="chip chip-sm" onClick={() => send(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
                {m.role === 'assistant' && m.citedProfileFields?.length ? (
                  <p className="t-2xs faint">Used from your profile: {m.citedProfileFields.join(' · ')}</p>
                ) : null}
                <p className="t-2xs faint">{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          ))}
          {thinking ? (
            <div className="msg msg-ai">
              <span className="msg-avatar" aria-hidden="true">
                <Icon name="sparkles" size={14} />
              </span>
              <div className="msg-bubble">
                <span className="typing c-ai" aria-label="Thinking">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      ) : (
        <div className="mb-6">
          <EmptyState
            icon="sparkles"
            title="Ask your first question"
            description="Try something specific. The counselor is most useful when it can reason from your own record rather than answering in general."
          />
          <div className="grid-2 mt-5">
            {starters.map((s) => (
              <button key={s} type="button" className="card card-pad-sm card-hover" style={{ textAlign: 'left' }} onClick={() => send(s)}>
                <div className="row g-2">
                  <Icon name="quote" size={14} className="c-ai shrink-0" />
                  <span className="t-sm">{s}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="composer">
        <textarea
          className="textarea grow"
          value={draft}
          placeholder="Ask about colleges, majors, AP courses, the SAT, activities, summers, essays or deadlines…"
          aria-label="Message Pathway AI"
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <Button variant="primary" icon="send" onClick={() => send(draft)} disabled={!draft.trim() || thinking} aria-label="Send message" />
      </div>

      <div className="notice notice-ai mt-5">
        <Icon name="shield" size={16} className="notice-icon" />
        <div>
          <strong>What this will not do.</strong> It will not predict whether you will be admitted anywhere, write your essay,
          or invent an accomplishment. When it does not know something, it says so rather than guessing.
        </div>
      </div>

      <Modal open={showMemory} onClose={() => setShowMemory(false)} title="What the AI remembers about you" size="md">
        <p className="t-sm subtle mb-4">
          These constraints came from your onboarding answers, your feedback on recommendations, and things you told the
          counselor directly. Turning one off changes recommendations immediately.
        </p>
        {active.length ? (
          <div className="col g-2">
            {active.map((p) => (
              <div key={p.id} className="row between g-3 card card-pad-sm">
                <div className="col">
                  <span className="t-sm">{p.statement}</span>
                  <span className="t-2xs faint">From {p.source}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-sm subtle">Nothing recorded yet. Tell the counselor something like &ldquo;I don&rsquo;t want to study in California&rdquo; and it will remember.</p>
        )}
        <Button to="/app/settings/memory" className="mt-5" iconRight="arrow-right" onClick={() => setShowMemory(false)}>
          Manage in settings
        </Button>
      </Modal>
    </div>
  );
}
