const { chromium } = require('playwright-core');
let fails=0;
const ok=(n,c,x='')=>{console.log((c?'  PASS  ':'  FAIL  ')+n+(c?'':'  <<< '+x));if(!c)fails++;};
const CASES = {
 'ungraded (no score lines)': `Sep
18
PP-Branches Worksheet due 9/18
Practice / Preparation | 12.00 points
Sep
19
AT-Test due 9/19
All Tasks / Assessments | 50.00 points
45
90%`,
 'Not Graded literal': `Oct
2
AT-Essay due 10/2
All Tasks / Assessments | 30.00 points
Not Graded`,
 'missing flag': `Oct
3
PP-Reading due 10/3
Practice / Preparation | 5.00 points
Missing
0
0%`,
 'score as x / y': `Oct
4
AT-Lab due 10/4
All Tasks / Assessments | 20.00 points
17 / 20
85%`,
 'extra credit 0 possible': `Oct
5
AT-Bonus due 10/5
All Tasks / Assessments | 0.00 points
5`,
 'no week headers at all': `Nov
1
AT-Quiz
All Tasks / Assessments | 10.00 points
9
90%
Nov
2
PP-HW
Practice / Preparation | 4.00 points
4
100%`,
 'short category names': `Nov
3
Quiz 2
All Tasks | 10.00 points
9
90%
Nov
4
Worksheet
Practice | 4.00 points
3
75%`,
 'decimal score + excused': `Nov
5
AT-Project due 11/5
All Tasks / Assessments | 60.00 points
54.75
91.25%
Nov
6
PP-Notes due 11/6
Practice / Preparation | 8.00 points
Excused`,
 'menus and junk around it': `Home Grades Attendance Calendar
Course: NSL Government (Smith, J)
Marking Period: Quarter 1
Grade: B 87.49%
Week 01 - 8/25/2026 through 8/29/2026  (1 items)
Aug
27
AT-Current Events due 8/27, deadline 8/28
All Tasks / Assessments | 8.00 points
8
100%`,
 'pts abbreviation': `Dec
1
AT-Final Project
All Tasks / Assessments | 100 pts
88
88%`
};
(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROME_PATH || require('playwright-core').chromium.executablePath(),args:['--no-sandbox']});
  const p=await b.newPage(); p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await p.goto('file://'+require('path').join(__dirname,'..','index.html'));
  for(const [n,t] of Object.entries(CASES)){
    const r = await p.evaluate(x=>GM.parseGradebook(x), t);
    console.log('\n== '+n+'  ('+r.items.length+' items'+(r.guess?', class guess: "'+r.guess+'"':'')+')');
    r.items.forEach(i=>console.log('   '+JSON.stringify({name:i.name.slice(0,34),cat:i.catName,e:i.earned,p:i.possible,g:i.graded,inc:i.included,miss:i.missing,exc:i.excused})));
  }
  // targeted assertions
  const a = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['ungraded (no score lines)']);
  ok('ungraded parsed but not graded', a.length===2 && a[0].graded===false && a[1].earned===45, JSON.stringify(a));
  const c = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['score as x / y']);
  ok('x / y score', c[0].earned===17 && c[0].possible===20, JSON.stringify(c));
  const d = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['extra credit 0 possible']);
  ok('extra credit', d[0].earned===5 && d[0].possible===0, JSON.stringify(d));
  const e = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['decimal score + excused']);
  ok('excused excluded', e.length===2 && e[1].excused===true && e[1].included===false, JSON.stringify(e));
  const f = await p.evaluate(t=>GM.parseGradebook(t), CASES['menus and junk around it']);
  ok('junk ignored, 1 item', f.items.length===1, JSON.stringify(f.items));
  const g = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['pts abbreviation']);
  ok('"pts" works', g.length===1 && g[0].possible===100, JSON.stringify(g));
  const h = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['missing flag']);
  ok('missing flagged with 0', h[0].missing===true && h[0].earned===0, JSON.stringify(h));
  const i = await p.evaluate(t=>GM.parseGradebook(t).items, CASES['Not Graded literal']);
  ok('"Not Graded" -> ungraded', i.length===1 && i[0].graded===false, JSON.stringify(i));
  // short names map onto the standard categories
  const j = await p.evaluate(t=>{ const cls={id:'z',name:'z',categories:[{id:'at',name:'All Tasks / Assessments',weight:90},{id:'pp',name:'Practice / Preparation',weight:10}],assignments:[]};
     const r=GM.parseGradebook(t); return r.items.map(x=>x.catName); }, CASES['short category names']);
  ok('short names captured', j.length===2, JSON.stringify(j));
  await b.close();
  console.log('\n'+(fails?'*** '+fails+' FAILURE(S) ***':'PARSER CHECKS PASSED'));
  process.exit(fails?1:0);
})();
