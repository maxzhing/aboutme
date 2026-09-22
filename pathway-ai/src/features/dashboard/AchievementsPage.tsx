import { useMemo } from 'react';
import { useEngine } from '@/store/useEngine';
import { Badge, Card } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { computeAchievements, currentStreak } from '@/domain/engine/achievements';
import { ProgressRing } from '@/components/charts';
import { groupBy, humanizeKey, countLabel } from '@/lib/format';
import { formatDate } from '@/lib/date';

/* Section 37 — tasteful gamification. */

const ICONS: Record<string, IconName> = {
  flag: 'flag',
  spark: 'sparkles',
  stack: 'layers',
  lens: 'lens',
  check: 'check',
  layers: 'layers',
  flame: 'flame',
  crown: 'crown',
  bookmark: 'bookmark',
  balance: 'balance',
  pen: 'pencil',
  roots: 'roots',
  trophy: 'trophy',
  seal: 'seal',
};

export function AchievementsPage() {
  const ctx = useEngine();
  const achievements = useMemo(() => computeAchievements(ctx), [ctx]);
  const byCategory = useMemo(() => groupBy(achievements, (a) => a.category), [achievements]);
  const earned = achievements.filter((a) => a.earnedAt).length;
  const streak = currentStreak(ctx);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Achievements"
        title="Consistency, not collection"
        description="These reward showing up and doing real work. None of them reward adding activities, and none of them make college admissions into a game you can win by grinding."
      />

      <div className="grid-3">
        <Card pad="md">
          <div className="row g-4 items-center">
            <ProgressRing
              value={(earned / achievements.length) * 100}
              size={56}
              label={`${earned}`}
              sublabel={`of ${achievements.length}`}
              ariaLabel={`${earned} of ${achievements.length} achievements earned`}
            />
            <div className="col">
              <span className="stat-label">Earned</span>
              <span className="t-sm subtle">Across every category</span>
            </div>
          </div>
        </Card>
        <Card pad="md">
          <div className="row g-4 items-center">
            <span className="empty-art" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn-soft-border)', color: 'var(--warn)' }}>
              <Icon name="flame" size={22} />
            </span>
            <div className="col">
              <span className="stat-value stat-value-sm">{countLabel(streak, 'day')}</span>
              <span className="t-xs subtle">Current streak</span>
            </div>
          </div>
        </Card>
        <Card pad="md">
          <div className="row g-4 items-center">
            <span className="empty-art" style={{ background: 'var(--ok-soft)', borderColor: 'var(--ok-soft-border)', color: 'var(--ok)' }}>
              <Icon name="chart" size={22} />
            </span>
            <div className="col">
              <span className="stat-value stat-value-sm">{ctx.account.attempts.length}</span>
              <span className="t-xs subtle">Questions answered</span>
            </div>
          </div>
        </Card>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="mt-8">
          <SectionHeader title={humanizeKey(category)} />
          <div className="grid-fit">
            {items.map((a) => {
              const done = Boolean(a.earnedAt);
              const pct = a.progress ? Math.min(100, (a.progress.current / a.progress.target) * 100) : 0;
              return (
                <Card key={a.id} pad="md" className={done ? 'card-accent' : undefined}>
                  <div className="row between g-3 items-start">
                    <span
                      className="empty-art"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--r-md)',
                        background: done ? 'var(--ok-soft)' : 'var(--surface-3)',
                        borderColor: done ? 'var(--ok-soft-border)' : 'var(--border)',
                        color: done ? 'var(--ok)' : 'var(--text-faint)',
                      }}
                    >
                      <Icon name={ICONS[a.icon] ?? 'star'} size={18} />
                    </span>
                    {done ? <Badge tone="ok">Earned</Badge> : null}
                  </div>
                  <h3 className="t-sm w-600 mt-3">{a.name}</h3>
                  <p className="t-xs subtle mt-2">{a.description}</p>
                  {a.progress && !done ? (
                    <div className="col g-1 mt-3">
                      <div className="bar bar-sm">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="t-2xs faint mono">
                        {a.progress.current} / {a.progress.target}
                      </span>
                    </div>
                  ) : null}
                  {done && a.earnedAt ? (
                    <p className="t-2xs faint mt-3">Earned {formatDate(a.earnedAt.slice(0, 10), 'short')}</p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <Card pad="md" inset className="mt-8">
        <div className="row g-3">
          <Icon name="info" size={17} className="subtle shrink-0" style={{ marginTop: 2 }} />
          <p className="t-sm">
            <strong>Why there are so few of these.</strong> Badges are good at reinforcing habits and bad at reflecting what
            matters in an application. Nothing here rewards joining more things, and nothing here is visible to anyone but you.
          </p>
        </div>
      </Card>
    </div>
  );
}
