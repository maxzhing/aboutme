const { chromium } = require('playwright-core');
const path = require('path').join(__dirname,'..','index.html');
const EXEC = process.env.CHROME_PATH || require('playwright-core').chromium.executablePath();
let fails = 0;
const ok = (name, cond, extra='') => { console.log((cond?'  PASS  ':'  FAIL  ')+name+(cond?'':'  <<< '+extra)); if(!cond) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: EXEC, args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1280,height:900} });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: '+e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto('file://'+path);
  await p.waitForTimeout(400);

  // ---------- 1. parse the user's exact sample ----------
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
  ok('item1 category', r1.items[0].catName==='All Tasks / Assessments', r1.items[0].catName);
  ok('item1 points', r1.items[0].possible===8 && r1.items[0].earned===8, JSON.stringify(r1.items[0]));
  ok('item1 date Aug 27 2026', new Date(r1.items[0].date).toDateString()==='Thu Aug 27 2026', new Date(r1.items[0].date).toDateString());
  ok('item2 category PP', r1.items[1].catName==='Practice / Preparation', r1.items[1].catName);
  ok('item2 points', r1.items[1].possible===15 && r1.items[1].earned===15, JSON.stringify(r1.items[1]));

  // ---------- 2. letter cutoffs ----------
  const cuts = await p.evaluate(() => [89.5,89.49,79.5,79.49,69.5,69.49,59.5,59.49,0,100].map(GM.letterFor));
  ok('MCPS cutoffs', JSON.stringify(cuts)===JSON.stringify(['A','B','B','C','C','D','D','E','E','A']), JSON.stringify(cuts));

  // ---------- 3. semester chart ----------
  const sem = await p.evaluate(() => {
    const L=['A','B','C','D','E']; const o={};
    for(const a of L) for(const c of L) o[a+c]=GM.semesterGrade(a,c);
    return o;
  });
  const expected = {AA:'A',AB:'A',AC:'B',AD:'B',AE:'C',BA:'A',BB:'B',BC:'B',BD:'C',BE:'C',
    CA:'B',CB:'B',CC:'C',CD:'C',CE:'D',DA:'B',DB:'C',DC:'C',DD:'D',DE:'D',EA:'C',EB:'C',EC:'D',ED:'D',EE:'E'};
  let semOk = true, bad=[];
  for(const k in expected) if(sem[k]!==expected[k]){semOk=false;bad.push(k+':'+sem[k]+'≠'+expected[k]);}
  ok('MCPS semester chart', semOk, bad.join(', '));

  // ---------- 4. weighted math ----------
  const calc = await p.evaluate(() => {
    const cls = { id:'x', name:'t', categories:[{id:'at',name:'All Tasks / Assessments',weight:90},{id:'pp',name:'Practice / Preparation',weight:10}],
      assignments:[
        {id:'1',catId:'at',earned:8,possible:8,graded:true,included:true},
        {id:'2',catId:'at',earned:21,possible:25,graded:true,included:true},
        {id:'3',catId:'at',earned:34.5,possible:40,graded:true,included:true},
        {id:'4',catId:'pp',earned:15,possible:15,graded:true,included:true},
        {id:'5',catId:'pp',earned:8,possible:10,graded:true,included:true},
        {id:'6',catId:'pp',earned:null,possible:12,graded:false,included:true}]};
    const r = GM.computeClass(cls);
    // only-AT case: empty category weight redistributes
    const cls2 = JSON.parse(JSON.stringify(cls)); cls2.assignments = cls2.assignments.filter(a=>a.catId==='at');
    const r2 = GM.computeClass(cls2);
    const need = GM.scoreNeeded(cls,'at',50,89.5);
    return { pct:r.pct, letter:r.letter, at:r.cats[0].pct, pp:r.cats[1].pct, pct2:r2.pct, need:need.need, needImp:!!need.impossible };
  });
  const expAT = 63.5/73*100, expPP = 23/25*100, expTot = (expAT*90+expPP*10)/100;
  ok('AT category %', Math.abs(calc.at-expAT)<1e-9, calc.at+' vs '+expAT);
  ok('PP category % (ungraded excluded)', Math.abs(calc.pp-expPP)<1e-9, calc.pp+' vs '+expPP);
  ok('weighted 90/10 total', Math.abs(calc.pct-expTot)<1e-9, calc.pct+' vs '+expTot);
  ok('total is a B (87.49)', calc.letter==='B' && calc.pct.toFixed(2)==='87.49', calc.pct);
  ok('empty category drops out (AT alone = AT%)', Math.abs(calc.pct2-expAT)<1e-9, calc.pct2+' vs '+expAT);
  ok('scoreNeeded returns a reachable score', !calc.needImp && calc.need>0 && calc.need<=50*2, JSON.stringify(calc));

  // verify scoreNeeded is exact: applying it lands >= target
  const verify = await p.evaluate(() => {
    const cls = { id:'x', categories:[{id:'at',name:'AT',weight:90},{id:'pp',name:'PP',weight:10}],
      assignments:[{id:'1',catId:'at',earned:63.5,possible:73,graded:true,included:true},
                   {id:'2',catId:'pp',earned:23,possible:25,graded:true,included:true}]};
    const n = GM.scoreNeeded(cls,'at',50,89.5).need;
    const after = GM.computeClass(cls,{extra:{catId:'at',earned:Math.ceil(n*100)/100,possible:50}}).pct;
    const under = GM.computeClass(cls,{extra:{catId:'at',earned:n-0.1,possible:50}}).pct;
    return { after, under };
  });
  ok('scoreNeeded boundary is tight', verify.after>=89.5 && verify.under<89.5, JSON.stringify(verify));

  // ---------- 5. UI flow ----------
  await p.click('#nav button[data-view="help"]');
  await p.click('#loadDemo');
  await p.waitForTimeout(350);
  const heroLetter = await p.textContent('.gradeball .lt');
  const heroPct = await p.textContent('.gradeball .pc');
  ok('demo loads and shows B / 87.49%', heroLetter.trim()==='B' && heroPct.includes('87.49'), heroLetter+' '+heroPct);
  const rows = await p.$$eval('.tbl tbody tr', r => r.length);
  ok('demo shows 6 assignment rows', rows===6, 'rows='+rows);
  const ungraded = await p.$$eval('.tbl tbody tr .pill-N', e => e.length);
  ok('one ungraded assignment flagged', ungraded===1, 'n='+ungraded);

  // edit a score live
  await p.fill('[data-earned]:below(.tbl thead)', '0').catch(()=>{});
  const firstInput = (await p.$$('[data-earned]'))[0];
  await firstInput.fill('0');
  await p.waitForTimeout(250);
  const after = await p.textContent('.gradeball .pc');
  ok('editing a score updates the grade live', !after.includes('87.49'), after);
  const editedTag = await p.$$eval('.tag.mod', e => e.length);
  ok('edited assignment gets an EDITED tag', editedTag>=0);

  // reset what-ifs
  await p.click('[data-act="clearwhatif"]');
  await p.waitForTimeout(250);
  const restored = await p.textContent('.gradeball .pc');
  ok('clear what-ifs restores real grade', restored.includes('87.49'), restored);

  // toggle an assignment off
  const cb = (await p.$$('[data-inc]'))[0];
  await cb.uncheck(); await p.waitForTimeout(200);
  const offPct = await p.textContent('.gradeball .pc');
  ok('unchecking an assignment changes the grade', !offPct.includes('87.49'), offPct);
  await cb.check(); await p.waitForTimeout(200);

  // what-do-i-need
  await p.selectOption('#needTarget','89.5');
  await p.fill('#needPts','50');
  await p.waitForTimeout(250);
  const needTxt = await p.textContent('#needOut');
  ok('what-do-I-need produces a score', /\d/.test(needTxt), needTxt);

  // add what-if assignment
  await p.click('[data-act="addrow"]'); await p.waitForTimeout(300);
  const rows2 = await p.$$eval('.tbl tbody tr', r => r.length);
  ok('add what-if assignment adds a row', rows2===7, 'rows='+rows2);

  // category weight edit
  await p.click('[data-act="settings"]'); await p.waitForTimeout(250);
  const catInputs = await p.$$('[data-cw="weight"]');
  ok('settings shows category weights', catInputs.length>=2, catInputs.length);

  // semester + gpa views
  await p.click('#nav button[data-view="semester"]'); await p.waitForTimeout(200);
  await p.selectOption('#semMP1','A'); await p.selectOption('#semMP2','D');
  await p.waitForTimeout(150);
  const semOut = await p.textContent('#semOut');
  ok('semester A+D = B', semOut.trim()==='B', semOut);
  await p.fill('#blendCourse','87.49'); await p.fill('#blendTest','95'); await p.fill('#blendW','20');
  await p.waitForTimeout(150);
  const blend = await p.textContent('#blendOut');
  ok('blend 87.49*.8 + 95*.2 = 88.99', blend.includes('88.99'), blend);
  await p.click('#nav button[data-view="gpa"]'); await p.waitForTimeout(200);
  await p.click('#gpaPull'); await p.waitForTimeout(250);
  const gw = await p.textContent('#gpaW');
  ok('GPA pulls classes', gw!=='—', gw);

  // persistence
  await p.click('#nav button[data-view="grades"]');
  await p.reload(); await p.waitForTimeout(400);
  const persisted = await p.textContent('.gradeball .lt');
  ok('data persists across reload', persisted.trim()==='B', persisted);

  // ---------- screenshots ----------
  const SS = require('path').join(__dirname,'artifacts');
  await p.screenshot({ path:SS+'/desktop.png', fullPage:false });
  await p.evaluate(()=>{ GM.state().theme='dark'; document.documentElement.dataset.theme='dark'; });
  await p.waitForTimeout(200);
  await p.screenshot({ path:SS+'/dark.png' });
  await p.evaluate(()=>{ document.documentElement.dataset.theme='light'; });
  const m = await b.newPage({ viewport:{width:390,height:844} });
  await m.goto('file://'+path); await m.waitForTimeout(400);
  await m.screenshot({ path:SS+'/mobile.png' });
  // horizontal scroll check on mobile
  const hs = await m.evaluate(()=> document.documentElement.scrollWidth > window.innerWidth+1);
  ok('no horizontal page scroll on mobile (empty state)', !hs);
  await m.evaluate(()=>GM.loadDemo()); await m.waitForTimeout(400);
  const hs2 = await m.evaluate(()=> document.documentElement.scrollWidth > window.innerWidth+1);
  ok('no horizontal page scroll on mobile (with data)', !hs2, 'sw='+await m.evaluate(()=>document.documentElement.scrollWidth));
  await m.screenshot({ path:SS+'/mobile-data.png' });

  ok('no console/page errors', errs.length===0, errs.join(' | '));
  await b.close();
  console.log('\n'+(fails?('*** '+fails+' FAILURE(S) ***'):'ALL CHECKS PASSED'));
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
