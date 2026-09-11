const { chromium } = require('playwright-core');
const path = require('path').join(__dirname,'..','index.html');
let fails = 0;
const ok = (n,c,x='') => { console.log((c?'  PASS  ':'  FAIL  ')+n+(c?'':'  <<< '+x)); if(!c) fails++; };
const cls = (assignments, cats) => ({ id:'t', name:'T', categories: cats || [
  { id:'at', name:'All Tasks / Assessments', weight:90 }, { id:'pp', name:'Practice / Preparation', weight:10 }],
  assignments });
const A = (id,catId,earned,possible,extra={}) => ({ id, catId, earned, possible,
  graded: earned !== null, included:true, name:'A'+id, date: 1756000000000 + (+id.replace(/\D/g,'')||0)*86400000, ...extra });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || require('playwright-core').chromium.executablePath(), args:['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => { console.log('PAGEERR', e.message); fails++; });
  await p.goto('file://'+path); await p.waitForTimeout(400);
  const run = (fn, arg) => p.evaluate(fn, arg);

  // ---- remaining / projections ----
  const r1 = await run(c => { const x = GM.classRemaining(c);
    return { total:x.total, count:x.count, best:GM.projectAll(c,1).pct, worst:GM.projectAll(c,0).pct, now:GM.computeClass(c).pct };
  }, cls([ A('1','at',90,100), A('2','pp',10,10), A('3','at',null,100) ]));
  ok('remaining points counted', r1.total===100 && r1.count===1, JSON.stringify(r1));
  ok('now = 90% AT, 100% PP -> 91.0', r1.now.toFixed(2)==='91.00', r1.now);
  ok('best case fills ungraded at 100', r1.best.toFixed(2)==='95.50', r1.best);
  ok('worst case fills ungraded at 0', r1.worst.toFixed(2)==='50.50', r1.worst);
  ok('best >= now >= worst', r1.best>=r1.now && r1.now>=r1.worst);

  // ---- a locked class: nothing ungraded can change the letter ----
  const lock = await run(c => { const a = GM.analyze(c); return { st:a.status, bl:a.bestL, wl:a.worstL, opp:a.opp }; },
    cls([ A('1','at',95,100), A('2','at',null,2) ]));
  ok('tiny remaining work -> locked', lock.st==='locked' && lock.bl===lock.wl, JSON.stringify(lock));
  ok('locked class scores almost no opportunity', lock.opp<=5, JSON.stringify(lock));

  // ---- close to the next letter ----
  const close = await run(c => { const a = GM.analyze(c);
    return { st:a.status, toNext:a.toNext, nextL:a.nextL, reach:a.canReachNext, opp:a.opp, band:a.oppBand,
             keys:a.insights.map(i=>i.key) }; },
    cls([ A('1','at',88,100), A('2','pp',10,10), A('3','at',null,60) ]));
  ok('88.2% with work left -> close', close.st==='close', JSON.stringify(close));
  ok('distance to an A is reported', Math.abs(close.toNext-(89.5-89.2))<0.01 && close.nextL==='A', JSON.stringify(close));
  ok('next letter is reachable', close.reach===true);
  ok('close + reachable -> high opportunity', close.band==='high', JSON.stringify(close));
  ok('a "close" insight is produced', close.keys.includes('close'), JSON.stringify(close.keys));

  // ---- unreachable next letter ----
  const far = await run(c => { const a = GM.analyze(c);
    return { reach:a.canReachNext, best:a.best, opp:a.opp, kind:a.oppKind, keys:a.insights.map(i=>i.key) }; },
    cls([ A('1','at',70,100), A('2','at',null,5) ]));
  ok('unreachable next letter flagged', far.reach===false && far.kind!=='raise', JSON.stringify(far));
  ok('says what the ceiling actually is', far.keys.includes('unreachable')||far.keys.includes('locked'), JSON.stringify(far.keys));

  // ---- at risk: strong early, weak lately, lots still to come ----
  const risk = await run(c => { const a = GM.analyze(c);
    return { st:a.status, now:+a.r.pct.toFixed(2), recent:+a.recentAvg.toFixed(1), exp:+a.expected.toFixed(2),
             expL:a.expectedL, kind:a.oppKind, keys:a.insights.map(i=>i.key) }; },
    cls([ A('1','at',100,100), A('2','at',100,100), A('3','at',100,100), A('4','at',100,100),
          A('5','at',3,10), A('6','at',3,10), A('7','at',3,10), A('8','at',3,10), A('9','at',3,10),
          A('10','at',null,450) ]));
  ok('recent slump with work left -> at risk', risk.st==='risk', JSON.stringify(risk));
  ok('risk is judged on the recent trajectory, not a hypothetical zero',
     risk.recent < risk.now && risk.exp < risk.now, JSON.stringify(risk));
  ok('risk insight names the projected landing point', risk.keys.includes('risk'), JSON.stringify(risk.keys));
  ok('a class at risk is flagged worth protecting', risk.kind==='protect', JSON.stringify(risk));

  // ---- and a class that is NOT at risk is not alarmed ----
  const calm = await run(c => { const a = GM.analyze(c); return { st:a.status, keys:a.insights.map(i=>i.key) }; },
    cls([ A('1','at',92,100), A('2','at',93,100), A('3','at',null,100) ]));
  ok('steady scores with work left are not called at risk', calm.st!=='risk', JSON.stringify(calm));

  // ---- trend ----
  const down = await run(c => GM.trendOf(c), cls([A('1','at',100,100),A('2','at',100,100),A('3','at',95,100),A('4','at',60,100),A('5','at',55,100)]));
  ok('falling scores -> downward trend', down.dir==='down' && down.delta<0, JSON.stringify(down));
  const up = await run(c => GM.trendOf(c), cls([A('1','at',60,100),A('2','at',70,100),A('3','at',85,100),A('4','at',95,100),A('5','at',100,100)]));
  ok('rising scores -> upward trend', up.dir==='up' && up.delta>0, JSON.stringify(up));
  const few = await run(c => GM.trendOf(c), cls([A('1','at',90,100),A('2','at',80,100)]));
  ok('two points is not enough for a trend', few.enough===false, JSON.stringify(few));

  // ---- assignment impact ranking ----
  const imp = await run(c => GM.upcomingImpact(c).map(x => ({ n:x.a.name, swing:+x.swing.toFixed(3), gain:+x.gain.toFixed(3) })),
    cls([ A('1','at',90,100), A('2','at',null,100), A('3','pp',null,100), A('4','at',null,5) ]));
  ok('ungraded ranked by swing', imp.length===3 && imp[0].swing>=imp[1].swing && imp[1].swing>=imp[2].swing, JSON.stringify(imp));
  ok('a heavy AT beats an equal-size PP', imp[0].n==='A2', JSON.stringify(imp));
  ok('a 5-point item swings least', imp[2].n==='A4', JSON.stringify(imp));

  // ---- projectOne matches a real edit ----
  const one = await run(c => {
    const hi = GM.projectOne(c,'2',1);
    const manual = GM.computeClass({ categories:c.categories,
      assignments:c.assignments.map(x => x.id==='2' ? {...x, earned:100, graded:true} : x) }).pct;
    return { hi, manual };
  }, cls([ A('1','at',90,100), A('2','at',null,100) ]));
  ok('projectOne equals actually entering the score', Math.abs(one.hi-one.manual)<1e-9, JSON.stringify(one));

  // ---- no grades ----
  const none = await run(c => { const a = GM.analyze(c); return { st:a.status, n:a.insights.length }; }, cls([ A('1','at',null,100) ]));
  ok('no graded work -> unknown status', none.st==='unknown' && none.n>0, JSON.stringify(none));

  // ---- every insight carries a number ----
  const texts = await run(c => GM.analyze(c).insights.map(i=>i.text),
    cls([ A('1','at',88,100), A('2','pp',9,10), A('3','at',null,60), A('4','at',40,100,{missing:true}) ]));
  ok('insights are specific, not filler', texts.length>0 && texts.every(t => /\d/.test(t)), JSON.stringify(texts));

  // ---- ranking across classes prefers actionable over merely lowest ----
  const rank = await run(() => {
    GM.setState({ classes: [
      { id:'x', name:'Locked low', categories:[{id:'at',name:'AT',weight:100}],
        assignments:[{id:'1',catId:'at',earned:70,possible:100,graded:true,included:true,name:'a'}] },
      { id:'y', name:'Close to an A', categories:[{id:'at',name:'AT',weight:100}],
        assignments:[{id:'1',catId:'at',earned:88,possible:100,graded:true,included:true,name:'a'},
                     {id:'2',catId:'at',earned:null,possible:100,graded:false,included:true,name:'b'}] }
    ], active:'x' });
    return GM.analyzeAll().map(x => ({ n:x.c.name, opp:x.a.opp, pct:x.a.r.pct }));
  });
  ok('ranked by opportunity, not by lowest grade', rank[0].n==='Close to an A', JSON.stringify(rank));

  await b.close();
  console.log('\n'+(fails?('*** '+fails+' FAILURE(S) ***'):'ENGINE CHECKS PASSED'));
  process.exit(fails?1:0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
