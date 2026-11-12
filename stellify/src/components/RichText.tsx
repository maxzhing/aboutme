import katex from 'katex';
import { Fragment, memo } from 'react';
import { tokenize } from '@/lib/richtext';

const tex = (v: string, displayMode: boolean) => {
  try { return katex.renderToString(v, { displayMode, throwOnError: false, output: 'htmlAndMathml' }); }
  catch { return v; }
};

/** Renders question/lesson text: inline and display math (KaTeX), emphasis, underlines, blanks. */
export const RichText = memo(function RichText({ text, className, block }: { text: string; className?: string; block?: boolean }) {
  const paras = text.split(/\n\n+/);
  const render = (src: string) => tokenize(src).map((t, i) => {
    switch (t.t) {
      case 'math': return <span key={i} dangerouslySetInnerHTML={{ __html: tex(t.v, false) }} />;
      case 'dmath': return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: tex(t.v, true) }} />;
      case 'bold': return <strong key={i} className="font-semibold">{t.v}</strong>;
      case 'under': return <span key={i} className="underline decoration-brand2 decoration-2 underline-offset-4">{t.v}</span>;
      case 'ital': return <em key={i}>{t.v}</em>;
      case 'blank': return <span key={i} className="mx-0.5 inline-block w-16 translate-y-0.5 border-b-2 border-ink/70 align-baseline" role="img" aria-label="blank" />;
      case 'br': return <br key={i} />;
      default: return <Fragment key={i}>{t.v}</Fragment>;
    }
  });
  if (!block && paras.length === 1) return <span className={className}>{render(paras[0])}</span>;
  return <div className={className}>{paras.map((p, i) => <p key={i} className={i ? 'mt-3' : undefined}>{render(p)}</p>)}</div>;
});
