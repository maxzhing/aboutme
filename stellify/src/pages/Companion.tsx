import Link from 'next/link';
import { Award, BookOpen, CalendarCheck, CalendarHeart, Check, Compass, Crown, Flame, FunctionSquare, GraduationCap, Heart, Languages, Lock, Medal, Mountain, PenLine, Rocket, ShieldCheck, Sigma, Sparkles, Star, Sun, Target, Trophy, Wrench, Zap, type LucideIcon } from 'lucide-react';

const ICON: Record<string, LucideIcon> = { Sparkles, Flame, Trophy, Target, Zap, PenLine, Sigma, FunctionSquare, BookOpen, CalendarCheck, CalendarHeart, Compass, Medal, Wrench, ShieldCheck, Sun, GraduationCap, Languages, Star, Rocket, Mountain, Crown };
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Egg } from 'lucide-react';
import { collectionOf, eggOf, petName, RARITY_LABEL, SPECIES, speciesById, type Rarity } from '@/lib/engine/companions';
import { Confetti } from '@/components/Confetti';
import { sfx } from '@/lib/sfx';
import { SHOP, SLOT_NAME, type ShopItem } from '@/data/shop';
import { useStore } from '@/lib/store';
import { useLevel } from '@/lib/hooks';
import { ACHIEVEMENTS } from '@/lib/engine/achievements';
import { LEVEL_TIERS, xpForLevel } from '@/lib/engine/xp';
import type { PetSlot } from '@/lib/types';
import { EggArt, Habitat, Pet, type PetMood } from '@/components/Pet';
import { Badge, Card, PageHeader, Progress, Tabs, cn } from '@/components/ui';

const MOODS: { id: PetMood; label: string }[] = [{ id: 'idle', label: 'Idle' }, { id: 'walk', label: 'Walk' }, { id: 'study', label: 'Study' }, { id: 'think', label: 'Think' }, { id: 'celebrate', label: 'Celebrate' }, { id: 'sleep', label: 'Sleep' }, { id: 'levelup', label: 'Level up' }];

export function PetPage() {
  const pet = useStore((s) => s.pet);
  const activity = useStore((s) => s.activity);
  const egg = useMemo(() => eggOf({ pet, activity }), [pet, activity]);
  const [hatched, setHatched] = useState<string | null>(null);
  if (!pet.species || hatched) return <EggPage egg={egg} hatched={hatched} onHatched={setHatched} />;
  return <CompanionHome egg={egg} onHatched={setHatched} />;
}

type Egg = ReturnType<typeof eggOf>;

/** Hatch flow: the egg shakes, cracks, and reveals a random companion. */
function useHatch(onHatched: (id: string) => void) {
  const hatch = useStore((s) => s.hatchEgg);
  const [cracking, setCracking] = useState(false);
  const start = () => {
    if (cracking) return;
    setCracking(true); sfx('tap');
    window.setTimeout(() => { const id = hatch(); setCracking(false); if (id) { sfx('win'); onHatched(id); } }, 900);
  };
  return { cracking, start };
}

function EggProgress({ egg }: { egg: NonNullable<Egg> }) {
  return (
    <div className="space-y-2" data-testid="egg-progress">
      <div className="flex justify-between text-sm"><span className="font-semibold">Lessons finished</span><span className="tabular-nums text-muted">{egg.lessons}/{egg.need.lessons}</span></div>
      <Progress value={(egg.lessons / egg.need.lessons) * 100} tone={egg.lessons >= egg.need.lessons ? 'ok' : 'brand'} label="Lessons toward hatching" />
      <div className="flex justify-between text-sm"><span className="font-semibold">XP earned</span><span className="tabular-nums text-muted">{egg.xp}/{egg.need.xp}</span></div>
      <Progress value={(egg.xp / egg.need.xp) * 100} tone={egg.xp >= egg.need.xp ? 'ok' : 'gold'} label="XP toward hatching" />
    </div>
  );
}

