const { chromium } = require('playwright-core');
const path = require('path').join(__dirname,'..','index.html');
let fails = 0;
const ok = (n,c,x='') => { console.log((c?'  PASS  ':'  FAIL  ')+n+(c?'':'  <<< '+x)); if(!c) fails++; };
const strip = h => String(h).replace(/<[^>]*>/g,'');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || require('playwright-core').chromium.executablePath(), args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1400,height:1000} });
  p.on('pageerror', e => { console.log('PAGEERR', e.message); fails++; });
  await p.goto('file://'+path); await p.waitForTimeout(600);
  const q = s => p.evaluate(t => { const r = GM.ask(t); return r && { a:r.answer, hits:(r.hits||[]).map(h=>h.label) }; }, s);
  const state = () => p.evaluate(() => GM.state().classes.map(c => ({ n:c.name, pct:GM.computeClass(c).pct })));

  const cls = await state();
  console.log('  (example classes: ' + cls.map(c=>c.n+' '+(c.pct??0).toFixed(2)).join(', ') + ')');

  // class name resolution
  ok('matches a class by a fragment', (await p.evaluate(()=>GM.findClass('bio')?.name))==='AP Biology',
     await p.evaluate(()=>GM.findClass('bio')?.name));
  ok('matches a multi-word class', (await p.evaluate(()=>GM.findClass('algebra')?.name))==='Honors Algebra 2');
  ok('no match on nonsense', (await p.evaluate(()=>GM.findClass('zzzqqq')))===null);

  // GPA
  const gpa = await q('show my gpa');
  ok('gpa answer gives both numbers', /weighted/.test(strip(gpa.a)) && /unweighted/.test(strip(gpa.a)), gpa.a);
  const real = await p.evaluate(()=>GM.schoolGPA());
  ok('gpa answer uses the real figure', strip(gpa.a).includes(real.w.toFixed(3)), gpa.a+' vs '+real.w.toFixed(3));

  // what should I study
  const study = await q('what should i study');
  ok('study question names a class and a reason', /\w/.test(strip(study.a)) && study.hits.length>=1, JSON.stringify(study));
  const top = await p.evaluate(()=>GM.focusList()[0].c.name);
  ok('study answer points at the top-ranked class', strip(study.a).startsWith(top), study.a+' vs '+top);

  // how close am I
  const close = await q('how close am i to an a in government');
  ok('closeness answer uses the real gap', /points from an A/.test(strip(close.a)), close.a);
  const govGap = await p.evaluate(()=>{ const c=GM.state().classes.find(x=>/Government/.test(x.name)); return GM.analyze(c).toNext.toFixed(2); });
  ok('gap figure matches the engine', strip(close.a).includes(govGap), close.a+' vs '+govGap);

  // what do I need
  const need = await q('what do i need for an a in government');
  ok('target question returns a required average or says it is unreachable',
     /average/.test(strip(need.a)) || /Not reachable/.test(strip(need.a)), need.a);

  // unreachable is stated honestly, never hopeful
  const hard = await p.evaluate(() => {
    GM.setState({ classes:[{ id:'z', name:'Ceramics', categories:[{id:'at',name:'AT',weight:100}],
      assignments:[{id:'1',catId:'at',earned:60,possible:100,graded:true,included:true,name:'x'},
                   {id:'2',catId:'at',earned:null,possible:10,graded:false,included:true,name:'y'}] }], active:'z' });
    const r = GM.ask('can i still get an a in ceramics'); return r.answer;
  });
  ok('impossible goals are refused with the ceiling', /Not reachable/.test(strip(hard)) && /tops out/.test(strip(hard)), hard);
  ok('no false hope language', !/you can do it|keep going|don't give up/i.test(strip(hard)), hard);

  // already there
  const done = await p.evaluate(() => {
    GM.setState({ classes:[{ id:'z', name:'Ceramics', categories:[{id:'at',name:'AT',weight:100}],
      assignments:[{id:'1',catId:'at',earned:95,possible:100,graded:true,included:true,name:'x'}] }], active:'z' });
    return GM.ask('what do i need for a b in ceramics').answer; });
  ok('already-met goals say so', /already there/i.test(strip(done)), done);

  // no data
  const empty = await p.evaluate(() => { GM.setState({ classes:[], active:null }); return GM.ask('what should i study').answer; });
  ok('with no data it says so rather than inventing', /nothing/i.test(strip(empty)), empty);
  const emptyGpa = await p.evaluate(() => GM.ask('gpa').answer);
  ok('no GPA invented from nothing', /no GPA|Nothing is graded/i.test(strip(emptyGpa)), emptyGpa);

  // back to the example set for UI checks
  await p.evaluate(()=>GM.loadDemo()); await p.waitForTimeout(500);

  // biggest impact
  const imp = await q('which assignment matters most in government');
  ok('impact answer quotes both directions', /worth \+?-?[\d.]+ points/.test(strip(imp.a)) && /costs you/.test(strip(imp.a)), imp.a);
  const impNone = await q('which assignment matters most in algebra');
  ok('says so plainly when nothing is left ungraded', /already graded/.test(strip(impNone.a)), impNone.a);

  // below a threshold
  const below = await q('classes below 90');
  ok('threshold query lists the classes', /below 90/.test(strip(below.a)), below.a);

  // the live command bar
  await p.fill('#cmd', 'what should i study'); await p.waitForTimeout(400);
  ok('command bar shows an answer', !(await p.$('#cmdRes[hidden]')) && (await p.$$eval('.cmdres .ans', e=>e.length))===1);
  ok('command bar offers actions', (await p.$$eval('.cmdres .hit', e=>e.length))>=1);
  ok('command bar states where answers come from', /own gradebook/.test(await p.textContent('.cmdres .foot')));
  await p.click('.cmdres .hit'); await p.waitForTimeout(600);
  ok('clicking an action navigates', !(await p.$('#view-class[hidden]')));
  ok('results close after acting', (await p.$('#cmdRes[hidden]'))!==null);
  await p.keyboard.press('/'); await p.waitForTimeout(250);
  ok('slash focuses the bar', (await p.evaluate(()=>document.activeElement.id))==='cmd');

  await b.close();
  console.log('\n'+(fails?('*** '+fails+' FAILURE(S) ***'):'ASSISTANT CHECKS PASSED'));
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
