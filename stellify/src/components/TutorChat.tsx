'use client';
import Link from 'next/link';
import { Bot, Send, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { askTutor, aiStatus, type AiStatus } from '@/lib/tutorClient';
import { TUTOR_MODES, type TutorMode } from '@/lib/engine/tutor';
import type { TutorMessage } from '@/lib/types';
import { RichText } from './RichText';
import { Badge, cn } from './ui';

const md = (text: string) => text.split('\n').map((line, i) => {
  if (line.startsWith('> ')) return <blockquote key={i} className="my-1 border-l-2 border-brand2 pl-3 text-ink"><RichText text={line.slice(2)} /></blockquote>;
  if (line.startsWith('• ')) return <div key={i} className="flex gap-2 pl-1"><span aria-hidden>•</span><span><RichText text={line.slice(2)} /></span></div>;
  if (!line.trim()) return <div key={i} className="h-2" />;
  return <div key={i}><RichText text={line} /></div>;
});

/** Chat with the tutor. Works fully offline; uses the optional AI enhancement only with consent. */
export function TutorChat({ qid, answer, threadId: initialThread, compact, suggestions }: { qid?: string; answer?: string | null; threadId?: string | null; compact?: boolean; suggestions?: string[] }) {
  const [threadId, setThreadId] = useState<string | null>(initialThread ?? null);
  const thread = useStore((s) => s.tutor.find((t) => t.id === threadId));
  const append = useStore((s) => s.tutorAppend);
  const consent = useStore((s) => s.settings.aiConsent);
  const enabled = useStore((s) => s.settings.aiEnabled);
  const setSettings = useStore((s) => s.setSettings);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [links, setLinks] = useState<{ label: string; href: string }[]>([]);
  const counters = useRef({ hints: 0, socratic: 0 });
  const end = useRef<HTMLDivElement>(null);
  const messages = thread?.messages ?? [];

  useEffect(() => { setThreadId(initialThread ?? null); counters.current = { hints: 0, socratic: 0 }; setLinks([]); }, [initialThread, qid]);
  useEffect(() => { aiStatus().then(setStatus); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length, busy]);

  async function send(mode: TutorMode, message?: string) {
    if (busy) return;
    const label = message ?? TUTOR_MODES.find((m) => m.id === mode)?.label ?? '';
    const userMsg: TutorMessage = { role: 'student', text: label, at: Date.now(), mode };
    let id = append(threadId, userMsg, { qid, title: qid ? `Question help: ${label}` : label });
    setThreadId(id);
    setBusy(true); setText('');
    const inSocratic = mode === 'ask' && counters.current.socratic > 0 && !!qid;
    const m: TutorMode = inSocratic ? 'socratic' : mode;
    const r = await askTutor({ mode: m, message, qid, answer, hintsGiven: counters.current.hints, socraticStep: counters.current.socratic, history: messages });
    if (r.hintsGiven !== undefined) counters.current.hints = r.hintsGiven;
    if (m === 'socratic') counters.current.socratic = r.socraticStep ?? counters.current.socratic; else if (mode !== 'ask') counters.current.socratic = 0;
    id = append(id, { role: 'tutor', text: r.text, at: Date.now(), source: r.source, mode: m });
    setThreadId(id);
    setLinks(r.links ?? []); setNotice(r.notice ?? null); setBusy(false);
  }

  const aiOn = !!status?.enabled && enabled && consent;
  return (
    <div className={cn('flex flex-col', compact ? 'h-[70vh]' : 'h-[calc(100vh-15rem)] min-h-[420px]')}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {aiOn ? <Badge tone="brand"><Sparkles size={12} />AI enhanced{status?.model ? ` · ${status.model}` : ''}</Badge> : <Badge><WifiOff size={12} />Offline tutor</Badge>}
        <span className="inline-flex items-center gap-1 text-faint"><ShieldCheck size={12} />Answers about questions come from validated explanations.</span>
      </div>
      {status?.enabled && enabled && !consent && (
        <div className="mb-2 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs text-muted">
          An optional AI enhancement is available. If you turn it on, the question text, your answer choice and your message are sent to Google&apos;s Gemini API to generate a reply. Your name, notes and account are never sent. Free-tier requests may be used by Google to improve its products.
          <div className="mt-2 flex gap-2"><button className="btn-primary !px-3 !py-1.5 !text-xs" onClick={() => setSettings({ aiConsent: true })}>Turn on AI replies</button><button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setSettings({ aiEnabled: false })}>Keep offline</button></div>
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-raised/40 p-3" role="log" aria-live="polite" aria-label="Tutor conversation">
        {!messages.length && (
          <div className="grid h-full place-items-center text-center text-sm text-muted">
            <div><Bot className="mx-auto mb-2 text-brand" size={30} />{qid ? 'Pick a mode below, or ask anything about this question.' : 'Ask about any rule, formula, word or strategy, or ask what you should study next.'}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'student' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', m.role === 'student' ? 'bg-gradient-to-r from-brand to-brand2 text-white' : 'border border-line bg-surface')}>
              {m.role === 'tutor' ? md(m.text) : m.text}
              {m.role === 'tutor' && m.source === 'gemini' && <div className="mt-1.5 text-[10px] uppercase tracking-wide text-faint">AI-generated · check against the explanation</div>}
            </div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted">Lumi is thinking…</div>}
        {!busy && links.length > 0 && <div className="flex flex-wrap gap-2">{links.map((l) => <Link key={l.href + l.label} href={l.href} className="chip hover:text-ink">{l.label} →</Link>)}</div>}
        {notice && <p className="text-xs text-warn">{notice}</p>}
        <div ref={end} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {qid ? TUTOR_MODES.map((m) => <button key={m.id} onClick={() => send(m.id)} disabled={busy} className="chip hover:border-brand/50 hover:text-ink" title={m.hint}>{m.label}</button>)
          : (suggestions ?? []).map((s) => <button key={s} onClick={() => send('ask', s)} disabled={busy} className="chip hover:border-brand/50 hover:text-ink">{s}</button>)}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send('ask', text.trim()); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder={qid ? 'Ask a follow-up about this question…' : 'Ask the tutor…'} aria-label="Message to the tutor" maxLength={1200} />
        <button className="btn-primary" disabled={busy || !text.trim()} aria-label="Send"><Send size={16} /></button>
      </form>
    </div>
  );
}