function EggPage({ egg, hatched, onHatched }: { egg: Egg; hatched: string | null; onHatched: (id: string) => void }) {
  const pet = useStore((s) => s.pet);
  const rename = useStore((s) => s.renamePet);
  const switchTo = useStore((s) => s.setCompanion);
  const { cracking, start } = useHatch(onHatched);
  const sp = speciesById(hatched ?? undefined);
  // the first companion becomes active right away; later ones join the collection
  const first = !!sp && pet.species === sp.id;
  const [name, setName] = useState('');
  const [fire, setFire] = useState(0);
  useEffect(() => { if (hatched) setFire(Date.now()); }, [hatched]);
  return (
    <div className="space-y-4">
      <Confetti fire={fire} count={90} />
      <PageHeader eyebrow="Companion" title={sp ? `Meet ${first ? pet.name || sp.name : sp.name}!` : 'Your companion egg'} subtitle={sp ? `A ${RARITY_LABEL[sp.rarity].toLowerCase()} ${sp.kind} hatched from your egg. ${sp.blurb}` : 'Every student gets an egg, and nobody knows what is inside until it hatches: it could be any of ten companions, some rarer than others. Study to keep it warm. Finishing lessons and earning XP (from correct answers, lessons and reviews) both count.'} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="!p-0 self-start overflow-hidden">
          <Habitat id={pet.equipped.habitat} className="!rounded-none">
            <div className="grid h-80 place-items-end justify-center pb-3" data-testid={sp ? 'hatched' : 'egg-stage'}>
              {sp ? <motion.div initial={{ scale: 0.3, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}><Pet species={sp.id} mood="celebrate" size={250} /></motion.div>
                : <button type="button" onClick={() => egg?.ready && start()} disabled={!egg?.ready} className="rounded-3xl" aria-label={egg?.ready ? 'Hatch your egg' : 'Your egg is still warming up'}><EggArt pct={egg?.pct ?? 0} ready={!!egg?.ready} pattern={egg?.pattern ?? 0} size={240} cracking={cracking} /></button>}
            </div>
          </Habitat>
          <div className="p-4 text-center">
            {sp ? <p className="font-semibold" aria-live="polite">It&apos;s {sp.name} the {sp.kind}! <Badge tone={sp.rarity === 'legendary' ? 'gold' : sp.rarity === 'rare' ? 'ok' : 'default'}>{RARITY_LABEL[sp.rarity]}</Badge></p>
              : egg?.ready ? <button type="button" className="btn-primary !px-6 !py-3 text-base" onClick={start} disabled={cracking} data-testid="hatch">{cracking ? 'Hatching…' : 'Hatch your egg!'}</button>
              : <p className="text-sm text-muted">Your egg is {Math.round((egg?.pct ?? 0) * 100)}% warm.</p>}
          </div>
        </Card>
        <div className="space-y-4">
          {sp && !first ? (
            <Card className="space-y-3">
              <h2 className="font-bold">{sp.name} joined your collection</h2>
              <p className="text-sm text-muted">Make {sp.name} your active companion now, or keep {petName(pet)} and switch any time from your collection.</p>
              <button type="button" className="btn-primary w-full" onClick={() => { switchTo(sp.id); onHatched(''); }} data-testid="make-active">Make {sp.name} my companion</button>
              <button type="button" className="btn-ghost w-full" onClick={() => onHatched('')} data-testid="done-hatch">Keep {petName(pet)}</button>
            </Card>
          ) : sp ? (
            <Card className="space-y-3">
              <h2 className="font-bold">Name your companion</h2>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); rename(name || sp.name); onHatched(''); }}><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder={sp.name} aria-label="Companion name" data-testid="name-pet" /><button className="btn-primary">Save</button></form>
              <p className="text-xs text-muted">Leave it blank to keep the name {sp.name}. A new egg is already waiting: keep studying to hatch more companions for your collection.</p>
              <button type="button" className="btn-ghost w-full" onClick={() => onHatched('')} data-testid="done-hatch">Go to {pet.name || sp.name}</button>
            </Card>
          ) : egg ? (
            <Card className="space-y-3">
              <h2 className="flex items-center gap-2 font-bold"><Egg size={18} className="text-accent" />{egg.ready ? 'Ready to hatch!' : 'Keep your egg warm'}</h2>
              <EggProgress egg={egg} />
              <ul className="space-y-1.5 text-sm text-muted">
                <li>• Finish any lesson: an SAT lesson, a chapter, or an AP course lesson.</li>
                <li>• Earn XP: answer questions, fix mistakes, take mock exams.</li>
              </ul>
              {!egg.ready && <div className="flex flex-wrap gap-2"><Link href="/learn" className="btn-primary">Do a lesson</Link><Link href="/practice/session?mode=smart&n=5" className="btn-ghost">5 quick questions</Link></div>}
            </Card>
          ) : null}
          <Card>
            <h2 className="font-bold">Who could be inside?</h2>
            <div className="mt-2 grid grid-cols-5 gap-1.5">{SPECIES.map((x) => <div key={x.id} className="grid place-items-center rounded-xl bg-raised/60 p-1" title={`${RARITY_LABEL[x.rarity]} companion`}><span className="sr-only">A {RARITY_LABEL[x.rarity].toLowerCase()} companion</span><Silhouette rarity={x.rarity} /></div>)}</div>
            <p className="mt-2 text-xs text-muted">Ten companions: five common, four rare and one legendary. Each egg hatches one you do not have yet.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

