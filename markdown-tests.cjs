const test=require('node:test'),assert=require('node:assert/strict');
globalThis.marked=require('./dist/vendor/marked.umd.js');
const M=require('./dist/markdown.js'),Catalog=require('./dist/catalog.js'),fs=require('node:fs');
test('Markdown renders tables, headings, lists, emphasis and fenced SQL code',()=>{
 const text='# Encabezado\n\n**Negrita** y *cursiva*.\n\n| Nombre | Tipo |\n| --- | --- |\n| Id | int |\n\n- Uno\n- Dos\n\n```sql\nSELECT * FROM dbo.Tabla;\n```';
 const html=M.render(text);for(const tag of ['<h1>','<strong>','<em>','<table>','<ul>','<pre>'])assert(html.includes(tag));assert(html.includes('language-sql'));assert(html.includes('<td>int</td>'));
});
test('Raw HTML is displayed as text; scripts, handlers and unsafe URLs are not executable markup',()=>{
 const html=M.render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1))\n\n![x](data:image/svg+xml;base64,AAA)');
 assert(!html.includes('<script'));assert(!html.includes('<img'));assert(!html.includes('href="javascript:'));assert(html.includes('&lt;script&gt;'));
 for(const url of ['javascript:alert(1)','java\nscript:alert(1)','vbscript:msgbox(1)','data:text/html,x','javascript&colon;alert(1)'])assert.equal(M.safeURL(url),null);
 assert(M.render('[web](https://example.com)').includes('rel="noopener noreferrer"'));
});
test('Inline code and code fences preserve literal tags and Markdown characters',()=>{
 const html=M.render('`<b>x</b>`\n\n```\n**literal**\n<script>x</script>\n```');assert(html.includes('&lt;b&gt;x&lt;/b&gt;'));assert(html.includes('**literal**'));assert(!html.includes('<script>'));
 assert(M.render('    SELECT 1;\n').includes('<pre><code>SELECT 1;'));
});
test('Markdown content survives exam backup export/import without changing its format or answer',()=>{
 const builtin=JSON.parse(fs.readFileSync(__dirname+'/dist/questions.json','utf8')),store=new Map(),lib=Catalog.create({getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},builtin);
 const id=lib.add({meta:{title:'Markdown',minutes:30,passingScore:700},questions:[{id:1,type:'single',body:[{kind:'markdown',text:'| A | B |\n|---|---|\n|1|2|'}],solution:[{kind:'markdown',text:'**Justificación**'}],options:[{id:'A',text:'Uno'},{id:'B',text:'Dos'}],correct:['A'],points:1}]});
 const copy=lib.import(lib.export(id)),q=lib.get(copy).bank.questions[0];assert.equal(q.body[0].kind,'markdown');assert.equal(q.solution[0].kind,'markdown');assert.deepEqual(q.correct,['A']);
});
