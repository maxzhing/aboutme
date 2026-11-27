"""Lists paragraphs of a saved source text whose length suits an SAT passage, so an excerpt is copied exactly.
   python3 scripts/sources/paragraphs.py <file.txt> [min words] [max words] [how many]"""
import re, sys

path = sys.argv[1]
lo, hi, n = (int(x) for x in (sys.argv[2:5] + ['80', '150', '6'][len(sys.argv[2:5]):]))
paras = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n|\n(?=\S)', open(path).read())]
shown = 0
for i, p in enumerate(paras):
    w = len(p.split())
    if lo <= w <= hi and re.search(r'[a-z]', p) and not p.startswith('http'):
        print(f'[{i}] ({w} words) {p}\n')
        shown += 1
        if shown >= n:
            break
