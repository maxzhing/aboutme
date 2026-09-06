// The briefing: everything that tells the player what is going on and what to
// do about it. One current objective, the news that explains itself, and the
// banner that closes the loop when a problem is actually solved.
//
// It renders only what the Director measured — no copy is invented here.
import { el, fmtMoney } from './format.js';
import { STAGES, UNLOCKS } from '../sim/director.js';

export class Briefing {
  constructor(app, ui) {
    this.app = app;
    this.ui = ui;
    this.lastNewsId = 0;
    this.openNews = null;
    this.objSig = '';
    this.bannerSig = '';
    this.build();
  }

  get director() { return this.app.director; }

  build() {
    // ---- current objective, at the top of the right column
    const p = el('div', 'pnl obj');
    p.innerHTML = `
      <div class="pnl-h"><span class="t">Current Objective</span><span class="stagechip"></span></div>
      <div class="pnl-b obj-b"></div>`;
    this.objEl = p;
    this.objBody = p.querySelector('.obj-b');
    this.stageChip = p.querySelector('.stagechip');

    // ---- the banner that closes the loop
    const b = el('div'); b.id = 'banner';
    b.innerHTML = `<div class="bn"></div>`;
    document.body.appendChild(b);
    this.bannerEl = b;
    this.bannerBox = b.querySelector('.bn');
    b.onclick = (e) => { if (e.target === b) this.dismiss(); };
  }

  reset() {
    this.lastNewsId = 0;
    this.openNews = null;
    this.objSig = '';
    this.bannerSig = '';
    this.bannerEl.classList.remove('show');
  }

  dismiss() {
    this.bannerEl.classList.remove('show');
    if (this.director) this.director.clearBanner();
  }

  update() {
    const d = this.director;
    if (!d) return;
    this.renderObjective(d);
    this.renderNews(d);
    this.renderBanner(d);
  }

  // ---------------------------------------------------------------- objective
  renderObjective(d) {
    const o = d.objective;
    if (!o) {
      if (this.objSig !== 'none') {
        this.objSig = 'none';
        this.objBody.innerHTML = `<div class="obj-none">Nothing is wrong with the city right now. Build something, or push it harder.</div>`;
      }
      this.stageChip.textContent = d.stage.name;
      return;
    }
    const pct = d.progress(o);
    const now = o.metric();
    // re-render the structure only when the objective or the lock state changes;
    // the numbers underneath are cheap to poke directly
    const sig = o.id + '|' + d.stage.id + '|' + d.optional.map(x => x.id).join(',');
    if (sig !== this.objSig) {
      this.objSig = sig;
      this.objBody.innerHTML = '';
      const head = el('div', 'obj-head');
      head.innerHTML = `<div class="obj-t">${o.title}</div>
        <div class="obj-bar"><i></i></div>
        <div class="obj-m"><span class="cur"></span><span class="tgt">target ${o.format(o.target)}</span></div>`;
      this.objBody.appendChild(head);
      this.objCur = head.querySelector('.cur');
      this.objFill = head.querySelector('.obj-bar i');

      const why = el('div', 'obj-sec');
      why.innerHTML = `<div class="obj-k">Why this is happening</div><div class="obj-v">${o.why}</div>`;
      this.objBody.appendChild(why);
      const who = el('div', 'obj-sec');
      who.innerHTML = `<div class="obj-k">Who it affects</div><div class="obj-v">${o.who}</div>`;
      this.objBody.appendChild(who);
      if (o.subject) {
        const sub = el('div', 'obj-sec');
        sub.innerHTML = `<div class="obj-who">One of them: <b>${o.subject.name}</b>, ${o.subject.age} · ${o.subject.occupation}` +
          ` — ${o.subject.label.toLowerCase()} <b>${this.app.director.subjectFormat(o, o.subject.before)}</b>` +
          `<span class="obj-cta">Follow them through their day →</span></div>`;
        sub.querySelector('.obj-who').onclick = () => {
          const c = this.app.sim.citizens.list.find(x => x.id === o.subject.id);
          if (c) { this.app.selectCitizen(c); this.app.setFollow(c); }
          else this.ui.toast('They have moved out of the city');
        };
        this.objBody.appendChild(sub);
      }

      if (o.focus && o.focus() !== null && o.focus() !== undefined) {
        const s = el('button', 'btn sm obj-show', '◎ Show me where');
        s.onclick = () => {
          const c = o.focus();
          if (c === null || c === undefined) this.ui.toast('This one is city-wide — there is no single place to look');
          else this.app.focusCell(c);
        };
        const wrap = el('div', 'obj-sec'); wrap.appendChild(s);
        this.objBody.appendChild(wrap);
      }

      const opts = el('div', 'obj-sec');
      opts.innerHTML = `<div class="obj-k">What you can do</div>`;
      for (const opt of o.options) {
        const locked = opt.needs && !d.isUnlocked(opt.needs);
        const row = el('button', 'obj-opt' + (locked ? ' locked' : ''));
        row.innerHTML = `<div class="obj-ol">${opt.label}${locked ? ' <span class="lk">locked</span>' : ''}</div>
          <div class="obj-oh">${locked ? this.lockText(opt.needs) : (opt.hint || '')}</div>`;
        if (!locked) row.onclick = () => this.app.applyAction(opt.act);
        else row.onclick = () => this.ui.toast(this.lockText(opt.needs));
        opts.appendChild(row);
      }
      this.objBody.appendChild(opts);

      if (d.optional.length) {
        const also = el('div', 'obj-sec');
        also.innerHTML = `<div class="obj-k">Also wrong</div>` +
          d.optional.map(x => `<div class="obj-also">${x.title}</div>`).join('');
        this.objBody.appendChild(also);
      }
      this.buildMilestones();
    }
    this.stageChip.textContent = d.stage.name;
    if (this.objCur) this.objCur.textContent = o.format(now);
    if (this.objFill) this.objFill.style.width = (pct * 100).toFixed(1) + '%';
    this.updateMilestones();
  }

