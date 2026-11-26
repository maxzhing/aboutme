"""
The verifier must catch wrong math. Each case below breaks a real pilot lesson in one way; every one must be
reported. Run: python test_verify.py <lessons-root>   (exit code 1 if any broken lesson slips through)
"""
import copy, json, os, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from verify import Lesson

root = sys.argv[1]
base = {k: json.load(open(os.path.join(root, k, f'{k}-w1', 'problem.json'))) for k in ('sys', 'circ', 'inf')}

def broken(skill, change):
    p = copy.deepcopy(base[skill]); change(p); return p

CASES = {
    'wrong answer key (mcq)': broken('sys', lambda p: p.update(answer=2)),
    'computed key changed': broken('sys', lambda p: p['math'].update(key='4')),
    'a step that loses a solution (k^2 = 16 to k = 4 only)': broken('sys', lambda p: p['math']['steps'].__setitem__(3, {'set': ['4'], 'over': ['k']})),
    'an arithmetic slip in a step (2*8 written as 18)': broken('sys', lambda p: p['math']['steps'].__setitem__(1, {'eq': '18 - k^2 = 0', 'over': ['k']})),
    'a false stated fact': broken('sys', lambda p: p['math']['checks'].append({'desc': 'k = 4 gives no solution', 'expr': "len(linsolve([2*x + 4*y - 6, 4*x + 8*y - 12], [x, y])) == 0"})),
    'trap value that is not the trap choice': broken('sys', lambda p: p['math']['trap'].update(value='16')),
    'trap pointing at the key': broken('sys', lambda p: p['trap'].update(answer=0)),
    'trap without a misconception tag': broken('sys', lambda p: p['trap'].pop('misconception')),
    'a wrong choice without an explanation': broken('sys', lambda p: p['distractors'].pop('3')),
    'grid-in answer that is wrong': broken('circ', lambda p: p.update(answer=['25'])),
    'grid-in trap not among the common wrong answers': broken('circ', lambda p: p['commonWrong'].pop('-25')),
    'circle step with the wrong arithmetic': broken('circ', lambda p: p['math']['steps'].__setitem__(2, {'eq': 'c = 34 + 25', 'over': ['c']})),
    'R&W wrong choice without a trap tag': broken('inf', lambda p: p['distractors']['0'].pop('trap')),
    'R&W with three choices': broken('inf', lambda p: p['choices'].pop()),
}

missed = []
for name, p in CASES.items():
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(p, f); path = f.name
    errs = Lesson(path).run()
    os.unlink(path)
    print(('caught ' if errs else 'MISSED ') + name + (f'  ->  {errs[0]}' if errs else ''))
    if not errs: missed.append(name)
# and the real lessons must pass
for k in base:
    errs = Lesson(os.path.join(root, k, f'{k}-w1', 'problem.json')).run()
    if errs: missed.append(f'real lesson {k} fails: {errs}')
print(f'{len(CASES) - len([m for m in missed if not m.startswith("real")])}/{len(CASES)} broken lessons caught')
if missed: sys.exit(1)

# what is shown on screen must also be checked
def scene_case(skill, change):
    sc = json.load(open(os.path.join(root, skill, f'{skill}-w1', 'scene.json'))); change(sc)
    d = tempfile.mkdtemp()
    json.dump(base[skill], open(os.path.join(d, 'problem.json'), 'w')); json.dump(sc, open(os.path.join(d, 'scene.json'), 'w'))
    L = Lesson(os.path.join(d, 'problem.json')); L.run(); L.check_scene(os.path.join(d, 'scene.json'))
    return L.errors
def morph(sc, n=0): return [s for s in sc['scenes'] if s['k'] == 'morph'][n]
SCENE_CASES = {
    'shown step with a wrong number (16 shown as 18)': ('sys', lambda sc: morph(sc)['steps'][1]['tokens'].__setitem__(0, ['a', '18'])),
    'shown circle step that adds to one side only': ('circ', lambda sc: morph(sc)['steps'][1]['tokens'].__setitem__(3, ['r', '-c'])),
    'shown final value that is not the key (c = 59)': ('circ', lambda sc: morph(sc, 1)['steps'][3]['tokens'].__setitem__(2, ['v', '59'])),
    'graph line that is not the system\'s line': ('sys', lambda sc: [s for s in sc['scenes'] if s['k'] == 'plot'][0]['items'][0].update(e='x/2 - 1')),
    'scene shows a different answer than the problem': ('sys', lambda sc: [s for s in sc['scenes'] if s['k'] == 'choices'][0].update(answer=2)),
    'no try-it-first pause': ('inf', lambda sc: sc.update(scenes=[s for s in sc['scenes'] if s['k'] != 'pause'])),
}
scene_missed = []
for name, (skill, change) in SCENE_CASES.items():
    errs = scene_case(skill, change)
    print(('caught ' if errs else 'MISSED ') + name + (f'  ->  {errs[0]}' if errs else ''))
    if not errs: scene_missed.append(name)
print(f'{len(SCENE_CASES) - len(scene_missed)}/{len(SCENE_CASES)} broken scenes caught')
sys.exit(1 if scene_missed else 0)
