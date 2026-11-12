import Link from 'next/link';
import { Download, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { BANK_STATS } from '@/data/questions';
import manifest from '@/data/questions/validated.json';
import { snapshot, useStore } from '@/lib/store';
import { DEFAULT_MODEL, testGeminiKey } from '@/lib/tutorClient';
import { BRAND } from '@/lib/taxonomy';
import type { AppState } from '@/lib/types';
import { Badge, Card, PageHeader } from '@/components/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SettingsPage() {
  const s = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [key, setKey] = useState(s.settings.geminiKey ?? '');
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const p = s.profile;

  const exportData = () => {
    const data = { app: 'stellify', exportedAt: new Date().toISOString(), state: { ...snapshot(), settings: { ...snapshot().settings, geminiKey: undefined } } };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    a.download = `stellify-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    setMsg('Backup downloaded. It contains your progress, notes and tutor history, but not your AI key.');
  };
  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as { app?: string; state?: AppState };
      if (data.app !== 'stellify' || !data.state || !Array.isArray(data.state.attempts) || !data.state.profile) throw new Error('bad');
      if (!confirm(`Replace everything on this device with the backup (${data.state.attempts.length} answered questions)?`)) return;
      s.importState({ ...data.state, settings: { ...data.state.settings, geminiKey: s.settings.geminiKey } });
      setMsg('Backup restored.');
    } catch { setMsg('That file is not a valid Stellify backup.'); }
  };
  const test = async () => {
    setTesting(true); setAiMsg('');
    const r = await testGeminiKey(key.trim());
    setTesting(false);
    if (!r.ok) { setAiMsg(r.error ?? 'The key could not be verified.'); return; }
    setModels(r.models);
    const model = r.models.includes(s.settings.geminiModel ?? DEFAULT_MODEL) ? (s.settings.geminiModel ?? DEFAULT_MODEL) : r.models.find((m) => m.includes('flash')) ?? r.models[0] ?? DEFAULT_MODEL;
    s.setSettings({ geminiKey: key.trim(), geminiModel: model, aiEnabled: true });
    setAiMsg(`Key works. ${r.models.length} models are available to it. Using ${model}.`);
  };

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Settings" title="Settings & account" subtitle="Stellify has no sign-up. Your profile lives in this browser on this device. Back it up or move it with Export and Import." />

      <Card>
        <h2 className="text-lg font-bold">Profile and goals</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="st-name">Nickname (optional)</label><input id="st-name" className="input" value={p.name ?? ''} maxLength={24} onChange={(e) => s.setProfile({ name: e.target.value || undefined })} placeholder="Stay anonymous if you like" /></div>
          <div><label className="label" htmlFor="st-exam">Exam date</label><input id="st-exam" type="date" className="input" value={p.examDate ?? ''} onChange={(e) => s.setProfile({ examDate: e.target.value || undefined })} /></div>
          <div><label className="label" htmlFor="st-target">Target score: {p.targetScore}</label><input id="st-target" type="range" min={1000} max={1600} step={10} value={p.targetScore} onChange={(e) => s.setProfile({ targetScore: Number(e.target.value) })} className="w-full accent-[rgb(var(--brand))]" /></div>
          <div><label className="label" htmlFor="st-cur">Starting score (optional)</label><input id="st-cur" className="input" inputMode="numeric" value={p.currentScore ?? ''} onChange={(e) => { const v = Number(e.target.value.replace(/\D/g, '').slice(0, 4)); s.setProfile({ currentScore: v >= 400 && v <= 1600 ? v : undefined }); }} placeholder="e.g. 1200" /></div>
          <div><span className="label">Daily study time</span><div className="flex flex-wrap gap-1.5">{[15, 30, 45, 60, 90, 120].map((m) => <button key={m} aria-pressed={p.dailyMinutes === m} onClick={() => s.setProfile({ dailyMinutes: m })} className={`chip !px-3 !py-1 ${p.dailyMinutes === m ? 'border-brand bg-brand/15 text-ink' : ''}`}>{m} min</button>)}</div></div>
          <div><span className="label">Rest days</span><div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <button key={d} aria-pressed={p.restDays.includes(i)} onClick={() => s.setProfile({ restDays: p.restDays.includes(i) ? p.restDays.filter((x) => x !== i) : [...p.restDays, i] })} className={`chip !px-3 !py-1 ${p.restDays.includes(i) ? 'border-brand bg-brand/15 text-ink' : ''}`}>{d}</button>)}</div></div>
        </div>
        <div className="mt-4"><span className="label">Challenge level for Smart Practice</span><div className="flex flex-wrap gap-1.5">{([['high', 'High: skip medium questions'], ['standard', 'Standard: include medium']] as const).map(([v, l]) => <button key={v} aria-pressed={s.settings.challenge === v} onClick={() => s.setSettings({ challenge: v })} className={`chip !px-3 !py-1 ${s.settings.challenge === v ? 'border-brand bg-brand/15 text-ink' : ''}`}>{l}</button>)}</div></div>
        <p className="mt-3 text-xs text-faint">After changing your time, rest days or exam date, rebuild your plan in the <Link href="/calendar" className="underline">Study Calendar</Link>.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Appearance and accessibility</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-sm">Theme</span>{(['dark', 'light', 'system'] as const).map((t) => <button key={t} aria-pressed={s.settings.theme === t} onClick={() => s.setSettings({ theme: t })} className={`chip !px-3 !py-1 capitalize ${s.settings.theme === t ? 'border-brand bg-brand/15 text-ink' : ''}`} data-testid={`theme-${t}`}>{t}</button>)}</div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={s.settings.reducedMotion} onChange={(e) => s.setSettings({ reducedMotion: e.target.checked })} />Reduce motion (also follows your system setting)</label>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={s.settings.showTimer} onChange={(e) => s.setSettings({ showTimer: e.target.checked })} />Show the timer during practice</label>
        <p className="mt-2 text-xs text-faint">Keyboard: Tab moves through controls, A–D or 1–4 choose an answer, Enter checks or continues, H reveals a hint, F flags, Ctrl+K searches.</p>
      </Card>

      <Card id="ai" className="scroll-mt-20">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">AI tutor (optional)</h2><Badge tone={s.settings.geminiKey && s.settings.aiEnabled ? 'brand' : 'default'}>{s.settings.geminiKey && s.settings.aiEnabled ? `On · ${s.settings.geminiModel ?? DEFAULT_MODEL}` : 'Built-in tutor only'}</Badge></div>
        <p className="mt-2 text-sm text-muted">Stellify works completely without AI: every question has a validated explanation, and the built-in tutor teaches, hints and explains from that material. If you want more conversational replies, you can connect Google&apos;s Gemini API using its free tier.</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>• Because this is a single offline file, there is no server to keep a shared key. You create your own free key at <a className="underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com</a> (no payment details needed) and paste it here.</li>
          <li>• The key is stored only in this browser and sent only to Google. It is left out of backups.</li>
          <li>• What is sent: the open question, your answer choice, your message and the names of your weakest skills. Never your nickname, notes or history.</li>
          <li>• Google may use free-tier requests to improve its products, and free quotas are limited and can change. Stellify limits itself to 60 AI replies a day and falls back to built-in explanations on any error.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2"><input className="input max-w-md font-mono" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste a Gemini API key" aria-label="Gemini API key" /><button className="btn-primary" disabled={!key.trim() || testing} onClick={test}>{testing ? 'Checking…' : 'Check and save key'}</button>{s.settings.geminiKey && <button className="btn-ghost" onClick={() => { s.setSettings({ geminiKey: undefined, aiConsent: false }); setKey(''); setModels([]); setAiMsg('Key removed from this device.'); }}>Remove key</button>}</div>
        {models.length > 0 && <div className="mt-2"><label className="label" htmlFor="st-model">Model</label><select id="st-model" className="input max-w-md" value={s.settings.geminiModel ?? DEFAULT_MODEL} onChange={(e) => s.setSettings({ geminiModel: e.target.value })}>{models.map((m) => <option key={m}>{m}</option>)}</select></div>}
        {s.settings.geminiKey && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={s.settings.aiEnabled && s.settings.aiConsent} onChange={(e) => s.setSettings({ aiEnabled: e.target.checked, aiConsent: e.target.checked })} />Use AI replies in the tutor (I understand what is sent to Google)</label>}
        <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">{aiMsg}</p>
        <p className="text-xs text-faint">This connection could not be tested against Google&apos;s servers when the file was built (the build environment had no internet access to them). If it misbehaves, the built-in tutor is unaffected.</p>
      </Card>

      <Card>
        <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={18} className="text-ok" />Your data and privacy</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>• No account, no real name required, no ads, no analytics, no sale of data. Stellify makes no network requests unless you turn on the AI tutor or click a link to an official site.</li>
          <li>• Progress is saved in this browser&apos;s storage for this file. Clearing site data, using private browsing, or (in some browsers) moving the file can make it unavailable, so export a backup now and then.</li>
          <li>• To study on another device, export here and import there.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportData} data-testid="export"><Download size={15} />Export my data</button>
          <button className="btn-ghost" onClick={() => file.current?.click()}><Upload size={15} />Import a backup</button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.target.value = ''; }} aria-label="Backup file" />
          <button className="btn-ghost text-bad" data-testid="reset" onClick={() => { if (confirm('Delete all Stellify data on this device? This cannot be undone.') && confirm('Last check: erase progress, notes, pet and settings?')) { s.resetAll(); setKey(''); setMsg('Everything has been erased.'); } }}><Trash2 size={15} />Delete everything</button>
        </div>
        <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">{msg}</p>
        <p className="text-xs text-faint">Stored now: {s.attempts.length} answered questions · {Object.keys(s.mistakes).length} mistakes · {s.notes.length} notes · {s.tutor.length} tutor conversations · {s.reports.length} question reports.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">About Stellify</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-muted">
          <li>• <b className="text-ink">Question bank:</b> {BANK_STATS.total} original questions ({BANK_STATS.math} Math, {BANK_STATS.rw} Reading &amp; Writing), validated {(manifest as { generatedAt: string }).generatedAt}. Math answers were confirmed by an independent computation for each question (three study-design questions are conceptual and were reviewed by hand). Reading &amp; Writing questions passed structural checks and author review; they have not been reviewed by an outside SAT expert. Use the report button on any question that seems wrong.</li>
          <li>• <b className="text-ink">Score estimates:</b> a three-parameter item-response model with fixed difficulty values for medium, hard and very hard questions, mapped to the 200–800 scale, with a range that widens when data is thin. It is not calibrated on real test-takers and is not the College Board&apos;s method.</li>
          <li>• <b className="text-ink">Passages:</b> written for practice. Researchers, studies and figures in them are illustrative.</li>
          <li>• {BRAND.disclaimer}</li>
        </ul>
      </Card>
    </div>
  );
}
