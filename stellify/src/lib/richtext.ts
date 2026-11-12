/** Tiny, dependency-free tokenizer for question/lesson text (math, emphasis, blanks). */
export type Token =
  | { t: 'text' | 'math' | 'dmath' | 'bold' | 'under' | 'ital'; v: string }
  | { t: 'blank' | 'br' };

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let buf = '';
  const flushText = () => {
    if (!buf) return;
    const parts = buf.split(/(_{5,}|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|\n)/g);
    for (const p of parts) {
      if (!p) continue;
      if (/^_{5,}$/.test(p)) out.push({ t: 'blank' });
      else if (p === '\n') out.push({ t: 'br' });
      else if (p.startsWith('**') && p.endsWith('**') && p.length > 4) out.push({ t: 'bold', v: p.slice(2, -2) });
      else if (p.startsWith('__') && p.endsWith('__') && p.length > 4) out.push({ t: 'under', v: p.slice(2, -2) });
      else if (p.startsWith('*') && p.endsWith('*') && p.length > 2) out.push({ t: 'ital', v: p.slice(1, -1) });
      else out.push({ t: 'text', v: p });
    }
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && src[i + 1] === '$') { buf += '$'; i += 2; continue; }
    if (c === '$') {
      const display = src[i + 1] === '$';
      const open = display ? 2 : 1;
      let j = i + open;
      while (j < src.length) {
        if (src[j] === '\\' && src[j + 1] === '$') { j += 2; continue; }
        if (src[j] === '$' && (!display || src[j + 1] === '$')) break;
        j++;
      }
      if (j >= src.length) { buf += src.slice(i); break; }
      flushText();
      out.push({ t: display ? 'dmath' : 'math', v: src.slice(i + open, j) });
      i = j + open;
      continue;
    }
    buf += c;
    i++;
  }
  flushText();
  return out;
}

/** Plain-text rendering for search indexes, AI prompts and aria labels. */
export const plain = (src: string) =>
  tokenize(src).map((t) => ('v' in t ? t.v : t.t === 'blank' ? '______' : ' ')).join('');
