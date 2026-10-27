const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const C=require('./dist/core.js');
const {questions:qs,meta}=JSON.parse(fs.readFileSync(__dirname+'/dist/questions.json','utf8'));
test('Coverage: all 101 questions, sequential source IDs, 177 points, six interaction types',()=>{
 assert.deepEqual(qs.map(q=>q.id),Array.from({length:101},(_,i)=>i+1));
 assert.equal(qs.reduce((a,q)=>a+q.points,0),177);
 assert.equal(new Set(qs.map(q=>q.type)).size,6);
 for(const q of qs){
  assert(q.body.length);assert(q.solution.length);assert(q.pages[0]>=2&&q.pages[1]<=234);
  assert(!JSON.stringify(q).includes('MISSING'));
  if(q.options){assert.equal(q.options.length,new Set(q.options.map(o=>o.id)).size);assert(q.correct.every(id=>q.options.some(o=>o.id===id)));}
  if(q.pools)q.correct.forEach((id,i)=>assert(q.pools[i][id]!==undefined));
 }
});
test('All answer keys produce full credit; omitted answers produce zero',()=>{
 for(const q of qs){assert.equal(C.grade(q,q.correct).earned,q.points);assert.equal(C.grade(q,[]).earned,0);assert(C.complete(q,q.correct));assert(!C.complete(q,[]));}
});
test('Multiselect: exact set, order-independent; selecting all, too few or duplicates earns zero',()=>{
 for(const q of qs.filter(q=>q.type==='multiple')){
  assert.equal(C.grade(q,[...q.correct].reverse()).earned,1);
  assert.equal(C.grade(q,q.options.map(o=>o.id)).earned,0);
  assert.equal(C.grade(q,q.correct.slice(0,1)).earned,0);
  assert.equal(C.grade(q,[...q.correct,q.correct[0]]).earned,0);
 }
});
test('Partial credit applies to each fixed subpart; blank and incorrect subparts earn zero',()=>{
 for(const q of qs.filter(q=>q.pools)){
  const a=[...q.correct];a[0]=(a[0]+1)%q.pools[0].length;
  assert.equal(C.grade(q,a).earned,q.points-1);
  a[0]=null;assert.equal(C.grade(q,a).earned,q.points-1);assert(!C.complete(q,a));
 }
});
test('Randomization uses permutations without loss; fixed interaction pools remain untouched',()=>{
 const snapshot=JSON.stringify(qs),s=C.createSession(qs,{now:10});
 assert.deepEqual([...s.order].sort((a,b)=>a-b),qs.map(q=>q.id));
 assert.notDeepEqual(s.order,qs.map(q=>q.id));
 for(const q of qs.filter(q=>q.options))assert.deepEqual([...s.optionOrder[q.id]].sort(),q.options.map(o=>o.id).sort());
 assert.equal(JSON.stringify(qs),snapshot);
 assert.deepEqual(C.shuffle([1,2,3],()=>0),[2,3,1]);
});
test('Full exam scores 1000 and passes; empty exam scores zero and all questions can be retried',()=>{
 const s=C.createSession(qs,{mode:'normal'});
 assert.equal(C.results(s,qs).score,0);assert.equal(C.results(s,qs).missed.length,101);
 qs.forEach(q=>s.answers[q.id]=q.correct);
 const r=C.results(s,qs);assert.equal(r.score,1000);assert(r.passed);assert.equal(r.missed.length,0);
});
test('700 threshold uses unrounded ratio; reattempt has only missed questions, including partial and blank',()=>{
 const subset=qs.filter(q=>q.type==='single').slice(0,10),s=C.createSession(subset);
 subset.slice(0,7).forEach(q=>s.answers[q.id]=q.correct);
 const r=C.results(s,subset);assert.equal(r.score,700);assert(r.passed);
 delete s.answers[subset[6].id];assert(!C.results(s,subset).passed);
 const ids=C.results(s,subset).missed,retry=C.createSession(qs,{ids});
 assert.deepEqual([...retry.order].sort((a,b)=>a-b),[...ids].sort((a,b)=>a-b));assert(retry.isRetry);
 const partial=qs.find(q=>q.pools),p=C.createSession([partial]);p.answers[partial.id]=partial.correct.slice(0,1);
 assert.deepEqual(C.results(p,[partial]).missed,[partial.id]);
});
test('Optional timer: wall-clock 120 minutes, persisted across reload and delivered at deadline',()=>{
 const s=C.createSession(qs,{timed:true,now:1000});
 assert.equal(s.deadline,7201000);assert.equal(C.remaining(s,1000),7200000);
 const saved=JSON.parse(JSON.stringify(s));assert(C.validSession(saved,qs));
 assert.equal(C.remaining(saved,7201001),0);
 const finished=C.finish(saved,'timeout',9000000);assert.equal(finished.finishedAt,s.deadline);
 assert.equal(C.finish(finished,'submitted',10000000).finishedAt,s.deadline);
 assert.equal(C.remaining(C.createSession(qs,{timed:false}),9000000),null);
});
test('PDF contradictions follow the selected explanation-first policy',()=>{
 const q=qs.find(q=>q.id===16);assert.equal(q.pools[0][q.correct[0]],'WHERE EXISTS');assert(q.notes[0].includes('contradicción')||q.notes[0].includes('Contradicción'));
});
test('No question or option relies on an image; every solution image exists locally',()=>{
 for(const q of qs){assert(q.body.every(p=>p.kind!=='image'));for(const p of q.solution)if(p.kind==='image')assert(fs.existsSync(__dirname+'/dist/'+p.src));}
 assert.equal(meta.sourceSha256,'65a3e17ca6e82bb1e5dd7cac0c291cbfca84abd7e5ab5691bf1c741651a029b8');
});