  // The long-term goals live with the current one, so every goal the player has
  // is in a single place rather than a panel of its own.
  buildMilestones() {
    const ms = this.app.sim.missions;
    if (!ms || !ms.length) { this.msEls = null; return; }
    const sec = el('div', 'obj-sec');
    sec.innerHTML = `<div class="obj-k">Long term</div>`;
    this.msEls = [];
    for (const m of ms) {
      const row = el('div', 'obj-ms');
      row.innerHTML = `<div class="obj-msl"><span class="bx"></span>${m.label}</div><div class="obj-msb"><i></i></div>`;
      sec.appendChild(row);
      this.msEls.push({ m, row, fill: row.querySelector('i'), box: row.querySelector('.bx') });
    }
    this.objBody.appendChild(sec);
  }

  updateMilestones() {
    if (!this.msEls) return;
    const sim = this.app.sim;
    for (const e of this.msEls) {
      const p = e.m.done ? 1 : e.m.progress(sim);
      e.fill.style.width = (p * 100).toFixed(0) + '%';
      e.row.classList.toggle('done', !!e.m.done);
      e.box.textContent = e.m.done ? '✓' : '';
    }
  }

  lockText(key) {
    const stage = STAGES.find(s => (UNLOCKS[s.id] || []).includes(key));
    return stage ? `Unlocks at ${stage.name} — ${stage.pop.toLocaleString()} residents` : 'Not available yet';
  }

  // ---------------------------------------------------------------- news
  renderNews(d) {
    const body = this.ui.eventsBody;
    const list = d.news.slice(0, 30);
    if (!list.length) return;
    if (list[0].id === this.lastNewsId && !this._newsDirty) {
      for (const n of body.querySelectorAll('.ev')) {
        const a = n.querySelector('.a');
        const item = d.news.find(x => x.id === +n.dataset.id);
        if (a && item) a.textContent = this.ago(item);
      }
      return;
    }
    this.lastNewsId = list[0].id;
    this._newsDirty = false;
    body.innerHTML = '';
    for (const n of list.slice(0, 10)) {
      const row = el('div', 'ev ' + (n.severity || 'info') + (this.openNews === n.id ? ' open' : ''));
      row.dataset.id = n.id;
      const detail = (n.why || n.who || n.action)
        ? `<div class="ev-d">
             ${n.why ? `<div><b>What happened</b> ${n.why}</div>` : ''}
             ${n.who ? `<div><b>Who it affects</b> ${n.who}</div>` : ''}
             ${n.action ? `<div><b>What you can do</b> ${n.action}</div>` : ''}
             ${(n.focus !== undefined || n.building !== undefined) ? `<button class="btn sm ev-go">◎ Show me</button>` : ''}
           </div>` : '';
      row.innerHTML = `<span class="d"></span><span class="m">${n.title}</span><span class="a">${this.ago(n)}</span>${detail}`;
      row.onclick = (e) => {
        if (e.target.classList.contains('ev-go')) { this.app.focusEvent(n); return; }
        this.openNews = this.openNews === n.id ? null : n.id;
        this._newsDirty = true;
        this.renderNews(d);
      };
      body.appendChild(row);
    }
  }

