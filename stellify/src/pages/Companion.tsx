import Link from 'next/link';
import { Award, BookOpen, CalendarCheck, CalendarHeart, Check, Compass, Crown, Flame, FunctionSquare, GraduationCap, Heart, Languages, Lock, Medal, Mountain, PenLine, Rocket, ShieldCheck, Sigma, Sparkles, Star, Sun, Target, Trophy, Wrench, Zap, type LucideIcon } from 'lucide-react';

const ICON: Record<string, LucideIcon> = { Sparkles, Flame, Trophy, Target, Zap, PenLine, Sigma, FunctionSquare, BookOpen, CalendarCheck, CalendarHeart, Compass, Medal, Wrench, ShieldCheck, Sun, GraduationCap, Languages, Star, Rocket, Mountain, Crown };
import { useState } from 'react';
import { SHOP, SLOT_NAME, type ShopItem } from '@/data/shop';
import { useStore } from '@/lib/store';
import { useLevel } from '@/lib/hooks';
import { ACHIEVEMENTS } from '@/lib/engine/achievements';
import { LEVEL_TIERS, xpForLevel } from '@/lib/engine/xp';
import type { PetSlot } from '@/lib/types';
import { Habitat, Pet, type PetMood } from '@/components/Pet';
import { Badge, Card, PageHeader, Progress, Tabs, cn } from '@/components/ui';

const MOODS: { id: PetMood; label: string }[] = [{ id: 'idle', label: 'Idle' }, { id: 'walk', label: 'Walk' }, { id: 'study', label: 'Study' }, { id: 'think', label: 'Think' }, { id: 'celebrate', label: 'Celebrate' }, { id: 'sleep', label: 'Sleep' }, { id: 'levelup', label: 'Level up' }];

export function PetPage() {
  const pet = useStore((s) => s.pet);
  const care = useStore((s) => s.carePet);
  const rename = useStore((s) => s.renamePet);
  const equip = useStore((s) => s.equip);
  const level = useLevel();
  const [mood, setMood] = useState<PetMood>('idle');
  const [hearts, setHearts] = useState(0);
  const [name, setName] = useState(pet.name);
  const [msg, setMsg] = useState('');
  const react = (m: PetMood, text: string) => { setMood(m); setMsg(text); setTimeout(() => setMood('idle'), 2600); };
  const owned = SHOP.filter((i) => pet.owned.includes(i.id));
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Companion" title={`My Pet: ${pet.name}`} subtitle="Lumi is a star sprite whose antenna glows when ideas click. Lumi grows as you learn: XP comes from correct answers, finished lessons, fixed mistakes, mastery and mock exams, never from mindless repetition." actions={<Link href="/rewards" className="btn-primary">Visit the shop</Link>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="!p-0 overflow-hidden">
          <Habitat id={pet.equipped.habitat} className="!rounded-none">
            <div className="relative grid h-80 place-items-end justify-center pb-3">
              <Pet mood={mood} level={level.level} equipped={pet.equipped} size={250} onClick={() => { care('pet'); setHearts((h) => h + 1); react('happy', `${pet.name} loves that.`); }} label={`Pet ${pet.name}`} />
              {hearts > 0 && <Heart key={hearts} className="pointer-events-none absolute left-1/2 top-16 animate-zzz fill-bad text-bad" size={26} />}
            </div>
          </Habitat>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => { care('pet'); setHearts((h) => h + 1); react('happy', `${pet.name} loves that.`); }} data-testid="pet-pet">Pet</button>
              <button className="btn-ghost" onClick={() => { if (care('treat')) react('celebrate', `${pet.name} enjoyed the star snack. (−5 Stardust)`); else setMsg('A star snack costs 5 Stardust. Earn some by studying.'); }}>Star snack · 5</button>
              <button className="btn-ghost" onClick={() => { care('play'); react('walk', `${pet.name} is off for a stroll.`); }}>Play</button>
              <Link href="/practice/session?mode=smart&n=5" className="btn-primary">Study together</Link>
            </div>
            <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">{msg}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><span className="text-xs text-faint">Preview animations:</span>{MOODS.map((m) => <button key={m.id} onClick={() => setMood(m.id)} aria-pressed={mood === m.id} className={cn('chip', mood === m.id && 'border-brand bg-brand/15 text-ink')}>{m.label}</button>)}</div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Level {level.level}</h2><Badge tone="brand">{level.tier.title} · {level.tier.form}</Badge></div>
            <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-muted"><span>{pet.xp} XP total</span><span>{level.span - level.into} to level {level.level + 1}</span></div><Progress value={level.progress * 100} label="XP progress" /></div>
            <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-muted"><span>Happiness</span><span>{pet.happiness}%</span></div><Progress value={pet.happiness} tone="gold" label="Happiness" /></div>
            <p className="mt-2 text-xs text-faint">Happiness rises when you study or play. It never drops below a comfortable level, and Lumi is never upset if you take a day off.</p>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); rename(name); setMsg('Name saved.'); }}><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} aria-label="Pet name" /><button className="btn-ghost">Rename</button></form>
          </Card>
          <Card>
            <h2 className="font-bold">Evolution</h2>
            <ol className="mt-2 space-y-2">{LEVEL_TIERS.map((t) => <li key={t.level} className="flex items-center gap-3 text-sm"><span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold', level.level >= t.level ? 'bg-gradient-to-br from-brand to-brand2 text-white' : 'bg-raised text-faint')}>{level.level >= t.level ? <Check size={14} /> : t.level}</span><span className={level.level >= t.level ? '' : 'text-muted'}>Level {t.level}: {t.title} <span className="text-faint">({t.form})</span></span><span className="ml-auto text-xs tabular-nums text-faint">{xpForLevel(t.level)} XP</span></li>)}</ol>
          </Card>
        </div>
      </div>
      <Card>
        <h2 className="font-bold">Wardrobe</h2>
        {owned.length <= 1 ? <p className="mt-1 text-sm text-muted">Nothing here yet beyond the Study Nook. Earn Stardust by studying, then pick something in the shop.</p> : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {owned.map((i) => { const on = pet.equipped[i.slot] === i.id; return <button key={i.id} onClick={() => equip(i.slot, on && i.slot !== 'habitat' ? undefined : i.id)} aria-pressed={on} className={cn('rounded-xl border p-3 text-left text-sm', on ? 'border-brand bg-brand/10' : 'border-line hover:border-brand/40')}><div className="font-semibold">{i.name}</div><div className="text-xs text-muted">{SLOT_NAME[i.slot]} · {on ? 'Equipped' : 'Tap to equip'}</div></button>; })}
          </div>
        )}
      </Card>
    </div>
  );
}

