import { escapeHtml } from './dom.js';

/**
 * Compact Markdown renderer with LaTeX support.
 *
 * Code and maths are pulled out before any escaping happens, so a `<` inside a
 * code block or a `$...$` expression never gets mangled by the inline pass.
 */

const SLOT = (index) => `@@MD${index}@@`;

function renderMath(source, display) {
  if (window.katex) {
    try {
      return window.katex.renderToString(source, {
        displayMode: display,
        throwOnError: false,
        strict: false,
        trust: false,
        output: 'html',
      });
    } catch {
      /* fall through to plain text */
    }
  }
  const cls = display ? 'math-fallback block' : 'math-fallback';
  return `<span class="${cls}"><code>${escapeHtml(source)}</code></span>`;
}

function inline(text) {
  return text
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\n]+)_(?=[^_\w]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
}

function tableFrom(lines) {
  const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const header = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  return [
    '<table><thead><tr>',
    header.map((c) => `<th>${inline(c)}</th>`).join(''),
    '</tr></thead><tbody>',
    rows
      .map((row) => `<tr>${header.map((_, i) => `<td>${inline(row[i] ?? '')}</td>`).join('')}</tr>`)
      .join(''),
    '</tbody></table>',
  ].join('');
}

// Nested render for blockquote bodies (placeholders are already extracted).
function markdownInner(text) {
  return text
    .split(/\n{2,}/)
    .map((chunk) => `<p>${inline(chunk.replace(/\n/g, ' '))}</p>`)
    .join('');
}

export function markdown(input) {
  if (input == null) return '';
  let text = String(input).replace(/\r\n/g, '\n');

  const slots = [];
  const blockSlots = new Set();
  const stash = (html, isBlock = false) => {
    slots.push(html);
    if (isBlock) blockSlots.add(slots.length - 1);
    return SLOT(slots.length - 1);
  };

  // 1. fenced code
  text = text.replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    stash(
      `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(
        code.replace(/\n$/, ''),
      )}</code></pre>`,
      true,
    ),
  );
  // 2. maths (display first, then inline)
  text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => stash(renderMath(math.trim(), true), true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => stash(renderMath(math.trim(), true), true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => stash(renderMath(math.trim(), false)))
    .replace(/(?<![\\$\w])\$(?!\s)((?:[^$\n\\]|\\.)+?)(?<!\s)\$(?!\d)/g, (_, math) =>
      stash(renderMath(math.trim(), false)),
    );
  // 3. inline code
  text = text.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));

  text = escapeHtml(text);

  const lines = text.split('\n');
  const out = [];
  let i = 0;

  const isTable = (n) =>
    lines[n]?.includes('|') && /^\s*\|?[\s:-]*-[-\s:|]*\|/.test(lines[n + 1] || '');

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(6, heading[1].length + 1);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    if (isTable(i)) {
      const block = [];
      while (i < lines.length && lines[i].includes('|')) block.push(lines[i++]);
      out.push(tableFrom(block));
      continue;
    }

    if (/^\s*&gt;\s?/.test(line)) {
      const block = [];
      while (i < lines.length && /^\s*&gt;\s?/.test(lines[i])) {
        block.push(lines[i++].replace(/^\s*&gt;\s?/, ''));
      }
      out.push(`<blockquote>${markdownInner(block.join('\n'))}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^(\s*)([-*+])\s+(.*)$/);
    const ordered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (bullet || ordered) {
      const tag = ordered ? 'ol' : 'ul';
      const pattern = ordered ? /^(\s*)(\d+)[.)]\s+(.*)$/ : /^(\s*)([-*+])\s+(.*)$/;
      const items = [];
      while (i < lines.length) {
        const match = lines[i].match(pattern);
        if (match) {
          items.push(inline(match[3]));
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          items[items.length - 1] += ` ${inline(lines[i].trim())}`;
          i++;
        } else break;
      }
      out.push(`<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`);
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|\s*[-*+]\s|\s*\d+[.)]\s|\s*&gt;)/.test(lines[i]) &&
      !isTable(i)
    ) {
      paragraph.push(lines[i++]);
    }
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    else i++;
  }

  // A block-level stash (code fence, display maths) must not sit inside a <p>.
  return out
    .join('\n')
    .replace(/<p>(@@MD(\d+)@@)<\/p>/g, (match, token, index) =>
      blockSlots.has(Number(index)) ? token : match,
    )
    .replace(/@@MD(\d+)@@/g, (_, index) => slots[Number(index)] ?? '');
}

/** A <div class="prose"> containing rendered markdown. */
export function prose(text, extraClass = '') {
  const el = document.createElement('div');
  el.className = `prose ${extraClass}`.trim();
  el.innerHTML = markdown(text);
  return el;
}
