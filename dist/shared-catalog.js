(function(root){
 'use strict';
 const BASE=ExamCatalog.BASE,clone=x=>JSON.parse(JSON.stringify(x));
 async function connect(storage,builtin,transport=fetch){
  const local=ExamCatalog.create(storage,builtin),endpoint='/.netlify/functions/exams';
  let exams=[],selected=local.selected();
  async function request(method,id,input){
   let r;try{r=await transport(endpoint+(id?'?id='+encodeURIComponent(id):''),{method,cache:'no-store',headers:{'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});}catch{throw Error('No hay conexión con la biblioteca compartida. Conserva tu borrador e inténtalo de nuevo.');}
   let data;try{data=await r.json();}catch{throw Error('La biblioteca compartida necesita las funciones de Netlify. Abre la web publicada; no sirve subir solo la carpeta de archivos estáticos.');}
   if(!r.ok)throw Error(data.error||'No se ha podido guardar el examen.');return data;
  }
  const api={BASE,shared:true,
   list:()=>clone(exams),get(id){const e=exams.find(e=>e.id===id);if(!e)throw Error('Este examen ya no existe. Actualiza la biblioteca.');return clone(e);},selected:()=>selected,
   select(id){api.get(id);selected=id;try{storage?.setItem('examstudio-shared-selected',id);}catch{}},
   async refresh(){const data=await request('GET');exams=data.exams.map(e=>({...e,builtin:false}));if(!exams.some(e=>e.id===selected))selected=exams[0]?.id??null;return api.list();},
   async add(bank){const id='exam-'+crypto.randomUUID();const e=await request('PUT',id,{bank:ExamCatalog.normalize(bank),revision:null});exams.push(e);api.select(id);return id;},
   async update(id,bank){const old=api.get(id);const e=await request('PUT',id,{bank:ExamCatalog.normalize(bank),revision:old.revision});exams=exams.map(x=>x.id===id?e:x);},
   async duplicate(id){const b=api.get(id).bank;b.meta.title+=' · copia';return api.add(b);},
   async remove(id){const e=api.get(id);await request('DELETE',id,{revision:e.revision});exams=exams.filter(x=>x.id!==id);if(selected===id)selected=exams[0]?.id??null;},
   export(id){return JSON.stringify({format:'examstudio-exam',version:1,bank:api.get(id).bank},null,2);},
   async import(text){if(text.length>5*1024*1024)throw Error('La copia supera 5 MB.');let d;try{d=JSON.parse(text);}catch{throw Error('No se ha podido leer la copia.');}if(d.format!=='examstudio-exam'||d.version!==1)throw Error('Selecciona una copia exportada desde ExamStudio.');return api.add(d.bank);},
   localCount:()=>local.list().filter(e=>!e.builtin&&!exams.some(x=>x.id===e.id)).length,
   async publishLocal(){let n=0;for(const e of local.list().filter(e=>!e.builtin)){if(exams.some(x=>x.id===e.id))continue;const saved=await request('PUT',e.id,{bank:ExamCatalog.normalize(e.bank),revision:null});exams.push(saved);n++;}return n;}
  };
  try{selected=storage?.getItem('examstudio-shared-selected')||selected;}catch{}
  await api.refresh();return api;
 }
 root.ExamSharedCatalog={connect};if(typeof module!=='undefined')module.exports={connect};
})(globalThis);