  ago(n) {
    const mins = this.app.sim.minutes - ((n.day || 0) * 1440 + (n.minute || 0));
    if (!isFinite(mins) || mins < 0) return 'now';
    if (mins < 60) return Math.max(0, Math.round(mins)) + 'm';
    if (mins < 1440) return Math.round(mins / 60) + 'h';
    return Math.round(mins / 1440) + 'd';
  }

  // ---------------------------------------------------------------- banner
  renderBanner(d) {
    const b = d.banner;
    if (!b) { this.bannerEl.classList.remove('show'); this.bannerSig = ''; return; }
    const sig = b.kind + '|' + (b.headline || '');
    if (sig === this.bannerSig) return;
    this.bannerSig = sig;
    if (b.kind === 'intro') {
      const o = b.objective;
      this.bannerBox.classList.add('wide');
      this.bannerBox.innerHTML = `
        <div class="bn-k">${b.title}</div>
        <div class="bn-h">${o.title}</div>
        <div class="bn-sec"><div class="bn-lbl">Why this is happening</div><div class="bn-txt">${o.why}</div></div>
        <div class="bn-sec"><div class="bn-lbl">Who it affects</div><div class="bn-txt">${o.who}</div></div>
        <div class="bn-sec"><div class="bn-lbl">What you can do</div>
          ${o.options.map((op, i) => `<button class="obj-opt" data-op="${i}"><div class="obj-ol">${op.label}</div><div class="obj-oh">${op.hint || ''}</div></button>`).join('')}
        </div>
        <div class="bn-row"><button class="btn bn-see">◎ Show me where</button><button class="btn pri bn-x">Got it</button></div>`;
      for (const el2 of this.bannerBox.querySelectorAll('[data-op]')) {
        el2.onclick = () => { this.dismiss(); this.app.applyAction(o.options[+el2.dataset.op].act); };
      }
      const see = this.bannerBox.querySelector('.bn-see');
      see.onclick = () => {
        this.dismiss();
        const c = o.focus ? o.focus() : null;
        if (c === null || c === undefined) this.ui.toast('This one is city-wide — there is no single place to look');
        else this.app.focusCell(c);
      };
    } else if (b.kind === 'stage') {
      this.bannerBox.classList.remove('wide');
      this.bannerBox.innerHTML = `
        <div class="bn-k">The city has grown</div>
        <div class="bn-h">${b.headline}</div>
        <div class="bn-s">${b.blurb}</div>
        ${b.unlocks && b.unlocks.length ? `<div class="bn-un">Unlocked${b.unlocks.map(u => `<span>${u}</span>`).join('')}</div>` : ''}
        <button class="btn pri bn-x">Continue</button>`;
    } else {
      this.bannerBox.classList.remove('wide');
      const st = b.story;
      this.bannerBox.innerHTML = `
        <div class="bn-k">Objective complete</div>
        <div class="bn-h">${b.headline}</div>
        <div class="bn-s"><b>${b.from}</b> → <b style="color:var(--gr)">${b.to}</b> over ${b.days} day${b.days === 1 ? '' : 's'}</div>
        ${st ? `<div class="bn-story">
            <div class="bn-who">${st.name}, ${st.age} · ${st.occupation}</div>
            <div class="bn-where">lives in ${st.home}${st.work ? ` · works in ${st.work}` : ''}</div>
            <div class="bn-cmp"><span>${st.label}</span><b>${st.before}</b><span class="ar">→</span><b class="${st.better ? 'gd' : 'bd'}">${st.after}</b></div>
          </div>` : ''}
        ${b.reward ? `<div class="bn-rw">A grant of ${fmtMoney(b.reward)} was released</div>` : ''}
        <button class="btn pri bn-x">Continue</button>`;
    }
    this.bannerBox.querySelector('.bn-x').onclick = () => this.dismiss();
    this.bannerEl.classList.add('show');
  }
}
