import katex from 'katex';
import { createContext, Fragment, memo, useContext } from 'react';
import { tokenize } from '@/lib/richtext';
import { typeset as typesetProse } from '@/lib/typeset';

/** Pages whose prose is full of code (AP Computer Science A) switch typesetting off, so string literals keep straight quotes. */
export const TypesetContext = createContext(true);

const tex = (v: string, displayMode: boolean) => {
  try { return katex.renderToString(v, { displayMode, throwOnError: false, output: 'htmlAndMathml' }); }
  catch { return v; }
};

/** Renders question/lesson text: inline and display math (KaTeX), emphasis, underlines, blanks. */
export const RichText = memo(function RichText({ text, className, block }: { text: string; className?: string; block?: boolean }) {
  const on = useContext(TypesetContext);
  const typeset = on ? typesetProse : (v: string) => v;
  const paras = text.split(/\n\n+/);
  const render = (src: string) => tokenize(src).map((t, i) => {
    switch (t.t) {
      case 'math': return <span key={i} dangerouslySetInnerHTML={{ __html: tex(t.v, false) }} />;
      case 'dmath': return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: tex(t.v, true) }} />;
      case 'bold': return <strong key={i} className="font-semibold">{typeset(t.v)}</strong>;
      case 'under': return <span key={i} className="underline decoration-brand2 decoration-2 underline-offset-4">{typeset(t.v)}</span>;
      case 'ital': return <em key={i}>{typeset(t.v)}</em>;
      case 'code': return <code key={i} className="rounded bg-ink/[0.07] px-1.5 py-0.5 font-mono text-[0.92em] [overflow-wrap:anywhere]">{t.v}</code>;
      case 'blank': return <span key={i} className="mx-0.5 inline-block w-16 translate-y-0.5 border-b-2 border-ink/70 align-baseline" role="img" aria-label="blank" />;
      case 'br': return <br key={i} />;
      default: return <Fragment key={i}>{typeset(t.v)}</Fragment>;
    }
  });
  // fenced code blocks (~~~ … ~~~) keep their line breaks and spacing exactly
  if (text.includes('~~~')) {
    const parts = text.split(/~~~[a-z]*\n?([\s\S]*?)\n?~~~/);
    return (
      <div className={className}>
        {parts.map((seg, i) => (i % 2 ? (
          <pre key={i} className="my-2 overflow-x-auto rounded-xl border border-line bg-ink/[0.05] p-3 font-mono text-[13px] leading-relaxed"><code>{seg}</code></pre>
        ) : seg.trim() ? seg.trim().split(/\n\n+/).map((p, k) => <p key={`${i}-${k}`} className="mt-2 first:mt-0">{render(p)}</p>) : null))}
      </div>
    );
  }
  if (!block && paras.length === 1) return <span className={className}>{render(paras[0])}</span>;
  return <div className={className}>{paras.map((p, i) => <p key={i} className={i ? 'mt-3' : undefined}>{render(p)}</p>)}</div>;
});
