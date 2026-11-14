#!/usr/bin/env python3
"""
Turns a College Board question-bank PDF export that YOU have into a private question pack.

    python3 scripts/make-pack.py path/to/export.pdf private/pack.json [private/overrides.json]

The pack is read by `node scripts/build.mjs --pack private/pack.json`, which writes a personal
build (dist/stellify-personal.html). Official questions are copyrighted by the College Board:
the pack and the personal build are for your own study and are deliberately kept out of git.
Needs `pdftotext` (poppler-utils). Tables and graphs cannot be recovered from text, so they are
supplied per question id in the optional overrides file.
"""
import html, json, re, subprocess, sys

SKILLS = [('Central Ideas', 'cid'), ('Command of', 'coet'), ('Inferences', 'inf'), ('Boundaries', 'bnd'), ('Form, Structure', 'fss'),
          ('Text Structure', 'tsp'), ('Words in Context', 'wic'), ('Cross', 'ctc'), ('Transitions', 'tra'), ('Rhetorical', 'syn')]
STEM = re.compile(r'^(Which|What|Based on|As used|In the text|According to|How |Why )')

def paragraphs(lines):
    out, cur = [], []
    for ln in lines:
        if ln.strip(): cur.append(ln.strip())
        elif cur: out.append(' '.join(cur)); cur = []
    if cur: out.append(' '.join(cur))
    return out

def tidy(s):
    s = re.sub(r'\s+', ' ', s).strip().replace('ﬂ', 'fl').replace('ﬁ', 'fi')
    s = s.replace('(H2O)', '(H₂O)').replace('(H2)', '(H₂)').replace('km2', 'km²')
    return re.sub(r'_{3,}', '______', s)

def italics(pdf):
    """Italic phrases per question id, recovered from the PDF's font runs (titles, species names, foreign words)."""
    xml = subprocess.run(['pdftohtml', '-xml', '-i', '-stdout', '-q', pdf], capture_output=True, text=True).stdout
    out, qid = {}, None
    for body in re.findall(r'<text[^>]*>(.*?)</text>', xml):
        plain = html.unescape(re.sub(r'<[^>]+>', '', body))
        m = re.search(r'Question ID (\w+)', plain)
        if m: qid = m.group(1)
        for it in re.findall(r'<i>(.*?)</i>', body):
            it = html.unescape(re.sub(r'<[^>]+>', '', it)).replace('ﬂ', 'fl').replace('ﬁ', 'fi').strip(' .,;:')
            if qid and len(it) >= 4: out.setdefault(qid, set()).add(it)
    return out

def italicize(text, phrases):
    for ph in sorted(phrases, key=len, reverse=True):
        parts = re.split(r'(\*[^*\n]+\*)', text)  # leave spans that are already italic alone
        pat = re.compile(r'(?<![\w*])' + re.escape(ph) + r'(?![\w*])')
        text = ''.join(seg if seg.startswith('*') else pat.sub(lambda m: '*' + m.group(0) + '*', seg) for seg in parts)
    return text

def parse(text, overrides, ital=None):
    items = []
    for block in re.split(r'\f?Question ID ', text)[1:]:
        qid = block.split()[0]
        ov = overrides.get(qid, {})
        head, rest = block.split(f'ID: {qid}', 1)
        body, tail = rest.split(f'ID: {qid} Answer', 1)
        skill = next((k for name, k in SKILLS if name in head), None)
        if not skill: raise SystemExit(f'{qid}: unknown skill in header')
        lines = body.split('\n')
        first = next(i for i, ln in enumerate(lines) if re.match(r'^\s*A\.\s', ln))
        choices, cur = [], None
        for ln in lines[first:]:
            m = re.match(r'^\s*([A-D])\.\s+(.*)', ln)
            if m: cur = [m.group(2)]; choices.append(cur)
            elif ln.strip() and cur is not None: cur.append(ln.strip())
        choices = [tidy(' '.join(c)) for c in choices]
        paras = paragraphs(lines[:first])
        stem = tidy(paras[-1])
        if not STEM.match(stem): print(f'  check stem of {qid}: {stem[:70]}', file=sys.stderr)
        passage = '\n'.join(tidy(p) for p in paras[:-1])
        answer = 'ABCD'.index(re.search(r'Correct Answer:\s*([A-D])', tail).group(1))
        rat = tail.split('Rationale', 1)[1]
        diff = re.search(r'Question Difficulty:\s*(\w+)', rat).group(1)
        rat = tidy(' '.join(paragraphs(rat.split('Question Difficulty')[0].split('\n'))))
        # one rationale per choice: split at each "Choice X is ..."
        parts = re.split(r'(?=Choice [A-D] is (?:the best answer|incorrect|correct))', rat)
        why = [''] * 4
        for p in parts:
            m = re.match(r'Choice ([A-D]) is', p)
            if m: why['ABCD'.index(m.group(1))] = p.strip()
        if len(choices) != 4 or not all(why): raise SystemExit(f'{qid}: could not split choices or rationale')
        item = {'id': f'cb-{qid}', 'skill': skill, 'd': {'Easy': 'M', 'Medium': 'M', 'Hard': 'H'}[diff], 'cbDifficulty': diff,
                'passage': passage, 'stem': stem, 'choices': choices, 'answer': answer, 'why': why}
        if 'passageFrom' in ov: item['passage'] = passage[passage.index(ov['passageFrom']):]
        for mark in ov.get('breaksBefore', []): item['passage'] = item['passage'].replace(' ' + mark, '\n' + mark, 1)
        if 'underline' in ov: item['passage'] = item['passage'].replace(ov['underline'], '__' + ov['underline'] + '__', 1)
        ph = (ital or {}).get(qid, set())
        if ph:
            item['passage'] = italicize(item['passage'], ph); item['stem'] = italicize(item['stem'], ph)
            item['choices'] = [italicize(c, ph) for c in item['choices']]; item['why'] = [italicize(w, ph) for w in item['why']]
        for a, b in ov.get('replace', []):
            for k in ('passage', 'stem'): item[k] = item[k].replace(a, b)
            item['choices'] = [c.replace(a, b) for c in item['choices']]
        item.update({k: v for k, v in ov.items() if k in ('figure', 'passage', 'skill', 'note', 'sub')})
        if item.get('figure') and item['skill'] == 'coet': item['skill'] = 'coeq'
        items.append(item)
    return items

if __name__ == '__main__':
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    text = subprocess.run(['pdftotext', '-layout', sys.argv[1], '-'], capture_output=True, text=True, check=True).stdout
    overrides = json.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else {}
    items = parse(text, overrides, italics(sys.argv[1]))
    json.dump(items, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'{len(items)} questions written to {sys.argv[2]}')
