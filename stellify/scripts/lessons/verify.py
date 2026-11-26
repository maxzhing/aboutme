"""
Correctness gate for animated lessons (the brief's Section 7). A failure stops the build.

For each content/lessons/<skill>/<lesson>/problem.json (and its scene.json):
  * DERIVED KEY: the equations are parsed from the problem's own stem (its $...$ math), and the answer is computed
    from them (math.derive): for "system-no-solution", the one choice that leaves the system with no solution; for
    "circle-tangent-x", the one value of the constant that makes the circle touch the x-axis. The keyed choice /
    grid-in answer and math.key must both equal it. The trap value must give the stated wrong outcome.
  * STEPS: every worked step (problem.json and every equation shown on screen in a morph scene, read from its LaTeX)
    has exactly the same solutions as the step before (or, in two variables, is a nonzero multiple of it), and the
    last shown step reaches the key.
  * STATED FACTS: every check is evaluated with KEY bound to the derived key, so a fact that does not depend on the
    answer cannot hide a wrong key.
  * ON SCREEN = PROBLEM: the hook scene and the try-it-first scene show every math expression of the stem; the
    choices scene shows the problem's choices and key and crosses out the trap; graph lines lie on the stem's
    equations at the key; a drawn circle has the stem's center and radius at the key, and every marked point is its
    center or on it.
  * TAGS: the trap's misconception tag (and every R&W distractor's trap code) exists in
    content/lessons/misconceptions.json, which tests/videos.test.ts keeps equal to the app's live lists.
  * R&W: structure only (four choices, one key, every wrong choice explained and tagged). Meaning cannot be checked
    by a machine, so R&W keys need a teacher (NEEDS-OWNER).
NOT machine-checked: numbers spoken in the narration (the script lint and the Critic read them), and the wording of
explanations.

  python verify.py <lessons-root>
"""
import json, os, re, sys
import sympy as sp

def tex_to_value(s):
    """A choice like "$-4$" or "$\\frac{3}{2}$" to a sympy number."""
    t = s.strip().strip('$').replace('\\left', '').replace('\\right', '').replace('−', '-')
    t = re.sub(r'\\frac\{([^}]*)\}\{([^}]*)\}', r'((\1)/(\2))', t)
    t = re.sub(r'\\sqrt\{([^}]*)\}', r'sqrt(\1)', t).replace('\\pi', 'pi').replace('{', '(').replace('}', ')').replace('^', '**')
    return sp.nsimplify(sp.sympify(t))

