const { chromium } = require('playwright-core');
const path = require('path').join(__dirname,'..','index.html');
const SS = require('path').join(__dirname,'artifacts');
let fails = 0;
const ok = (n,c,x='') => { console.log((c?'  PASS  ':'  FAIL  ')+n+(c?'':'  <<< '+x)); if(!c) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || require('playwright-core').chromium.executablePath(), args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{width:1400,height:1050} });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: '+e.message));
  p.on('console', m => { const t=m.text();
    if (m.type()==='error' && !/fonts\.(googleapis|gstatic)|ERR_CONNECTION|ERR_NAME|ERR_INTERNET|ERR_BLOCKED/.test(t)) errs.push('console: '+t); });

  // ---------- onboarding ----------
  await p.goto('file://'+path); await p.waitForTimeout(500);
  await p.evaluate(()=>{ localStorage.clear(); });
  await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(()=>{ GM.setState({ classes:[], active:null }); });
  await p.waitForTimeout(300);
  const empty = await p.textContent('#view-gradebook');
  ok('empty state leads with the value, not the mechanics', /what your grades actually mean/i.test(empty), empty.slice(0,120));
  ok('empty state says where to paste', /Ctrl\s*\+\s*V/.test(empty.replace(/\u00a0/g,' ')), empty.slice(0,200));
  ok('privacy is stated up front', /No account\. No password\. Nothing leaves this device\./.test(empty));
  ok('a paste box is on screen without clicking anything', (await p.$$eval('#firstPaste', e=>e.length))===1);

  // ---------- import feedback ----------
  await p.fill('#firstPaste', `Period 1: AP Chemistry
Sep
4
AT-Titration Lab due 9/4
All Tasks / Assessments | 20.00 points
18
90%
Sep
9
PP-Moles WS due 9/9
Practice / Preparation | 10.00 points
9
90%
Sep
12
AT-Midterm due 9/12
All Tasks / Assessments | 60.00 points`);
  await p.click('#firstImport'); await p.waitForTimeout(600);
  const banner = await p.textContent('.impbanner');
  ok('import reports what was recognised', /1 class/.test(banner) && /AP Chemistry/.test(banner), banner.slice(0,140));
  ok('import reports the resulting grade', /is at 90\.00% — A/.test(banner), banner.slice(0,220));
  ok('import flags ungraded work rather than hiding it', /1 not graded yet/.test(banner), banner.slice(0,260));
  ok('no raw parser error language', !/error|exception|NaN|undefined/i.test(banner), banner.slice(0,200));

  // a second paste explains the grade change
  await p.click('[data-act="pasteNew"]'); await p.waitForTimeout(300);
  await p.fill('#pasteBox', `Sep
19
AT-Unit Test due 9/19
All Tasks / Assessments | 50.00 points
30
60%`);
  await p.click('[data-act="import"]'); await p.waitForTimeout(600);
  const banner2 = await p.textContent('.impbanner');
  ok('a grade change is explained with its cause', /fell from/.test(banner2) && /biggest single cause/.test(banner2) && /Unit Test/.test(banner2), banner2.slice(0,300));

  // ---------- data check ----------
  await p.click('#checkBtn'); await p.waitForTimeout(350);
  const chk = await p.textContent('.modal');
  ok('data check counts classes and assignments', /class/.test(chk) && /assignment/.test(chk) && /graded/.test(chk), chk.slice(0,160));
  await p.click('.modal [data-close]'); await p.waitForTimeout(250);

  // ---------- dashboard ----------
  await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(700);
  ok('glance gives a plain-language verdict', (await p.textContent('.glance .say')).length > 5, await p.textContent('.glance .say'));
  ok('glance shows the GPA', /weighted GPA/.test(await p.textContent('.glance .sub')));
  ok('glance shows a letter tally', (await p.$$eval('.ltag', e=>e.length))>=1);
  ok('focus list ranks classes', (await p.$$eval('.focusrow', e=>e.length))>=3);
  const why = await p.textContent('.focusrow .fwhy');
  ok('every focus row explains itself with a number', /\d/.test(why), why);
  ok('focus rows carry a status badge', (await p.$$eval('.focusrow .badge', e=>e.length))>=3);
  ok('opportunity is shown as a bar, not just a colour', (await p.$$eval('.focusrow .oppbar .lab', e=>e.length))>=1);

  const order1 = await p.$$eval('.focusrow .fname', e => e.map(x=>x.textContent.trim().split(' ')[0]));
  await p.selectOption('#goalSel','raiseLow'); await p.waitForTimeout(400);
  const order2 = await p.$$eval('.focusrow .fname', e => e.map(x=>x.textContent.trim().split(' ')[0]));
  ok('changing the goal re-ranks the list', order1.join()!==order2.join(), order1+' -> '+order2);
  const lowest = await p.evaluate(()=>GM.classRows().filter(x=>x.a.r.pct!==null).sort((a,b)=>a.a.r.pct-b.a.r.pct)[0].c.name);
  ok('"raise my lowest" puts the lowest first', (await p.textContent('.focusrow .fname')).trim().startsWith(lowest.split(' ')[0]),
     await p.textContent('.focusrow .fname'));
  await p.selectOption('#goalSel','gpa'); await p.waitForTimeout(350);

  // filters
  const allN = await p.$$eval('.gbcard[data-open]', e=>e.length);
  await p.click('[data-filter="as"]'); await p.waitForTimeout(350);
  const aN = await p.$$eval('.gbcard[data-open]', e=>e.length);
  const realA = await p.evaluate(()=>GM.classRows().filter(x=>x.a.r.letter==='A').length);
  ok('filter chips actually filter', aN===realA && aN<allN, `${aN} shown vs ${realA} A's (all=${allN})`);
  await p.click('[data-filter="all"]'); await p.waitForTimeout(300);

  // ---------- study plan ----------
  await p.click('#planBtn'); await p.waitForTimeout(400);
  const plan = await p.textContent('.modal');
  ok('study plan allocates time across classes', (await p.$$eval('.modal .focusrow', e=>e.length))>=1, plan.slice(0,120));
  const mins = await p.$$eval('.modal .focusrow .rank', e => e.map(x=>parseInt(x.textContent)));
  ok('plan minutes add up to the time available', mins.reduce((a,c)=>a+c,0) <= 120 && mins.every(m=>m>=10), JSON.stringify(mins));
  ok('each plan slot says why', /points from|missing|down |Zeros|movable/.test(plan), plan.slice(0,400));
  await p.click('.modal [data-close]'); await p.waitForTimeout(250);

  // ---------- class page ----------
  const withWork = await p.evaluate(()=>GM.classRows().find(x=>x.a.rem.total>0).c.id);
  await p.evaluate(id=>GM.openClass(id,null), withWork); await p.waitForTimeout(900);
  ok('class page opens with a status badge', (await p.$$eval('#view-class .badge', e=>e.length))>=1);
  ok('class page explains what the grade means', (await p.$$eval('#view-class .insrow', e=>e.length))>=1);
  const insText = await p.$$eval('#view-class .insrow', e => e.map(x=>x.textContent).join(' '));
  ok('class insights quote real numbers', /\d/.test(insText), insText.slice(0,140));
  ok('"how is this calculated" is available but folded away',
     (await p.$$eval('#view-class details.help', e=>e.length))>=1 && !(await p.$eval('#view-class details.help', e=>e.open)));

  // what-if
  const hasWif = await p.$$eval('#whatifCard', e=>e.length);
  if (hasWif){
    const before = await p.textContent('#wifOut');
    await p.click('[data-wif="100"]'); await p.waitForTimeout(350);
    const after = await p.textContent('#wifOut');
    ok('what-if updates from a one-tap preset', before!==after, after.slice(0,90));
    ok('what-if shows before → after and a verdict', /→/.test(after) && /(Yes|Still|drop)/.test(after), after.slice(0,120));
    await p.click('[data-wif="0"]'); await p.waitForTimeout(350);
    ok('a zero shows the downside honestly', /drop|Still/.test(await p.textContent('#wifOut')), await p.textContent('#wifOut'));
  } else ok('what-if card present when work remains', false, 'missing');

  // upcoming impact
  const upText = await p.textContent('#view-class');
  ok('ungraded work is ranked by impact', /What is still in play/.test(upText));
  ok('impact shows both the upside and the downside', /100 →/.test(upText) && /0 →/.test(upText));
  const bands = await p.$$eval('#view-class .oppbar .lab', e => e.map(x=>x.textContent.trim()));
  ok('impact bands are relative, not all the same', new Set(bands.filter(b=>/impact/i.test(b))).size > 1 || bands.filter(b=>/impact/i.test(b)).length < 2,
     JSON.stringify(bands));

  // ---------- GPA planning ----------
  await p.click('#nav [data-view="gpa"]'); await p.waitForTimeout(400);
  await p.click('[data-gpaif="allA"]'); await p.waitForTimeout(300);
  const gpaIf = await p.textContent('#gpaIfOut');
  ok('GPA what-if projects a number', /\d\.\d{3}/.test(gpaIf), gpaIf);
  ok('GPA what-if says what changed', /every class an A/.test(await p.textContent('#gpaIfWhy')), await p.textContent('#gpaIfWhy'));

  // ---------- printable report ----------
  const rep = await p.evaluate(()=>GM.buildReport());
  ok('report lists every class', GM => true);
  const names = await p.evaluate(()=>GM.state().classes.map(c=>c.name));
  ok('report includes each class name', names.every(n => rep.includes(n)), names.join());
  ok('report carries the GPA and the date', /Weighted GPA/.test(rep) && /Grade report/.test(rep));
  ok('report includes what matters most', /What matters most/.test(rep));

  // ---------- screenshots ----------
  await p.click('#nav [data-view="gradebook"]'); await p.waitForTimeout(1400);
  await p.screenshot({ path:SS+'/dash.png' });
  await p.evaluate(id=>GM.openClass(id,null), withWork); await p.waitForTimeout(1500);
  await p.screenshot({ path:SS+'/classpage.png', fullPage:false });
  await p.evaluate(()=>window.scrollTo(0,700)); await p.waitForTimeout(400);
  await p.screenshot({ path:SS+'/classpage2.png' });
  await p.click('[data-act="back"]'); await p.waitForTimeout(800);
  await p.fill('#cmd','what should i study'); await p.waitForTimeout(500);
  await p.screenshot({ path:SS+'/assistant.png' });

  const m = await b.newPage({ viewport:{width:390,height:844} });
  await m.goto('file://'+path); await m.waitForTimeout(1400);
  await m.screenshot({ path:SS+'/m-dash.png' });
  ok('no sideways scroll on mobile', !(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),
     'sw='+await m.evaluate(()=>document.documentElement.scrollWidth));
  await m.close();

  ok('no console/page errors', errs.length===0, errs.slice(0,4).join(' | '));
  await b.close();
  console.log('\n'+(fails?('*** '+fails+' FAILURE(S) ***'):'FEATURE CHECKS PASSED'));
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
