import { useMemo, useState } from 'react';
import { Chip, SearchInput, Button, Field } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { INTERESTS, INTEREST_CLUSTERS, INTEREST_BY_ID } from '@/data/interests';
import { MAJORS, MAJOR_BY_ID, MAJOR_FAMILIES } from '@/data/majors';
import { CAREERS, CAREER_BY_ID } from '@/data/careers';
import { AP_COURSES } from '@/data/ap';
import { COLLEGE_PRIORITY_TAGS } from '@/data/colleges';
import type { MajorConfidence, MajorIntent } from '@/domain/types';
import { uniq } from '@/lib/format';

/* ==========================================================================
   Reusable pickers, shared by onboarding and the settings screens so the two
   never drift apart.
   ========================================================================== */

export function ChipMultiSelect({
  options,
  selected,
  onChange,
  columns,
  label,
}: {
  options: { id: string; label: string; description?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  columns?: boolean;
  label?: string;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  return (
    <div className={columns ? 'grid-fit-sm' : 'tag-list'} role="group" aria-label={label}>
      {options.map((o) => (
        <Chip key={o.id} selected={selected.includes(o.id)} onClick={() => toggle(o.id)} title={o.description}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

export function CustomEntryList({
  values,
  onChange,
  placeholder,
  label,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange(uniq([...values, v]));
    setDraft('');
  };
  return (
    <div className="col g-3">
      <div className="row g-2">
        <input
          className="input"
          value={draft}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button icon="plus" onClick={add} type="button" disabled={!draft.trim()}>
          Add
        </Button>
      </div>
      {values.length ? (
        <div className="tag-list">
          {values.map((v) => (
            <Chip key={v} onRemove={() => onChange(values.filter((x) => x !== v))}>
              {v}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function InterestPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTERESTS.filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="col g-5">
      <SearchInput value={query} onChange={setQuery} label="Search subjects" placeholder="Search subjects…" />
      {INTEREST_CLUSTERS.map((cluster) => {
        const items = filtered.filter((i) => i.cluster === cluster);
        if (!items.length) return null;
        return (
          <div key={cluster} className="col g-3">
            <p className="eyebrow">{cluster}</p>
            <ChipMultiSelect
              label={cluster}
              options={items.map((i) => ({ id: i.id, label: i.name }))}
              selected={selected}
              onChange={onChange}
            />
          </div>
        );
      })}
      {!filtered.length ? <p className="t-sm subtle">Nothing matched. Add it as a custom interest below.</p> : null}
    </div>
  );
}

const CONFIDENCE_OPTIONS: { id: MajorConfidence; label: string; description: string }[] = [
  { id: 'firm', label: 'Fairly set on it', description: 'You would be surprised to change' },
  { id: 'leaning', label: 'Leaning toward it', description: 'Most likely, but not decided' },
  { id: 'exploring', label: 'Exploring', description: 'Genuinely considering it' },
];

export function MajorPicker({ value, onChange }: { value: MajorIntent[]; onChange: (next: MajorIntent[]) => void }) {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MAJORS.filter((m) => {
      if (m.id === 'undecided') return false;
      if (family !== 'all' && m.family !== family) return false;
      return !q || m.name.toLowerCase().includes(q) || m.summary.toLowerCase().includes(q);
    });
  }, [query, family]);

  const toggle = (majorId: string) => {
    if (value.some((v) => v.majorId === majorId)) onChange(value.filter((v) => v.majorId !== majorId));
    else onChange([...value, { majorId, confidence: 'exploring' }]);
  };

  return (
    <div className="col g-5">
      <div className="row g-2 wrap">
        <SearchInput value={query} onChange={setQuery} label="Search majors" placeholder="Search majors…" />
        <select
          className="select"
          style={{ maxWidth: 220 }}
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          aria-label="Filter by field"
        >
          <option value="all">All fields</option>
          {MAJOR_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {value.length ? (
        <div className="col g-3">
          <p className="eyebrow">Your selections — how sure are you?</p>
          {value.map((intent) => (
            <div className="card card-pad-sm" key={intent.majorId}>
              <div className="row between g-3">
                <span className="w-600 t-sm">{MAJOR_BY_ID.get(intent.majorId)?.name}</span>
                <Button size="xs" variant="ghost" icon="x" onClick={() => toggle(intent.majorId)} aria-label="Remove" />
              </div>
              <div className="tag-list mt-3">
                {CONFIDENCE_OPTIONS.map((c) => (
                  <Chip
                    key={c.id}
                    size="sm"
                    selected={intent.confidence === c.id}
                    title={c.description}
                    onClick={() =>
                      onChange(value.map((v) => (v.majorId === intent.majorId ? { ...v, confidence: c.id } : v)))
                    }
                  >
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid-fit">
        {filtered.slice(0, 40).map((m) => {
          const on = value.some((v) => v.majorId === m.id);
          return (
            <button
              key={m.id}
              type="button"
              className={`card card-pad-sm ${on ? 'card-accent' : 'card-hover'}`}
              style={{ textAlign: 'left' }}
              aria-pressed={on}
              onClick={() => toggle(m.id)}
            >
              <div className="row between g-2">
                <span className="t-sm w-600">{m.name}</span>
                {on ? <Icon name="check" size={15} className="c-accent" /> : null}
              </div>
              <p className="t-2xs subtle mt-2 clamp-2">{m.summary}</p>
              <p className="t-2xs faint mt-2">{m.family}</p>
            </button>
          );
        })}
      </div>
      {!filtered.length ? <p className="t-sm subtle">No majors matched that search.</p> : null}
    </div>
  );
}

export function CareerPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CAREERS.filter((c) => !q || c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q));
  }, [query]);
  return (
    <div className="col g-4">
      <SearchInput value={query} onChange={setQuery} label="Search careers" placeholder="Search careers…" />
      <ChipMultiSelect
        label="Careers"
        options={filtered.map((c) => ({ id: c.id, label: c.name, description: c.summary }))}
        selected={selected}
        onChange={onChange}
      />
      {selected.length ? (
        <p className="t-xs subtle">Selected: {selected.map((id) => CAREER_BY_ID.get(id)?.name ?? id).join(', ')}</p>
      ) : null}
    </div>
  );
}

export function PriorityPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="grid-fit">
      {COLLEGE_PRIORITY_TAGS.map((tag) => {
        const on = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={`card card-pad-sm ${on ? 'card-accent' : 'card-hover'}`}
            style={{ textAlign: 'left' }}
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((s) => s !== tag.id) : [...selected, tag.id])}
          >
            <div className="row between g-2">
              <span className="t-sm w-600">{tag.label}</span>
              {on ? <Icon name="check" size={15} className="c-accent" /> : null}
            </div>
            <p className="t-2xs subtle mt-2">{tag.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function APOfferingPicker({ selected, onChange }: { selected: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState('');
  const families = useMemo(() => Array.from(new Set(AP_COURSES.map((c) => c.family))), []);
  const q = query.trim().toLowerCase();
  return (
    <div className="col g-4">
      <div className="row g-2 wrap">
        <SearchInput value={query} onChange={setQuery} label="Search AP courses" placeholder="Search AP courses…" />
        <Button size="sm" onClick={() => onChange(AP_COURSES.map((c) => c.id))}>
          Select all
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange([])}>
          Clear
        </Button>
      </div>
      {families.map((family) => {
        const items = AP_COURSES.filter((c) => c.family === family && (!q || c.name.toLowerCase().includes(q)));
        if (!items.length) return null;
        return (
          <div key={family} className="col g-2">
            <p className="eyebrow">{family}</p>
            <ChipMultiSelect
              label={family}
              options={items.map((c) => ({ id: c.id, label: c.name.replace('AP ', '') }))}
              selected={selected}
              onChange={onChange}
            />
          </div>
        );
      })}
    </div>
  );
}

export function SelectedInterestSummary({ ids, custom }: { ids: string[]; custom: string[] }) {
  if (!ids.length && !custom.length) return <p className="t-sm subtle">Nothing selected yet.</p>;
  return (
    <div className="tag-list">
      {ids.map((id) => (
        <Chip key={id} size="sm">
          {INTEREST_BY_ID.get(id)?.name ?? id}
        </Chip>
      ))}
      {custom.map((c) => (
        <Chip key={c} size="sm">
          {c}
        </Chip>
      ))}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
  suffix,
  placeholder,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(props) => (
        <div className="row g-2">
          <input
            {...props}
            className="input"
            type="number"
            inputMode="decimal"
            value={value ?? ''}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
          {suffix ? <span className="t-sm subtle shrink-0">{suffix}</span> : null}
        </div>
      )}
    </Field>
  );
}