class Lesson:
    def __init__(self, path):
        self.path = path
        self.p = json.load(open(path))
        self.errors = []

    def err(self, msg):
        self.errors.append(f"{self.p.get('id', self.path)}: {msg}")

    def ns(self):
        m = self.p.get('math', {})
        syms = {name: sp.Symbol(name, real=True) for name in m.get('symbols', [])}
        ns = {k: getattr(sp, k) for k in dir(sp) if not k.startswith('_')}
        ns.update(syms)
        return ns, syms

    def parse(self, src, ns):
        return sp.sympify(src.replace('^', '**'), locals=ns)

    def step_value(self, st, ns, syms):
        if 'set' in st:
            return ('set', sp.FiniteSet(*[self.parse(str(v), ns) for v in st['set']]))
        lhs, rhs = st['eq'].split('=')
        return ('eq', sp.expand(self.parse(lhs, ns) - self.parse(rhs, ns)))

    def solutions(self, kind, val, over):
        if kind == 'set':
            return val
        return sp.solveset(val, over, domain=sp.S.Reals)

    def tags(self):
        return json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'content', 'lessons', 'misconceptions.json')))

    def stem_math(self):
        return [m.strip() for m in re.findall(r'\$([^$]+)\$', self.p['stem'])]

    def stem_equations(self, ns):
        """Equations written in the stem, read from their LaTeX."""
        from sympy.parsing.latex import parse_latex
        out = []
        for m in self.stem_math():
            if '=' in m:
                e = parse_latex(m)
                out.append(sp.expand(e.lhs - e.rhs).subs({sp.Symbol(n): ns[n] for n in self.p['math']['symbols']}))
        return out

    def derive(self, ns):
        """The answer computed from the stem's own equations."""
        m, p = self.p['math'], self.p
        d = m.get('derive')
        if not d: self.err('math.derive is missing: the key must be computed from the stem'); return None
        eqs = self.stem_equations(ns)
        k = ns[d['param']]
        x, y = ns.get('x'), ns.get('y')
        if d['type'] == 'system-no-solution':
            if len(eqs) != 2: self.err(f'expected two equations in the stem, found {len(eqs)}'); return None
            vals = [tex_to_value(c) for c in p['choices']]
            none = [v for v in vals if sp.linsolve([e.subs(k, v) for e in eqs], [x, y]) == sp.EmptySet]
            if len(none) != 1: self.err(f'{len(none)} choices give no solution; exactly one must'); return None
            self.derived_outcome = {v: ('none' if sp.linsolve([e.subs(k, v) for e in eqs], [x, y]) == sp.EmptySet else ('many' if len(sp.linsolve([e.subs(k, v) for e in eqs], [x, y]).free_symbols) else 'one')) for v in vals}
            return none[0]
        if d['type'] == 'circle-tangent-x':
            if len(eqs) != 1: self.err('expected one circle equation in the stem'); return None
            e = eqs[0]
            q = sp.Poly(e.subs(y, 0), x)
            sols = [c for c in sp.solve(sp.discriminant(q.as_expr(), x), k) if (sp.Poly(e, x, y).coeff_monomial(1).subs(k, c) - (sp.Poly(e, x, y).coeff_monomial(x) ** 2 + sp.Poly(e, x, y).coeff_monomial(y) ** 2) / 4) < 0]
            if len(sols) != 1: self.err(f'{len(sols)} values make the circle tangent to the x-axis; exactly one must'); return None
            return sols[0]
        self.err(f"unknown derive type {d['type']}"); return None

    def check_math(self):
        p, m = self.p, self.p['math']
        ns, syms = self.ns()
        key = self.parse(m['key'], ns)
        derived = self.derive(ns)
        if derived is not None and sp.simplify(derived - key) != 0: self.err(f'math.key {key} is not what the stem gives ({derived})')
        if derived is not None: key = derived
        ns['KEY'] = key
        self.key = key
        tags = self.tags()
        if p.get('trap', {}).get('misconception') and p['trap']['misconception'] not in tags['math']: self.err(f"misconception tag {p['trap']['misconception']} does not exist in the app")
        # the key against what the student sees
        if p['format'] == 'mcq':
            shown = tex_to_value(p['choices'][p['answer']])
            if sp.simplify(shown - key) != 0: self.err(f"answer choice {shown} does not equal the computed key {key}")
        else:
            if not any(sp.simplify(tex_to_value(a) - key) == 0 for a in p['answer']): self.err(f"grid-in answers {p['answer']} do not include the key {key}")
        # the steps
        steps = m.get('steps', [])
        for i in range(1, len(steps)):
            a, b = steps[i - 1], steps[i]
            over = [syms[v] for v in (b.get('over') or a.get('over') or m['symbols'][:1])]
            ka, va = self.step_value(a, ns, syms)
            kb, vb = self.step_value(b, ns, syms)
            if len(over) == 1:
                sa, sb = self.solutions(ka, va, over[0]), self.solutions(kb, vb, over[0])
                if sa != sb: self.err(f"step {i + 1} ({b.get('eq', b.get('set'))}) has solutions {sb}, but step {i} had {sa}")
            else:
                if ka != 'eq' or kb != 'eq': self.err(f"step {i + 1}: sets need a single variable"); continue
                ratio = sp.simplify(va / vb) if vb != 0 else None
                if ratio is None or ratio.free_symbols or ratio == 0: self.err(f"step {i + 1} is not equivalent to step {i}: {va} vs {vb}")
        # the last step must land on the key (for steps solved in the answer's variable)
        if steps and m.get('stepsReachKey', True):
            k, v = self.step_value(steps[-1], ns, syms)
            over = syms[(steps[-1].get('over') or m['symbols'][:1])[0]]
            sol = self.solutions(k, v, over)
            if key not in sol: self.err(f"the last step's solutions {sol} do not contain the key {key}")
        # facts the lesson states (checked, not trusted)
        for c in m.get('checks', []):
            try: ok = bool(eval(c['expr'], {'__builtins__': {}, 'len': len, 'set': set, 'abs': abs}, ns))
            except Exception as e: ok = False; self.err(f"check \"{c['desc']}\" could not run: {e}")
            if not ok: self.err(f"check failed: {c['desc']}  [{c['expr']}]")
        # the trap: what it produces, and that it is a real distractor
        t = p.get('trap')
        if not t: self.err('no trap'); return
        tv = self.parse(m['trap']['value'], ns)
        if sp.simplify(tv - key) == 0: self.err('the trap value equals the key')
        if p['format'] == 'mcq':
            if t['answer'] == p['answer']: self.err('the trap choice is the key')
            if sp.simplify(tex_to_value(p['choices'][t['answer']]) - tv) != 0: self.err(f"trap choice {p['choices'][t['answer']]} is not the trap value {tv}")
        else:
            if not any(sp.simplify(tex_to_value(w) - tv) == 0 for w in p.get('commonWrong', {}).keys()): self.err(f"trap value {tv} is not a listed common wrong answer")
        if getattr(self, 'derived_outcome', None) is not None and m.get('derive', {}).get('trapOutcome'):
            got = self.derived_outcome.get(tv)
            if got != m['derive']['trapOutcome']: self.err(f"the trap value gives '{got}' solutions, not '{m['derive']['trapOutcome']}'")
        for c in m['trap'].get('checks', []):
            ok = bool(eval(c['expr'], {'__builtins__': {}, 'len': len, 'set': set, 'abs': abs}, ns))
            if not ok: self.err(f"trap check failed: {c['desc']}  [{c['expr']}]")
        if not t.get('misconception'): self.err('the trap has no misconception tag')
        # every wrong choice has a reason
        if p['format'] == 'mcq':
            for i, _ in enumerate(p['choices']):
                if i != p['answer'] and str(i) not in p.get('distractors', {}): self.err(f'choice {"ABCD"[i]} has no explanation')

    def check_rw(self):
        p = self.p
        if len(p.get('choices', [])) != 4: self.err('needs four choices')
        if p.get('answer') not in range(4): self.err('answer must be a choice index')
        for i in range(4):
            if i == p.get('answer'): continue
            d = p.get('distractors', {}).get(str(i))
            if not d or not d.get('why') or not d.get('trap'): self.err(f'choice {"ABCD"[i]} needs a reason and a trap tag')
        if not p.get('trap', {}).get('misconception'): self.err('the main trap has no tag')
        codes = self.tags()['rw']
        for i, d in p.get('distractors', {}).items():
            if d.get('trap') and d['trap'] not in codes: self.err(f"choice {'ABCD'[int(i)]}: trap code {d['trap']} does not exist in the app")
        if p.get('trap', {}).get('misconception') not in codes: self.err(f"trap code {p.get('trap', {}).get('misconception')} does not exist in the app")

    def check_scene(self, scene_path):
        """What is on screen comes from the checked math: the shown equation steps, the graph lines, the key."""
        from sympy.parsing.latex import parse_latex
        sc = json.load(open(scene_path))
        p = self.p
        ns, syms = self.ns() if p['format'] != 'rw' else ({}, {})
        for si, s in enumerate(sc['scenes']):
            where = f"scene {si + 1} ({s['k']})"
            if s['k'] == 'morph':
                over = [sp.Symbol(v, real=True) for v in s.get('verify', {}).get('over', [])]
                if not over: self.err(f"{where}: morph steps need verify.over"); continue
                vals = []
                for st in s['steps']:
                    tex = ' '.join(t[1] for t in st['tokens'])
                    try:
                        if '\\text{ or }' in tex:
                            parts = [parse_latex(x.strip()) for x in tex.split('\\text{ or }')]
                            vals.append(('set', sp.FiniteSet(*[sp.solve((pp.lhs - pp.rhs).subs({sp.Symbol(v.name): v for v in over}), over[0])[0] for pp in parts])))
                        else:
                            e = parse_latex(tex)
                            vals.append(('eq', sp.expand(e.lhs - e.rhs).subs({sp.Symbol(v.name): v for v in over})))
                    except Exception as ex:
                        self.err(f"{where}: could not read the shown step {tex!r}: {ex}"); vals.append(None)
                for i in range(1, len(vals)):
                    a_, b_ = vals[i - 1], vals[i]
                    if not a_ or not b_: continue
                    if len(over) == 1:
                        sa = a_[1] if a_[0] == 'set' else sp.solveset(a_[1], over[0], sp.S.Reals)
                        sb = b_[1] if b_[0] == 'set' else sp.solveset(b_[1], over[0], sp.S.Reals)
                        if sa != sb: self.err(f"{where}: shown step {i + 1} has solutions {sb}, step {i} had {sa}")
                    else:
                        # equations in two variables: equivalent when one is a nonzero constant times the other
                        r = sp.simplify(a_[1] / b_[1]) if b_[1] != 0 else None
                        if r is None or r == 0 or r.free_symbols: self.err(f"{where}: shown step {i + 1} is not equivalent to step {i}")
                if p['format'] != 'rw' and vals and vals[-1] and len(over) == 1:
                    key = self.parse(p['math']['key'], ns)
                    last = vals[-1][1] if vals[-1][0] == 'set' else sp.solveset(vals[-1][1], over[0], sp.S.Reals)
                    if s is [x for x in sc['scenes'] if x['k'] == 'morph'][-1] and key not in last: self.err(f"{where}: the last shown step {last} does not reach the key {key}")
            if s['k'] == 'plot':
                for it in s['items']:
                    if it.get('t') == 'expr':
                        x, y = sp.Symbol('x', real=True), sp.Symbol('y', real=True)
                        if 'check' not in it: self.err(f"{where}: graph line {it['e']} has no equation to check against"); continue
                        line = sp.sympify(it['e'], locals={'x': x})
                        eq = sp.sympify(it['check'], locals={'x': x, 'y': y})
                        if sp.simplify(eq.subs(y, line)) != 0: self.err(f"{where}: graph line y = {it['e']} is not on {it['check']} = 0")
            if s['k'] == 'choices':
                if p['format'] in ('mcq', 'rw'):
                    if s['answer'] != p['answer']: self.err(f"{where}: the scene's answer {s['answer']} differs from the problem's {p['answer']}")
                    if [c.strip() for c in s['choices']] != [c.strip() for c in p['choices']]: self.err(f"{where}: the scene's choices differ from the problem's")
                    if p.get('trap', {}).get('answer') is not None and p['trap']['answer'] not in s['cross']: self.err(f"{where}: the trap choice is never crossed out")
        if not any(s['k'] == 'pause' for s in sc['scenes']): self.err('no "try it first" pause')
        norm = lambda t: re.sub(r'\s+', '', t)
        if p['format'] != 'rw':
            hook = sc['scenes'][0]
            pause = next((s for s in sc['scenes'] if s['k'] == 'pause'), {})
            for mth in self.stem_math():
                if norm(mth) not in norm(hook.get('text', '')): self.err(f"the hook scene does not show ${mth}$ from the stem")
                if norm(mth) not in norm(pause.get('stem', '') + pause.get('passage', '')): self.err(f"the try-it-first scene does not show ${mth}$ from the stem")
            if p['format'] == 'mcq' and [c.strip() for c in pause.get('choices', [])] != [c.strip() for c in p['choices']]: self.err('the try-it-first scene does not show the choices')
            eqs = [e.subs(ns[p['math']['derive']['param']], self.key) for e in self.stem_equations(ns)] if p['math'].get('derive') else []
            x, y = sp.Symbol('x', real=True), sp.Symbol('y', real=True)
            for s in sc['scenes']:
                if s['k'] != 'plot': continue
                for it in s['items']:
                    if it.get('t') == 'expr' and eqs and 'check' in it:
                        line = sp.sympify(it['e'], locals={'x': x}) if True else None
                        if not any(sp.simplify(e.subs({ns['x']: x, ns['y']: y}).subs(y, line)) == 0 for e in eqs): self.err(f"graph line y = {it['e']} is not one of the stem's equations at the key")
                    if it.get('t') == 'circle' and eqs:
                        e = sp.Poly(eqs[0], ns['x'], ns['y'])
                        D, E, F0 = e.coeff_monomial(ns['x']), e.coeff_monomial(ns['y']), e.coeff_monomial(1)
                        cx, cy, r = -D / 2, -E / 2, sp.sqrt(D ** 2 / 4 + E ** 2 / 4 - F0)
                        if (sp.nsimplify(it['c'][0]), sp.nsimplify(it['c'][1]), sp.nsimplify(it['r'])) != (cx, cy, r): self.err(f"the drawn circle (center {it['c']}, r {it['r']}) is not the stem's circle at the key (center ({cx}, {cy}), r {r})")
                        for q in s['items']:
                            if q.get('t') == 'pt':
                                on = sp.simplify((q['x'] - cx) ** 2 + (q['y'] - cy) ** 2 - r ** 2) == 0
                                if not on and (sp.nsimplify(q['x']), sp.nsimplify(q['y'])) != (cx, cy): self.err(f"marked point ({q['x']}, {q['y']}) is neither the center nor on the circle")
        else:
            pause = next((s for s in sc['scenes'] if s['k'] == 'pause'), {})
            if norm(pause.get('passage', '')) != norm(p['passage']): self.err('the try-it-first scene does not show the passage')
            ch = next((s for s in sc['scenes'] if s['k'] == 'choices'), {})
            if norm(ch.get('passage', '')) != norm(p['passage']): self.err('the choices scene does not show the passage')

    def run(self):
        for f in ('id', 'skill', 'format', 'stem'):
            if f not in self.p: self.err(f'missing {f}')
        if self.errors: return self.errors
        try:
            self.check_rw() if self.p['format'] == 'rw' else self.check_math()
        except Exception as e:
            self.err(f'verifier error: {type(e).__name__}: {e}')
        return self.errors

def main():
    root = sys.argv[1]
    files = sorted(os.path.join(d, 'problem.json') for d, _, fs in os.walk(root) if 'problem.json' in fs)
    errors = []
    for f in files:
        L = Lesson(f)
        errs = L.run()
        scene = os.path.join(os.path.dirname(f), 'scene.json')
        if not errs and os.path.exists(scene):
            try: L.check_scene(scene)
            except Exception as e: L.err(f'scene check error: {type(e).__name__}: {e}')
            errs = L.errors
        errors += errs
    for e in errors: print('FAIL', e)
    print(f'{len(files)} lessons checked, {len(errors)} problems')
    sys.exit(1 if errors else 0)

if __name__ == '__main__':
    main()
