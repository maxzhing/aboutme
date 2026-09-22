import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { globalSearch, SEARCH_ACTIONS } from '@/lib/globalSearch';
import { highlightRuns } from '@/lib/search';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { answer } from '@/domain/engine/counselor';
import { groupBy } from '@/lib/format';

/* ==========================================================================
   Command palette — sections 48 and 39.
   Cmd/Ctrl+K anywhere. Typing a question routes it to the AI counselor
   instead of forcing the student to rephrase as a search.
   ========================================================================== */

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const ctx = useEngine();
  const { addChatMessage } = useAppStore();

  const looksLikeQuestion = query.trim().length > 12 && /\?$|^(what|how|should|can|where|when|why|who|is|do|does|find|show|tell)\b/i.test(query.trim());

  const results = useMemo(() => {
    if (!query.trim()) {
      return SEARCH_ACTIONS.slice(0, 8).map((item) => ({ item, score: 0, matches: undefined }));
    }
    return globalSearch(query, 24);
  }, [query]);

  const grouped = useMemo(() => groupBy(results, (r) => r.item.kind), [results]);
  const flat = useMemo(() => Object.values(grouped).flat(), [grouped]);
  const totalItems = flat.length + (looksLikeQuestion ? 1 : 0);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (index: number) => {
    if (looksLikeQuestion && index === 0) {
      addChatMessage({ role: 'user', content: query.trim() });
      const reply = answer(ctx, query.trim());
      addChatMessage({
        role: 'assistant',
        content: reply.content,
        citedProfileFields: reply.citedProfileFields,
        suggestions: reply.suggestions,
        links: reply.links,
        learned: reply.learned,
      });
      navigate('/app/counselor');
      onClose();
      return;
    }
    const offset = looksLikeQuestion ? 1 : 0;
    const target = flat[index - offset];
    if (target) {
      navigate(target.item.route);
      onClose();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let renderIndex = looksLikeQuestion ? 1 : 0;

  return (
    <div className="cmdk-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Search and commands">
        <div className="cmdk-input-row">
          <Icon name="search" size={18} className="subtle" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            className="input cmdk-input"
            placeholder="Search colleges, AP units, SAT topics — or ask a question"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={`cmdk-item-${active}`}
            autoComplete="off"
          />
          <kbd className="kbd">Esc</kbd>
        </div>

        <div className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {looksLikeQuestion ? (
            <>
              <p className="cmdk-group-label">Ask Pathway AI</p>
              <button
                type="button"
                className="cmdk-item"
                data-active={active === 0}
                id="cmdk-item-0"
                role="option"
                aria-selected={active === 0}
                onMouseEnter={() => setActive(0)}
                onClick={() => go(0)}
              >
                <Icon name="sparkles" size={16} className="c-ai" />
                <span className="grow truncate">“{query.trim()}”</span>
                <span className="cmdk-item-kind">Ask</span>
              </button>
            </>
          ) : null}

          {Object.entries(grouped).map(([kind, items]) => (
            <div key={kind}>
              <p className="cmdk-group-label">{kind}</p>
              {items.map((r) => {
                const index = renderIndex++;
                const runs = highlightRuns(r.item.title, r.matches);
                return (
                  <button
                    key={r.item.id}
                    type="button"
                    className="cmdk-item"
                    data-active={active === index}
                    id={`cmdk-item-${index}`}
                    role="option"
                    aria-selected={active === index}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(index)}
                  >
                    <Icon name={r.item.icon} size={16} className="subtle" />
                    <span className="col grow" style={{ minWidth: 0 }}>
                      <span className="truncate">
                        {runs.map((run, i) =>
                          run.hit ? (
                            <mark key={i} style={{ background: 'transparent', color: 'var(--accent-text)', fontWeight: 650 }}>
                              {run.text}
                            </mark>
                          ) : (
                            <span key={i}>{run.text}</span>
                          ),
                        )}
                      </span>
                      <span className="t-2xs faint truncate">{r.item.subtitle}</span>
                    </span>
                    <span className="cmdk-item-kind">{r.item.kind}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {!flat.length && !looksLikeQuestion ? (
            <p className="p-6 ta-center t-sm subtle">
              Nothing matched “{query}”. Try a college name, an AP unit, or ask a full question.
            </p>
          ) : null}
        </div>

        <div className="cmdk-foot">
          <span className="cmdk-hint">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> navigate
          </span>
          <span className="cmdk-hint">
            <kbd className="kbd">↵</kbd> open
          </span>
          <span className="cmdk-hint ml-auto">Ask a full question to send it to the AI counselor</span>
        </div>
      </div>
    </div>
  );
}
