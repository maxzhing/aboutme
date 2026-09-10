const { chromium } = require('playwright-core');
const path = require('path').join(__dirname,'..','index.html');
const EXEC = process.env.CHROME_PATH || require('playwright-core').chromium.executablePath();
const SS = require('path').join(__dirname,'artifacts');
let fails = 0;
const ok = (n,c,x='') => { console.log((c?'  PASS  ':'  FAIL  ')+n+(c?'':'  <<< '+x)); if(!c) fails++; };
const URLF = 'file://'+path;

(async () => {
  const b = await chromium.launch({ executablePath:EXEC, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1400,height:1000} });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: '+e.message));
  p.on('console', m => { const t=m.text();
    if (m.type()==='error' && !/fonts\.(googleapis|gstatic)|ERR_CONNECTION|ERR_NAME|ERR_INTERNET|ERR_BLOCKED/.test(t)) errs.push('console: '+t); });
  await p.goto(URLF); await p.waitForTimeout(600);

  // ---------- MULTIPLE CLASSES ----------
  const classes = await p.evaluate(() => GM.state().classes.map(c => ({ n:c.name, p:c.period, w:c.weighted,
    a:c.assignments.length, g:GM.computeClass(c).letter, pct:GM.computeClass(c).pct })));
  ok('example seeds 4 separate classes', classes.length===4, JSON.stringify(classes.map(c=>c.n)));
  ok('each class has its own assignments', classes.every(c=>c.a>=4), JSON.stringify(classes.map(c=>c.a)));
  ok('each class computes its own grade', classes.every(c=>c.g) && new Set(classes.map(c=>c.pct.toFixed(2))).size===4,
     JSON.stringify(classes.map(c=>c.g+' '+c.pct.toFixed(2))));
  ok('AP/Honors auto-detected as weighted', classes.filter(c=>c.w).length===2 && classes.find(c=>c.n==='AP Biology').w
     && classes.find(c=>c.n==='Honors Algebra 2').w, JSON.stringify(classes.map(c=>c.n+':'+c.w)));
  ok('gradebook shows a card per class', (await p.$$eval('.gbcard[data-open]', e=>e.length))===4);
  ok('each card draws a sparkline', (await p.$$eval('.gbcard .spark', e=>e.length))===4);
  ok('add-a-class card is present', (await p.$$eval('.gbcard.add', e=>e.length))===1);

  // GPA across all classes
  const gpa = await p.evaluate(() => GM.schoolGPA());
  const expUn = await p.evaluate(() => { const P={A:4,B:3,C:2,D:1,E:0};
    const g = GM.state().classes.map(c=>GM.computeClass(c).letter).filter(Boolean);
    return g.reduce((s,l)=>s+P[l],0)/g.length; });
  ok('GPA averages every class', Math.abs(gpa.un-expUn)<1e-9 && gpa.n===4, JSON.stringify(gpa));
  ok('weighted GPA adds the bump', Math.abs(gpa.w-(gpa.un+2/4))<1e-9, JSON.stringify(gpa));

  // ---------- MULTI-CLASS PASTE ----------
  const multi = `Period 1: AP Chemistry
Sep
4
AT-Titration Lab due 9/4
All Tasks / Assessments | 20.00 points
18
90%
Sep
9
PP-Moles Worksheet due 9/9
Practice / Preparation | 10.00 points
9
90%
Period 4: World History
Sep
5
AT-Rome Test due 9/5
All Tasks / Assessments | 40.00 points
30
75%
Sep
12
PP-Map Quiz due 9/12
Practice / Preparation | 10.00 points
10
100%`;
  const split = await p.evaluate(t => GM.splitClasses(t), multi);
  ok('one paste splits into 2 classes', split && split.length===2, JSON.stringify(split && split.map(c=>c.header)));
  const fresh = await b.newPage({ viewport:{width:1400,height:1000} });
  await fresh.goto(URLF); await fresh.waitForTimeout(400);
  await fresh.evaluate(txt => { const dt = new DataTransfer(); dt.setData('text', txt);
    document.body.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); }, multi);
  await fresh.waitForTimeout(500);
  const after = await fresh.evaluate(() => GM.state().classes.map(c => ({ n:c.name, p:c.period, a:c.assignments.length,
    g:GM.computeClass(c).letter })));
  ok('pasting many classes creates them all', after.length===2 && after.every(c=>c.a===2), JSON.stringify(after));
  ok('course names and periods are picked up', after[0].n==='AP Chemistry' && after[0].p==='1'
     && after[1].n==='World History' && after[1].p==='4', JSON.stringify(after));
  ok('each pasted class grades separately', after[0].g==='A' && after[1].g==='C', JSON.stringify(after.map(c=>c.g)));
  await fresh.close();

  // adding classes by hand
  const f2 = await b.newPage({ viewport:{width:1400,height:1000} });
  await f2.goto(URLF); await f2.waitForTimeout(400);
  await f2.click('[data-act="addclass"]'); await f2.waitForTimeout(350);
  ok('Add a class opens a new class', (await f2.evaluate(()=>GM.state().classes.length))===5
     && !(await f2.$('#view-class[hidden]')), 'n='+await f2.evaluate(()=>GM.state().classes.length));
  await f2.close();

  // ---------- MCPS MATH (unchanged, still exact) ----------
  const cuts = await p.evaluate(() => [89.5,89.49,79.5,79.49,69.5,69.49,59.5,59.49,0,100].map(GM.letterFor));
  ok('MCPS cutoffs', JSON.stringify(cuts)===JSON.stringify(['A','B','B','C','C','D','D','E','E','A']));
  const sem = await p.evaluate(() => { const L=['A','B','C','D','E'],o={};
    for(const a of L) for(const c of L) o[a+c]=GM.semesterGrade(a,c); return o; });
  const exp = {AA:'A',AB:'A',AC:'B',AD:'B',AE:'C',BB:'B',BC:'B',BD:'C',BE:'C',CC:'C',CD:'C',CE:'D',DD:'D',DE:'D',EE:'E'};
  ok('MCPS semester chart', Object.keys(exp).every(k=>sem[k]===exp[k]));
  const calc = await p.evaluate(() => {
    const cls = { categories:[{id:'at',name:'All Tasks / Assessments',weight:90},{id:'pp',name:'Practice / Preparation',weight:10}],
      assignments:[{id:'1',catId:'at',earned:63.5,possible:73,graded:true,included:true},
                   {id:'2',catId:'pp',earned:23,possible:25,graded:true,included:true}]};
    return { pct:GM.computeClass(cls).pct, letter:GM.computeClass(cls).letter };
  });
  ok('90/10 weighting = 87.49 B', calc.pct.toFixed(2)==='87.49' && calc.letter==='B', JSON.stringify(calc));

  // optimizer across categories
  const need = await p.evaluate(() => {
    const cls = { categories:[{id:'at',name:'AT',weight:90},{id:'pp',name:'PP',weight:10}],
      assignments:[{id:'1',catId:'at',earned:63.5,possible:73,graded:true,included:true},
                   {id:'2',catId:'pp',earned:23,possible:25,graded:true,included:true}]};
    const r = GM.neededFraction(cls, { at:100, pp:20 }, 89.5);
    const check = GM.computeClass({ categories:cls.categories, assignments:cls.assignments.concat([
      {id:'s1',catId:'at',earned:r.f*100,possible:100,graded:true,included:true},
      {id:'s2',catId:'pp',earned:r.f*20,possible:20,graded:true,included:true}])}).pct;
    const under = GM.computeClass({ categories:cls.categories, assignments:cls.assignments.concat([
      {id:'s1',catId:'at',earned:(r.f-0.01)*100,possible:100,graded:true,included:true},
      {id:'s2',catId:'pp',earned:(r.f-0.01)*20,possible:20,graded:true,included:true}])}).pct;
    return { f:r.f, check, under };
  });
  ok('optimizer solves across all categories', need.check>=89.5-1e-9 && need.under<89.5, JSON.stringify(need));

  // ---------- CLASS VIEW + ANIMATION ----------
  await p.click('.gbcard[data-open]'); await p.waitForTimeout(700);
  ok('clicking a card opens that class', !(await p.$('#view-class[hidden]')) && (await p.$('#view-gradebook[hidden]')));
  ok('class view draws the ring', (await p.$$eval('.ring .prog', e=>e.length))===1);
  ok('class view draws the trend chart', (await p.$$eval('.chart .line', e=>e.length))===1);
  ok('category donuts drawn', (await p.$$eval('.donut .dprog', e=>e.length))>=2);
  const rowsN = await p.$$eval('.arow', e=>e.length);
  ok('assignment rows rendered', rowsN>=4, 'n='+rowsN);
  await p.click('[data-act="back"]'); await p.waitForTimeout(500);
  ok('back returns to the gradebook', !(await p.$('#view-gradebook[hidden]')));

  // ---------- THEMES / CUSTOMISATION ----------
  await p.click('#themeOpen'); await p.waitForTimeout(300);
  ok('theme dialog opens', (await p.$$eval('.skin', e=>e.length))===10, await p.$$eval('.skin',e=>e.length));
  const swH = await p.$$eval('.skin .sw', e => e.map(x => x.getBoundingClientRect().height));
  ok('every theme shows its colour swatch', swH.length===10 && swH.every(h => h > 20), JSON.stringify(swH.slice(0,3)));
  const before = await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
  await p.click('[data-skin="midnight"]'); await p.waitForTimeout(350);
  const afterSkin = await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
  ok('picking a theme re-tints the app', before!==afterSkin && afterSkin==='#6366f1', before+' -> '+afterSkin);
  const bg1 = await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  await p.click('[data-mode="dark"]'); await p.waitForTimeout(350);
  const bg2 = await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  ok('light/dark switch works', bg1!==bg2, bg1+' -> '+bg2);
  await p.evaluate(()=>{ const i=document.querySelector('#accentPick'); i.value='#00b3ff'; i.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(250);
  ok('custom accent applies', (await p.evaluate(()=>document.documentElement.style.getPropertyValue('--acc')))==='#00b3ff');
  await p.click('#classicTog + .tr'); await p.waitForTimeout(300);
  const classicA = await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--D').trim());
  ok('classic grade colours toggle', classicA.toLowerCase().includes('92') || classicA.toLowerCase().includes('fb'), classicA);
  await p.click('#classicTog + .tr'); await p.waitForTimeout(200); await p.click('[data-skin="melon"]'); await p.waitForTimeout(250);
  await p.click('[data-mode="auto"]'); await p.waitForTimeout(300);
  await p.evaluate(()=>GM.state().accent='');
  await p.click('[data-close]'); await p.waitForTimeout(250);
  ok('dialog closes', (await p.$$eval('.scrim', e=>e.length))===0);

  // ---------- GPA MODAL ----------
  await p.click('#gpaModalBtn'); await p.waitForTimeout(300);
  ok('GPA dialog lists every class', (await p.$$eval('[data-wt]', e=>e.length))===4);
  await p.click('[data-close]'); await p.waitForTimeout(200);

  // ---------- OPTIMIZER MODAL ----------
  await p.click('.gbcard[data-open]'); await p.waitForTimeout(600);
  await p.click('[data-act="optimize"]'); await p.waitForTimeout(350);
  ok('optimizer opens with a box per category', (await p.$$eval('.optrem', e=>e.length))>=2);
  const optTxt = await p.textContent('#optOut');
  ok('optimizer gives an answer', /\d/.test(optTxt) || /reach|locked/i.test(optTxt), optTxt);
  await p.click('[data-close]'); await p.waitForTimeout(200);

  // ---------- EDITING ----------
  const pctBefore = await p.textContent('.ring .pc');
  const firstIn = (await p.$$('[data-earned]'))[0];
  await firstIn.fill('0'); await p.waitForTimeout(300);
  ok('typing a score updates live', (await p.textContent('.ring .pc'))!==pctBefore);
  ok('edited row tagged', (await p.$$eval('.tag.mod', e=>e.length))===1);
  await p.click('[data-act="clearwhatif"]'); await p.waitForTimeout(350);
  ok('reset restores the real grade', (await p.textContent('.ring .pc'))===pctBefore);
  await p.click('[data-slide]'); await p.waitForTimeout(300);
  ok('slider opens', (await p.$$eval('[data-range]', e=>e.length))===1);
  await p.evaluate(()=>{ const r=document.querySelector('[data-range]'); r.value=r.max/2; r.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(300);
  ok('slider changes the grade', (await p.textContent('.ring .pc'))!==pctBefore);
  await p.click('[data-act="clearwhatif"]'); await p.waitForTimeout(300);
  const nRows = await p.$$eval('.arow', e=>e.length);
  await p.click('[data-del]'); await p.waitForTimeout(300);
  ok('delete works', (await p.$$eval('.arow', e=>e.length))===nRows-1);
  await p.click('#toast button'); await p.waitForTimeout(350);
  ok('undo restores it', (await p.$$eval('.arow', e=>e.length))===nRows);

  // ---------- PERSIST + VIEWS ----------
  await p.click('[data-act="back"]'); await p.waitForTimeout(300);
  await p.click('#viewSeg [data-gv="table"]'); await p.waitForTimeout(300);
  ok('table view lists every class', (await p.$$eval('.gbtable tbody tr', e=>e.length))===4);
  await p.click('#viewSeg [data-gv="card"]'); await p.waitForTimeout(250);
  await p.click('#nav [data-view="semester"]'); await p.waitForTimeout(300);
  await p.selectOption('#semMP1','A'); await p.waitForTimeout(200);
  await p.selectOption('#semMP2','D'); await p.waitForTimeout(300);
  ok('semester A+D = B', (await p.textContent('#view-semester .result .big')).trim()==='B');
  await p.click('#nav [data-view="gpa"]'); await p.waitForTimeout(300);
  ok('GPA page lists classes', (await p.$$eval('#view-gpa [data-wt]', e=>e.length))===4);
  await p.click('#nav [data-view="gradebook"]'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(600);
  ok('everything persists across reload', (await p.$$eval('.gbcard[data-open]', e=>e.length))===4);

  // ---------- SCREENSHOTS ----------
  await p.waitForTimeout(1600);
  await p.screenshot({ path:SS+'/gradebook.png' });
  await p.click('.gbcard[data-open]'); await p.waitForTimeout(1500);
  await p.screenshot({ path:SS+'/class.png' });
  await p.evaluate(()=>{ GM.setState({skin:'midnight', theme:'dark'}); }); await p.waitForTimeout(300);
  await p.click('[data-act="back"]'); await p.waitForTimeout(1600);
  await p.screenshot({ path:SS+'/dark-midnight.png' });
  await p.evaluate(()=>{ GM.setState({skin:'melon', theme:'auto'}); }); await p.waitForTimeout(300);
  await p.click('#themeOpen'); await p.waitForTimeout(400);
  await p.screenshot({ path:SS+'/themes.png' });
  await p.click('[data-close]');

  const m = await b.newPage({ viewport:{width:390,height:844} });
  await m.goto(URLF); await m.waitForTimeout(1500);
  await m.screenshot({ path:SS+'/mobile.png' });
  ok('no sideways scroll on mobile', !(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),
     'sw='+await m.evaluate(()=>document.documentElement.scrollWidth));
  const navBox = await m.evaluate(() => { const b=[...document.querySelectorAll('#nav .navlink')].map(e=>e.getBoundingClientRect());
    return { rowly: b.every(r => Math.abs(r.top-b[0].top) < 4), h: Math.round(b[0].height) }; });
  ok('mobile nav sits in one row', navBox.rowly, JSON.stringify(navBox));
  const clipped = await m.evaluate(() => [...document.querySelectorAll('.stat .v')].some(e => e.scrollWidth > e.clientWidth + 1));
  ok('no clipped stat numbers on mobile', !clipped);
  await m.click('.gbcard[data-open]'); await m.waitForTimeout(900);
  await m.screenshot({ path:SS+'/mobile-class.png' });
  await m.close();

  ok('no console/page errors', errs.length===0, errs.slice(0,4).join(' | '));
  await b.close();
  console.log('\n'+(fails?('*** '+fails+' FAILURE(S) ***'):'ALL CHECKS PASSED'));
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