const Silhouette = ({ rarity }: { rarity: Rarity }) => <span className={cn('grid h-10 w-10 place-items-center rounded-full text-lg font-black', rarity === 'legendary' ? 'bg-gold/20 text-gold' : rarity === 'rare' ? 'bg-brand2/15 text-brand2' : 'bg-ink/10 text-muted')} aria-hidden>?</span>;

function CompanionHome({ egg, onHatched }: { egg: Egg; onHatched: (id: string) => void }) {
  const pet = useStore((s) => s.pet);
  const care = useStore((s) => s.carePet);
  const rename = useStore((s) => s.renamePet);
  const switchTo = useStore((s) => s.setCompanion);
  const level = useLevel();
  const sp = speciesById(pet.species)!;
  const display = petName(pet);
  const [mood, setMood] = useState<PetMood>('idle');
  const [hearts, setHearts] = useState(0);
  const [name, setName] = useState(display);
  const [msg, setMsg] = useState('');
  const { cracking, start } = useHatch(onHatched);
  useEffect(() => setName(petName(pet)), [pet.species]); // eslint-disable-line react-hooks/exhaustive-deps
  const react = (m: PetMood, text: string) => { setMood(m); setMsg(text); setTimeout(() => setMood('idle'), 2600); };
  const owned = SHOP.filter((i) => pet.owned.includes(i.id));
  const col = collectionOf(pet);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Companion" title={`My Pet: ${display}`} subtitle={`${display} is a ${RARITY_LABEL[sp.rarity].toLowerCase()} ${sp.kind}. ${sp.blurb} ${display} grows as you learn: XP comes from correct answers, finished lessons, fixed mistakes, mastery and mock exams, never from mindless repetition.`} actions={<Link href="/rewards" className="btn-primary">Visit the shop</Link>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="!p-0 overflow-hidden">
          <Habitat id={pet.equipped.habitat} className="!rounded-none">
            <div className="relative grid h-80 place-items-end justify-center pb-3">
              <Pet mood={mood} level={level.level} equipped={pet.equipped} size={250} onClick={() => { care('pet'); setHearts((h) => h + 1); react('happy', `${display} loves that.`); }} label={`Pet ${display}`} />
              {hearts > 0 && <Heart key={hearts} className="pointer-events-none absolute left-1/2 top-16 animate-zzz fill-bad text-bad" size={26} />}
            </div>
          </Habitat>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={() => { care('pet'); setHearts((h) => h + 1); react('happy', `${display} loves that.`); }} data-testid="pet-pet">Pet</button>
              <button className="btn-ghost" onClick={() => { if (care('treat')) react('celebrate', `${display} enjoyed the snack. (−5 Stardust)`); else setMsg('A snack costs 5 Stardust. Earn some by studying.'); }}>Snack · 5</button>
              <button className="btn-ghost" onClick={() => { care('play'); react('walk', `${display} is off for a stroll.`); }}>Play</button>
              <Link href="/practice/session?mode=smart&n=5" className="btn-primary">Study together</Link>
            </div>
            <p className="mt-2 min-h-5 text-sm text-muted" aria-live="polite">{msg}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><span className="text-xs text-faint">Preview animations:</span>{MOODS.map((m) => <button key={m.id} onClick={() => setMood(m.id)} aria-pressed={mood === m.id} className={cn('chip', mood === m.id && 'border-accent bg-accent/15 text-ink')}>{m.label}</button>)}</div>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Level {level.level}</h2><Badge tone="brand">{level.tier.title} · {level.tier.form}</Badge></div>
            <div className="mt-2"><div className="mb-1 flex justify-between text-xs text-muted"><span>{pet.xp} XP total</span><span>{level.span - level.into} to level {level.level + 1}</span></div><Progress value={level.progress * 100} label="XP progress" /></div>
            <div className="mt-3"><div className="mb-1 flex justify-between text-xs text-muted"><span>Happiness</span><span>{pet.happiness}%</span></div><Progress value={pet.happiness} tone="gold" label="Happiness" /></div>
            <p className="mt-2 text-xs text-faint">Happiness rises when you study or play. It never drops below a comfortable level, and {display} is never upset if you take a day off.</p>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); rename(name); setMsg('Name saved.'); }}><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} aria-label="Pet name" /><button className="btn-ghost">Rename</button></form>
          </Card>
          <Card>
            <h2 className="font-bold">Growing up</h2>
            <ol className="mt-2 space-y-2">{LEVEL_TIERS.map((t) => <li key={t.level} className="flex items-center gap-3 text-sm"><span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold', level.level >= t.level ? 'bg-accent text-white' : 'bg-raised text-faint')}>{level.level >= t.level ? <Check size={14} /> : t.level}</span><span className={level.level >= t.level ? '' : 'text-muted'}>Level {t.level}: {t.title} <span className="text-faint">({t.form})</span></span><span className="ml-auto text-xs tabular-nums text-faint">{xpForLevel(t.level)} XP</span></li>)}</ol>
          </Card>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card data-testid="collection">
          <h2 className="font-bold">Collection · {col.length}/{SPECIES.length}</h2>
          <p className="mt-1 text-sm text-muted">Tap a companion you have hatched to make it your active one. Your level, Stardust and wardrobe stay the same.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{SPECIES.map((x) => { const have = col.find((c) => c.id === x.id); const on = pet.species === x.id; return have ? (
            <button key={x.id} type="button" onClick={() => switchTo(x.id)} aria-pressed={on} className={cn('rounded-2xl border p-2 text-center text-xs', on ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/50')} data-testid={`companion-${x.id}`}>
              <Pet species={x.id} size={72} still /><div className="font-semibold">{have.name ?? x.name}</div><div className="text-faint">{RARITY_LABEL[x.rarity]}</div>
            </button>
          ) : (
            <div key={x.id} className="grid place-items-center rounded-2xl border border-dashed border-line p-2 text-center text-xs text-faint"><Silhouette rarity={x.rarity} /><div className="mt-2">Not hatched</div><div>{RARITY_LABEL[x.rarity]}</div></div>
          ); })}</div>
        </Card>
        {egg && (
          <Card className="space-y-3" data-testid="next-egg">
            <h2 className="flex items-center gap-2 font-bold"><Egg size={18} className="text-accent" />Your next egg</h2>
            <div className="grid place-items-center"><button type="button" onClick={() => egg.ready && start()} disabled={!egg.ready} aria-label={egg.ready ? 'Hatch your egg' : 'Your egg is still warming up'}><EggArt pct={egg.pct} ready={egg.ready} pattern={egg.pattern} size={120} cracking={cracking} /></button></div>
            {egg.ready ? <button type="button" className="btn-primary w-full" onClick={start} disabled={cracking} data-testid="hatch">{cracking ? 'Hatching…' : 'Hatch it!'}</button> : <EggProgress egg={egg} />}
          </Card>
        )}
      </div>
      <Card>
        <h2 className="font-bold">Wardrobe</h2>
        {owned.length <= 1 ? <p className="mt-1 text-sm text-muted">Nothing here yet beyond the Study Nook. Earn Stardust by studying, then pick something in the shop.</p> : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {owned.map((i) => { const on = pet.equipped[i.slot] === i.id; return <WardrobeItem key={i.id} item={i} on={on} />; })}
          </div>
        )}
      </Card>
    </div>
  );
}

function WardrobeItem({ item, on }: { item: ShopItem; on: boolean }) {
  const equip = useStore((s) => s.equip);
  return <button onClick={() => equip(item.slot, on && item.slot !== 'habitat' ? undefined : item.id)} aria-pressed={on} className={cn('rounded-xl border p-3 text-left text-sm', on ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/40')}><div className="font-semibold">{item.name}</div><div className="text-xs text-muted">{SLOT_NAME[item.slot]} · {on ? 'Equipped' : 'Tap to equip'}</div></button>;
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
      <PageHeader eyebrow="Companion" title="Rewards Shop" subtitle="Everything here is bought with Stardust, which you earn only by learning. There is no real money and no paid currency: you always see exactly what you get. (Eggs are never sold; they are earned only by studying.)" />
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="!p-0 overflow-hidden self-start">
          <Habitat id={eq.habitat} className="!rounded-none"><div className="grid h-56 place-items-end justify-center pb-2"><Pet mood="happy" level={level.level} equipped={eq} size={170} /></div></Habitat>
          <div className="p-4"><div className="flex items-center gap-2 font-display text-2xl font-bold"><Sparkles className="text-gold" size={22} /><span data-testid="coins">{pet.coins}</span><span className="text-sm font-medium text-muted">Stardust</span></div><p className="mt-1 text-xs text-muted">{preview ? `Previewing: ${preview.name}` : 'Select an item to preview it on your companion.'}</p></div>
        </Card>
        <div>
          <Tabs label="Shop category" value={slot} onChange={(v) => { setSlot(v); setPreview(null); }} tabs={(Object.keys(SLOT_NAME) as PetSlot[]).map((k) => ({ id: k, label: SLOT_NAME[k] }))} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {SHOP.filter((i) => i.slot === slot).map((i) => { const owned = pet.owned.includes(i.id); const on = pet.equipped[i.slot] === i.id; const locked = (i.minLevel ?? 0) > level.level; const afford = pet.coins >= i.price; return (
              <Card key={i.id} className={cn('!p-4', preview?.id === i.id && 'border-brand')} data-testid={`item-${i.id}`}>
                <button className="w-full text-left" onClick={() => setPreview(i)}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{i.name}</h3>{owned ? <Badge tone="ok">Owned</Badge> : <Badge tone="gold"><Sparkles size={11} />{i.price}</Badge>}</div><p className="mt-1 text-xs text-muted">{i.desc}</p></button>
                <div className="mt-3">
                  {owned ? <button className={on ? 'btn-ghost w-full !py-1.5' : 'btn-primary w-full !py-1.5'} onClick={() => equip(i.slot, on && i.slot !== 'habitat' ? undefined : i.id)}>{on ? (i.slot === 'habitat' ? 'In use' : 'Take off') : 'Equip'}</button>
                    : locked ? <button className="btn-ghost w-full !py-1.5" disabled><Lock size={14} />Available at level {i.minLevel}</button>
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
      <PageHeader eyebrow="Companion" title="Achievements" subtitle={`${n} of ${ACHIEVEMENTS.length} earned. Achievements are awarded automatically the moment you earn them, each with a Stardust bonus.`} />
      <Progress value={(n / ACHIEVEMENTS.length) * 100} label="Achievements earned" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => { const at = got[a.id]; const Icon = ICON[a.icon] ?? Award; return (
          <Card key={a.id} className={cn('flex gap-3 !p-4', !at && 'border-dashed')} data-testid={`ach-${a.id}`} data-unlocked={!!at}>
            <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', at ? 'bg-brand-solid text-white' : 'bg-raised text-faint')}><Icon size={22} /></span>
            <div className="min-w-0"><h2 className="font-semibold leading-tight">{a.title}</h2><p className="mt-0.5 text-xs text-muted">{a.desc}</p><p className="mt-1 text-xs">{at ? <span className="text-ok">Unlocked {new Date(at).toLocaleDateString()}</span> : <span className="text-faint">Locked</span>} · <span className="text-gold">+{a.coins} Stardust</span></p></div>
          </Card>
        ); })}
      </div>
    </div>
  );
}
