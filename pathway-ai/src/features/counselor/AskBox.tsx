import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { answer, starterPrompts } from '@/domain/engine/counselor';

/** The large AI input shown on the home screen (section 71). */
export function AskBox() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();
  const ctx = useEngine();
  const { addChatMessage, addLearnedPreference } = useAppStore();

  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;
    addChatMessage({ role: 'user', content: question });
    const reply = answer(ctx, question);
    for (const learned of reply.learned) {
      addLearnedPreference({ statement: learned, kind: 'note', source: 'chat' });
    }
    addChatMessage({
      role: 'assistant',
      content: reply.content,
      citedProfileFields: reply.citedProfileFields,
      suggestions: reply.suggestions,
      links: reply.links,
      learned: reply.learned,
    });
    setValue('');
    navigate('/app/counselor');
  };

  return (
    <div className="col g-3">
      <div className="composer">
        <Icon name="sparkles" size={18} className="c-ai shrink-0" style={{ marginBottom: 8 }} />
        <textarea
          className="textarea grow"
          value={value}
          placeholder="Ask anything — “what am I missing?”, “should I take AP Physics?”, “what should I do this summer?”"
          aria-label="Ask Pathway AI"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(value);
            }
          }}
          rows={2}
        />
        <Button variant="primary" icon="send" onClick={() => send(value)} disabled={!value.trim()} aria-label="Send" />
      </div>
      <div className="tag-list">
        {starterPrompts(ctx).slice(0, 4).map((p) => (
          <button key={p} type="button" className="chip chip-sm" onClick={() => send(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
