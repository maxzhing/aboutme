"""Prints exact sentences from a saved source text, so quotations are copied, never retyped.
   python3 scripts/sources/quote.py <file.txt> "<phrase>" [sentences after, default 1]"""
import re, sys

path, phrase = sys.argv[1], sys.argv[2]
extra = int(sys.argv[3]) if len(sys.argv) > 3 else 1
text = re.sub(r'\s+', ' ', open(path).read())
# split into sentences, keeping the end mark (and a closing quote mark if there is one)
sents = re.findall(r'[^.!?]+[.!?]+[’”"\']?', text)
for i, s in enumerate(sents):
    if phrase.lower() in s.lower():
        print(' '.join(x.strip() for x in sents[i:i + 1 + extra]))
        break
else:
    print('NOT FOUND:', phrase)
