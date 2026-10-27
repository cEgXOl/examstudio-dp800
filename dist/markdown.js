(function(root){
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function safeURL(value,image=false){
  const url=String(value||'').replace(/[\u0000-\u001f\u007f-\u009f]/g,'').trim();
  if(!url)return null;
  if(/^https?:/i.test(url)||(!image&&/^mailto:/i.test(url)))return url;
  if(!url.startsWith('//')&&!/[:\\&<>"'`]/.test(url)&&/^[#/.\w~-]/.test(url))return url;
  return null;
 }
 const renderer=new root.marked.Renderer();
 // Raw HTML stays visible as text. Markdown never executes embedded HTML.
 renderer.html=({text})=>escape(text);
 renderer.link=function({href,title,tokens}){
  const text=this.parser.parseInline(tokens),url=safeURL(href);
  return url?`<a href="${escape(url)}"${title?` title="${escape(title)}"`:''} target="_blank" rel="noopener noreferrer">${text}</a>`:text;
 };
 renderer.image=({href,title,text})=>{
  const url=safeURL(href,true);
  return url?`<img src="${escape(url)}" alt="${escape(text)}"${title?` title="${escape(title)}"`:''} loading="lazy">`:escape(text);
 };
 const parser=new root.marked.Marked({gfm:true,breaks:true,async:false,renderer});
 function render(text){
  try{return '<div class="markdown-body">'+parser.parse(String(text??''))+'</div>';}
  catch{return '<div class="prose">'+escape(text)+'</div>';}
 }
 function template(text,slot){
  const r=Object.assign(new root.marked.Renderer(),renderer);
  const insert=s=>escape(s).replace(/\{\{(\d+)\}\}/g,(_,n)=>slot(Number(n)));
  r.code=({text,lang})=>`<pre><code${lang?` class="language-${escape(lang.split(/\s/)[0])}"`:''}>${insert(text)}\n</code></pre>`;
  r.codespan=({text})=>`<code>${insert(text)}</code>`;
  const p=new root.marked.Marked({gfm:true,breaks:true,async:false,renderer:r,extensions:[{
   name:'examSlot',level:'inline',start:src=>src.indexOf('{{'),
   tokenizer(src){const m=/^\{\{(\d+)\}\}/.exec(src);if(m)return {type:'examSlot',raw:m[0],index:Number(m[1])};},
   renderer:token=>slot(token.index)
  }]});
  return '<div class="markdown-body">'+p.parse(String(text??''))+'</div>';
 }
 function label(text){
  function read(t){if(t.type==='table')return [...t.header,...t.rows.flat()].map(read).join(' ');if(t.items)return t.items.map(read).join(' ');if(t.tokens)return t.tokens.map(read).join('');return t.text||'';}
  return parser.lexer(String(text??'')).map(read).join(' ').replace(/\s+/g,' ').trim();
 }
 const api={render,safeURL,template,label};root.ExamMarkdown=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
