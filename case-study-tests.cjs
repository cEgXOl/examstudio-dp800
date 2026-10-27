const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const S=require('./dist/case-study.js'),Catalog=require('./dist/catalog.js');
const bank=JSON.parse(fs.readFileSync(__dirname+'/dist/questions.json','utf8'));
const ids=[1,16,26,27,28,29,30,31,57,58,59,60,77,78,79,91,92];
const text=parts=>parts.map(p=>p.text).join('\n');
const content=parts=>text(parts).replace(/\[\[INTERACTION\]\]/g,'').replace(/\s/g,'').split('').sort().join('');
test('All 17 original case studies separate context from a visible question without losing content',()=>{
 for(const id of ids){const q=bank.questions.find(q=>q.id===id),s=S.split(q);assert(s.context.length,'No context '+id);assert(s.question.length,'No question '+id);assert(!/This is a case study/.test(text(s.question)),'Case intro visible '+id);assert.equal(content([...s.context,...s.question]),content(q.body),'Content lost '+id);}
});
test('DAB question stays visible; its configuration belongs to expandable context',()=>{
 const s=S.split(bank.questions[56]);assert(text(s.question).includes('You are evaluating the DAB configuration'));assert(text(s.context).includes('"entities"'));assert(!text(s.question).includes('Fabrikam has a single'));
});
test('Question-specific code and full task premises stay outside the collapsed case',()=>{
 for(const id of [27,28])assert(text(S.split(bank.questions[id-1]).question).includes('CREATE TABLE'));
 assert(text(S.split(bank.questions[59]).question).includes('You create an SDK-style SQL database project'));
 const q59=text(S.split(bank.questions[58]).question);assert(q59.includes('You need to recommend a solution'));assert(q59.includes('What should you include'));
 assert(!text(S.split(bank.questions[29]).question).includes('A. Create a clustered index'));
});
test('Ordinary questions, including long text, do not get an artificial case-study toggle',()=>{
 for(const q of bank.questions.filter(q=>!ids.includes(q.id)))assert.equal(S.split(q).context.length,0,'Unexpected case '+q.id);
 const q={body:[{kind:'text',text:'Texto extenso. '.repeat(500)}]};assert.equal(S.split(q).context.length,0);
});
test('Explicit personal case studies preserve separate Markdown question and context',()=>{
 const q={caseStudy:[{kind:'markdown',text:'## Contexto\n\n| A | B |\n|---|---|\n|1|2|'}],body:[{kind:'markdown',text:'¿Cuál es la respuesta?'}]};assert.deepEqual(S.split(q),{context:q.caseStudy,question:q.body});
});
test('Markdown Case Study / Question headings separate content; headings in fences are ignored',()=>{
 const q={body:[{kind:'markdown',text:'# Caso de estudio\nContexto\n\n## Pregunta\n¿Cuál?'}]};const s=S.split(q);assert(text(s.context).includes('Contexto'));assert(!text(s.question).includes('Contexto'));assert(text(s.question).includes('¿Cuál?'));
 assert.equal(S.split({body:[{kind:'markdown',text:'```\n# Case Study\n# Question\n```\nTexto'}]}).context.length,0);
});
test('Backup round-trip preserves personal case studies and rejects unsupported context formats',()=>{
 const memory=new Map(),lib=Catalog.create({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},bank),q={id:1,type:'single',body:[{kind:'text',text:'Pregunta'}],caseStudy:[{kind:'markdown',text:'**Caso**'}],solution:[{kind:'text',text:'Razón'}],options:[{id:'A',text:'A'},{id:'B',text:'B'}],correct:['A'],points:1};
 const id=lib.add({meta:{title:'Caso',minutes:120,passingScore:700},questions:[q]}),copy=lib.import(lib.export(id));assert.deepEqual(lib.get(copy).bank.questions[0].caseStudy,q.caseStudy);
 assert.throws(()=>lib.add({meta:{title:'Caso',minutes:120,passingScore:700},questions:[{...q,caseStudy:[{kind:'html',text:'<script>'}]}]}));
});
