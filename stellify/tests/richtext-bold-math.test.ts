import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichText } from '@/components/RichText';

describe('RichText bold labels', () => {
  it('renders a bold label that contains math as bold, with no stray asterisks', () => {
    const html = renderToStaticMarkup(createElement(RichText, { text: String.raw`**At $x = 2$.** The value is 5.` }));
    expect(html).not.toContain('**');
    expect(html).toMatch(/<strong[^>]*>At <span/);
    expect(html).toContain('katex');
  });
  it('leaves plain bold and math-free text unchanged', () => {
    const html = renderToStaticMarkup(createElement(RichText, { text: '**Step 1.** Factor, then *cancel*.' }));
    expect(html).toMatch(/<strong[^>]*>Step 1\.<\/strong>/);
    expect(html).toContain('<em>cancel</em>');
  });
});