export function RewardsPage() {
  const pet = useStore((s) => s.pet);
  const buy = useStore((s) => s.buy);
  const equip = useStore((s) => s.equip);
  const level = useLevel();
  const [slot, setSlot] = useState<PetSlot>('hat');
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const eq = preview ? { ...pet.equipped, [preview.slot]: preview.id } : pet.equipped;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Companion" title="Rewards Shop" subtitle="Everything here is bought with Stardust, which you earn only by learning. There is no real money, no paid currency and no random boxes: you always see exactly what you get." />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="!p-0 overflow-hidden self-start">
          <Habitat id={eq.habitat} className="!rounded-none"><div className="grid h-56 place-items-end justify-center pb-2"><Pet mood="happy" level={level.level} equipped={eq} size={170} /></div></Habitat>
          <div className="p-4"><div className="flex items-center gap-2 font-display text-2xl font-bold"><Sparkles className="text-gold" size={22} /><span data-testid="coins">{pet.coins}</span><span className="text-sm font-medium text-muted">Stardust</span></div><p className="mt-1 text-xs text-muted">{preview ? `Previewing: ${preview.name}` : 'Select an item to preview it on Lumi.'}</p></div>
        </Card>
        <div>
          <Tabs label="Shop category" value={slot} onChange={(v) => { setSlot(v); setPreview(null); }} tabs={(Object.keys(SLOT_NAME) as PetSlot[]).map((k) => ({ id: k, label: SLOT_NAME[k] }))} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SHOP.filter((i) => i.slot === slot).map((i) => { const owned = pet.owned.includes(i.id); const on = pet.equipped[i.slot] === i.id; const locked = (i.minLevel ?? 0) > level.level; const afford = pet.coins >= i.price; return (
              <Card key={i.id} className={cn('!p-4', preview?.id === i.id && 'border-brand')} data-testid={`item-${i.id}`}>
                <button className="w-full text-left" onClick={() => setPreview(i)}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{i.name}</h3>{owned ? <Badge tone="ok">Owned</Badge> : <Badge tone="gold"><Sparkles size={11} />{i.price}</Badge>}</div><p className="mt-1 text-xs text-muted">{i.desc}</p></button>
                <div className="mt-3">
                  {owned ? <button className={on ? 'btn-ghost w-full !py-1.5' : 'btn-primary w-full !py-1.5'} onClick={() => equip(i.slot, on && i.slot !== 'habitat' ? undefined : i.id)}>{on ? (i.slot === 'habitat' ? 'In use' : 'Take off') : 'Equip'}</button>
                    : locked ? <button className="btn-ghost w-full !py-1.5" disabled><Lock size={14} />Unlocks at level {i.minLevel}</button>
                    : <button className="btn-primary w-full !py-1.5" disabled={!afford} onClick={() => { if (buy(i.id)) setPreview(null); }} data-testid={`buy-${i.id}`}>{afford ? `Buy for ${i.price}` : `Need ${i.price - pet.coins} more`}</button>}
                </div>
              </Card>
            ); })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AchievementsPage() {
  const got = useStore((s) => s.achievements);
  const n = Object.keys(got).length;
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Companion" title="Achievements" subtitle={`${n} of ${ACHIEVEMENTS.length} unlocked. Achievements are awarded automatically the moment you earn them, each with a Stardust bonus.`} />
      <Progress value={(n / ACHIEVEMENTS.length) * 100} label="Achievements unlocked" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => { const at = got[a.id]; const Icon = ICON[a.icon] ?? Award; return (
          <Card key={a.id} className={cn('flex gap-3 !p-4', !at && 'opacity-70')} data-testid={`ach-${a.id}`} data-unlocked={!!at}>
            <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', at ? 'bg-gradient-to-br from-brand to-brand2 text-white' : 'bg-raised text-faint')}><Icon size={22} /></span>
            <div className="min-w-0"><h2 className="font-semibold leading-tight">{a.title}</h2><p className="mt-0.5 text-xs text-muted">{a.desc}</p><p className="mt-1 text-xs">{at ? <span className="text-ok">Unlocked {new Date(at).toLocaleDateString()}</span> : <span className="text-faint">Locked</span>} · <span className="text-gold">+{a.coins} Stardust</span></p></div>
          </Card>
        ); })}
      </div>
    </div>
  );
}
