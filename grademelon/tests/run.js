const { chromium } = require('playwright-core');
const path = require('path').join(__dirname,'..','index.html');
const EXEC = process.env.CHROME_PATH || require('playwright-core').chromium.executablePath();
const SS = require('path').join(__dirname,'artifacts');
let fails = 0;
const ok = (name, cond, extra='') => { console.log((cond?'  PASS  ':'  FAIL  ')+name+(cond?'':'  <<< '+extra)); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: EXEC, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:940} });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: '+e.message));
  p.on('console', m => { const t=m.text();
    if (m.type()==='error' && !/fonts\.(googleapis|gstatic)\.com|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_BLOCKED/.test(t)) errs.push('console: '+t); });
  await p.goto('file://'+path);
  await p.waitForTimeout(500);

  // ---------- parser: the exact StudentVUE paste shape ----------
  const USER = `Week 01 - 8/25/2026 through 8/29/2026  (1 items)
Aug
27
AT-Current Events due 8/27, deadline 8/28
All Tasks / Assessments | 8.00 points
8
100%
Week 02 - 8/30/2026 through 9/5/2026  (1 items)
Aug
31
PP-Intro to Democracy due 8/31
Practice / Preparation | 15.00 points
15
100%`;
  const r1 = await p.evaluate(t => GM.parseGradebook(t), USER);
  ok('user sample -> 2 assignments', r1.items.length===2, JSON.stringify(r1.items));
  ok('item1 name', r1.items[0].name==='AT-Current Events due 8/27, deadline 8/28', r1.items[0].name);
  ok('item1 category + points', r1.items[0].catName==='All Tasks / Assessments' && r1.items[0].possible===8 && r1.items[0].earned===8);
  ok('item1 date Aug 27 2026', new Date(r1.items[0].date).toDateString()==='Thu Aug 27 2026');
  ok('item2 PP 15pts', r1.items[1].catName==='Practice / Preparation' && r1.items[1].possible===15);

  // ---------- MCPS math ----------
  const cuts = await p.evaluate(() => [89.5,89.49,79.5,79.49,69.5,69.49,59.5,59.49,0,100].map(GM.letterFor));
  ok('MCPS cutoffs', JSON.stringify(cuts)===JSON.stringify(['A','B','B','C','C','D','D','E','E','A']), JSON.stringify(cuts));
  const sem = await p.evaluate(() => { const L=['A','B','C','D','E']; const o={};
    for(const a of L) for(const c of L) o[a+c]=GM.semesterGrade(a,c); return o; });
  const exp = {AA:'A',AB:'A',AC:'B',AD:'B',AE:'C',BA:'A',BB:'B',BC:'B',BD:'C',BE:'C',
    CA:'B',CB:'B',CC:'C',CD:'C',CE:'D',DA:'B',DB:'C',DC:'C',DD:'D',DE:'D',EA:'C',EB:'C',EC:'D',ED:'D',EE:'E'};
  const bad = Object.keys(exp).filter(k => sem[k]!==exp[k]);
  ok('MCPS semester chart', !bad.length, bad.join(', '));

  const calc = await p.evaluate(() => {
    const cls = { id:'x', categories:[{id:'at',name:'All Tasks / Assessments',weight:90},{id:'pp',name:'Practice / Preparation',weight:10}],
      assignments:[{id:'1',catId:'at',earned:8,possible:8,graded:true,included:true},
        {id:'2',catId:'at',earned:21,possible:25,graded:true,included:true},
        {id:'3',catId:'at',earned:34.5,possible:40,graded:true,included:true},
        {id:'4',catId:'pp',earned:15,possible:15,graded:true,included:true},
        {id:'5',catId:'pp',earned:8,possible:10,graded:true,included:true},
        {id:'6',catId:'pp',earned:null,possible:12,graded:false,included:true}]};
    const r = GM.computeClass(cls);
    const only = JSON.parse(JSON.stringify(cls)); only.assignments = only.assignments.filter(a=>a.catId==='at');
    return { pct:r.pct, letter:r.letter, at:r.cats[0].pct, pp:r.cats[1].pct, atOnly:GM.computeClass(only).pct,
             trend:GM.trendSeries(cls).length };
  });
  const expAT = 63.5/73*100, expPP = 23/25*100, expTot = (expAT*90+expPP*10)/100;
  ok('AT category %', Math.abs(calc.at-expAT)<1e-9);
  ok('PP category % (ungraded excluded)', Math.abs(calc.pp-expPP)<1e-9);
  ok('weighted 90/10 total is 87.49 B', Math.abs(calc.pct-expTot)<1e-9 && calc.letter==='B' && calc.pct.toFixed(2)==='87.49', calc.pct);
  ok('empty category re-scales', Math.abs(calc.atOnly-expAT)<1e-9);
  ok('trend series has a point per graded assignment', calc.trend===5, 'n='+calc.trend);

  const verify = await p.evaluate(() => {
    const cls = { categories:[{id:'at',name:'AT',weight:90},{id:'pp',name:'PP',weight:10}],
      assignments:[{id:'1',catId:'at',earned:63.5,possible:73,graded:true,included:true},
                   {id:'2',catId:'pp',earned:23,possible:25,graded:true,included:true}]};
    const n = GM.scoreNeeded(cls,'at',50,89.5).need;
    return { after:GM.computeClass(cls,{extra:{catId:'at',earned:Math.ceil(n*100)/100,possible:50}}).pct,
             under:GM.computeClass(cls,{extra:{catId:'at',earned:n-0.1,possible:50}}).pct };
  });
  ok('scoreNeeded boundary is tight', verify.after>=89.5 && verify.under<89.5, JSON.stringify(verify));

  // ---------- first visit ----------
  ok('first visit seeds an example', (await p.textContent('.ring .lt')).trim()==='B'
     && (await p.$$eval('[data-act="clearsample"]', e=>e.length))===1);
  ok('example shows 6 rows', (await p.$$eval('.arow', e=>e.length))===6);
  ok('one row marked not graded', (await p.$$eval('.tag.un', e=>e.length))===1);
  ok('one class card in the overview', (await p.$$eval('.classcard[data-cls]', e=>e.length))===1);

  // ---------- graphics ----------
  const chart = await p.evaluate(() => {
    const svg = document.querySelector('.chart'); if (!svg) return null;
    return { pts:svg.querySelectorAll('.dot').length, bands:svg.querySelectorAll('.band').length,
             labels:[...svg.querySelectorAll('.bandlabel')].map(t=>t.textContent),
             w:svg.viewBox.baseVal.width, line:!!svg.querySelector('.line').getAttribute('d') };
  });
  ok('trend chart drew a line with a point per assignment', chart && chart.pts===5 && chart.line, JSON.stringify(chart));
  ok('letter bands are drawn and directly labelled', chart && chart.bands>=4 && chart.labels.includes('A') && chart.labels.includes('B'), JSON.stringify(chart&&chart.labels));
  ok('chart sized to its container (no squashing)', chart && chart.w>400, 'w='+(chart&&chart.w));
  const ring = await p.evaluate(() => {
    const c = document.querySelector('.ring .prog');
    return { dash:+c.getAttribute('stroke-dasharray'), off:+c.getAttribute('stroke-dashoffset'),
             ticks:document.querySelectorAll('.ring .tick').length };
  });
  ok('grade ring arc matches the percentage', Math.abs((1-ring.off/ring.dash)*100 - 87.49) < 0.02, JSON.stringify(ring));
  ok('ring has letter-cutoff ticks', ring.ticks===4, 'n='+ring.ticks);
  ok('category donuts drawn', (await p.$$eval('.donut .dprog', e=>e.length))===2);

  // ---------- editing ----------
  const first = (await p.$$('[data-earned]'))[0];
  await first.fill('0'); await p.waitForTimeout(250);
  ok('typing a score updates the grade live', !(await p.textContent('.ring .pc')).includes('87.49'), await p.textContent('.ring .pc'));
  ok('edited row is tagged', (await p.$$eval('.tag.mod', e=>e.length))===1);
  await p.click('[data-act="clearwhatif"]'); await p.waitForTimeout(300);
  ok('reset restores the real grade', (await p.textContent('.ring .pc')).includes('87.49'), await p.textContent('.ring .pc'));

  // slider
  await p.click('[data-slide]'); await p.waitForTimeout(250);
  ok('drag handle opens a slider', (await p.$$eval('[data-range]', e=>e.length))===1);
  await p.evaluate(() => { const r=document.querySelector('[data-range]');
    r.value = r.max/2; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(250);
  ok('slider changes the grade', !(await p.textContent('.ring .pc')).includes('87.49'), await p.textContent('.ring .pc'));
  await p.click('[data-act="clearwhatif"]'); await p.waitForTimeout(250);

  // include toggle
  await p.click('.tick-btn'); await p.waitForTimeout(250);
  ok('un-ticking an assignment changes the grade', !(await p.textContent('.ring .pc')).includes('87.49'));
  await p.click('.tick-btn'); await p.waitForTimeout(250);
  ok('re-ticking puts it back', (await p.textContent('.ring .pc')).includes('87.49'));

  // delete + undo
  const before = await p.$$eval('.arow', e=>e.length);
  await p.click('[data-del]'); await p.waitForTimeout(250);
  ok('delete removes a row', (await p.$$eval('.arow', e=>e.length))===before-1);
  await p.click('#toast button'); await p.waitForTimeout(300);
  ok('undo brings it back', (await p.$$eval('.arow', e=>e.length))===before);

  // what-if add
  await p.click('[data-act="addrow"]'); await p.waitForTimeout(350);
  ok('add what-if adds a row', (await p.$$eval('.arow', e=>e.length))===before+1);
  await p.click('[data-act="clearwhatif"]'); await p.waitForTimeout(250);

  // what do I need
  await p.selectOption('#needTarget','89.5'); await p.fill('#needPts','50'); await p.waitForTimeout(250);
  ok('what-do-I-need answers with a score', /\d/.test(await p.textContent('#needOut')), await p.textContent('#needOut'));

  // ---------- paste anywhere ----------
  const fresh = await b.newPage({ viewport:{width:1280,height:900} });
  await fresh.goto('file://'+path); await fresh.waitForTimeout(400);
  await fresh.evaluate(txt => {
    const dt = new DataTransfer(); dt.setData('text', txt);
    document.body.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
  }, 'Course: AP Chemistry\nSep\n4\nAT-Titration Lab due 9/4\nAll Tasks / Assessments | 20.00 points\n18\n90%');
  await fresh.waitForTimeout(400);
  const pasted = await fresh.evaluate(() => { const s=GM.state();
    return { n:s.classes.length, name:s.classes[0].name, sample:!!s.classes[0].sample, a:s.classes[0].assignments.length }; });
  ok('pasting anywhere imports, replacing the example', pasted.n===1 && pasted.name==='AP Chemistry' && !pasted.sample && pasted.a===1, JSON.stringify(pasted));
  await fresh.close();

  // ---------- sample clearing ----------
  const f2 = await b.newPage({ viewport:{width:1280,height:900} });
  await f2.goto('file://'+path); await f2.waitForTimeout(400);
  await f2.click('[data-act="clearsample"]'); await f2.waitForTimeout(300);
  ok('clearing the example empties the app', (await f2.evaluate(()=>GM.state().classes.length))===0);
  ok('empty state offers a paste box', (await f2.$$eval('#firstPaste', e=>e.length))===1);
  await f2.close();

  // ---------- semester / gpa / theme ----------
  await p.click('#nav button[data-view="semester"]'); await p.waitForTimeout(250);
  await p.selectOption('#semMP1','A'); await p.selectOption('#semMP2','D'); await p.waitForTimeout(200);
  ok('semester A+D = B', (await p.textContent('#semOut')).trim()==='B');
  await p.fill('#blendCourse','87.49'); await p.fill('#blendTest','95'); await p.fill('#blendW','20'); await p.waitForTimeout(200);
  ok('blend 87.49x.8 + 95x.2 = 88.99', (await p.textContent('#blendOut')).includes('88.99'), await p.textContent('#blendOut'));
  await p.click('#nav button[data-view="gpa"]'); await p.waitForTimeout(200);
  await p.click('#gpaPull'); await p.waitForTimeout(250);
  ok('GPA pulls classes', (await p.textContent('#gpaW'))!=='—');
  await p.click('#nav button[data-view="grades"]'); await p.waitForTimeout(300);

  await p.reload(); await p.waitForTimeout(500);
  ok('data persists across reload', (await p.textContent('.ring .lt')).trim()==='B');

  // ---------- theme ----------
  for (const cs of ['dark','light']){
    const tp = await b.newPage({ viewport:{width:1280,height:900}, colorScheme:cs });
    await tp.goto('file://'+path); await tp.waitForTimeout(350);
    const bg = await tp.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    const stamped = await tp.evaluate(()=>document.documentElement.getAttribute('data-theme'));
    const isDark = bg.replace(/[^\d,]/g,'').split(',').slice(0,3).reduce((a,x)=>a+ +x,0) < 200;
    ok(`${cs} OS theme applies with no stamp`, stamped===null && isDark===(cs==='dark'), `${bg} / ${stamped}`);
    await tp.close();
  }

  // ---------- screenshots ----------
  await p.waitForTimeout(1300);
  await p.screenshot({ path:SS+'/desktop.png' });
  await p.evaluate(()=>{ document.documentElement.dataset.theme='dark'; GM.paintChart(); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path:SS+'/dark.png' });
  await p.evaluate(()=>{ document.documentElement.dataset.theme='light'; GM.paintChart(); });
  await p.waitForTimeout(200);
  await p.evaluate(()=>window.scrollTo(0,900)); await p.waitForTimeout(300);
  await p.screenshot({ path:SS+'/rows.png' });

  const m = await b.newPage({ viewport:{width:390,height:844} });
  await m.goto('file://'+path); await m.waitForTimeout(500);
  await m.screenshot({ path:SS+'/mobile.png' });
  const hs = await m.evaluate(()=> document.documentElement.scrollWidth > innerWidth+1);
  ok('no sideways scroll on mobile', !hs, 'sw='+await m.evaluate(()=>document.documentElement.scrollWidth));
  await m.evaluate(()=>window.scrollTo(0,760)); await m.waitForTimeout(300);
  await m.screenshot({ path:SS+'/mobile-rows.png' });
  await m.close();

  ok('no console/page errors', errs.length===0, errs.slice(0,4).join(' | '));
  await b.close();
  console.log('\n'+(fails?('*** '+fails+' FAILURE(S) ***'):'ALL CHECKS PASSED'));
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
