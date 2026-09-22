import { useMemo } from 'react';
import { useEngine } from '@/store/useEngine';
import { Card } from '@/components/ui/primitives';
import { NavCard, PageHeader, SectionHeader } from '@/components/ui/shared';
import { Badge } from '@/components/ui/primitives';
import { buildStudentDNA } from '@/domain/engine/dna';
import { findBlindSpots } from '@/domain/engine/planning';
import { currentStreak } from '@/domain/engine/achievements';
import { countLabel } from '@/lib/format';

export function PathHome() {
  const ctx = useEngine();
  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);
  const spots = useMemo(() => findBlindSpots(ctx), [ctx]);
  const important = spots.filter((s) => s.priority === 'important').length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="My Path"
        title="Everything about where you are going"
        description="Your profile as the engine reads it, what it thinks you are missing, how your years map out, and what changes if you change something."
      />

      <div className="grid-fit-lg">
        <NavCard
          to="/app/path/dna"
          icon="brain"
          title="Your Student DNA"
          description="Academic strengths with the evidence behind each one, major matches with reasons, and development areas stated without shaming you."
          meta={<Badge tone="ai">{countLabel(dna.academicStrengths.length, 'strength')}</Badge>}
        />
        <NavCard
          to="/app/path/blind-spots"
          icon="lens"
          title="Find my blind spots"
          description="What your profile is missing, in priority order — and nothing invented to give you more work."
          meta={important ? <Badge tone="danger">{important} important</Badge> : <Badge tone="ok">Clear</Badge>}
        />
        <NavCard
          to="/app/path/four-year"
          icon="map"
          title="Four-year plan"
          description="A roadmap through high school, customised to the grade you are actually in and what you have already done."
          meta={<Badge>Grade {ctx.grade}</Badge>}
        />
        <NavCard
          to="/app/path/what-if"
          icon="sliders"
          title="What if?"
          description="Change a variable — your score, your major, your budget, your region — and see how options and preparation shift."
        />
        <NavCard
          to="/app/path/graph"
          icon="link"
          title="Interest graph"
          description="How your interests connect through skills and activities to majors, colleges and careers — including routes you have not considered."
        />
        <NavCard
          to="/app/path/weekly"
          icon="chart"
          title="Weekly review"
          description="What you accomplished, what improved, what is unfinished, and the patterns worth noticing."
        />
        <NavCard
          to="/app/path/achievements"
          icon="trophy"
          title="Achievements"
          description="Milestones that reward consistency and genuine work — never volume of activities."
          meta={<Badge>{countLabel(currentStreak(ctx), 'day')} streak</Badge>}
        />
      </div>

      {dna.missingInputs.length ? (
        <Card pad="md" className="mt-6">
          <SectionHeader
            title="What we still do not know about you"
            description="Each of these limits what the rest of the app can say."
          />
          <ul className="col g-2">
            {dna.missingInputs.map((m) => (
              <li key={m} className="t-sm muted">
                • {m}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
