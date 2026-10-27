import Catalog from '../dist/catalog.js';
const BASE=Catalog.BASE, MAX=5*1024*1024;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export function createHandler(store,seed){
 async function read(key){
  const value=await store.getWithMetadata(key,{type:'json'});
  if(!value||value.etag)return value;
  // Netlify Dev omits the ETag from GET, but supplies it in the public list API.
  // Read between two equal versions so content and revision cannot be mismatched.
  for(let attempt=0;attempt<3;attempt++){
   const before=(await store.list({prefix:key})).blobs.find(b=>b.key===key)?.etag;
   const data=await store.getWithMetadata(key,{type:'json'});
   const after=(await store.list({prefix:key})).blobs.find(b=>b.key===key)?.etag;
   if(data&&before&&before===after)return {...data,etag:after};
  }
  throw Error('Could not obtain a stable storage revision');
 }
 return async request=>{
  try{
   const url=new URL(request.url),id=url.searchParams.get('id');
   if(id&&!/^(dp800-bateria4|exam-[a-zA-Z0-9-]{5,100})$/.test(id))return json({error:'Identificador de examen no válido.'},400);
   if(request.method==='GET'){
    const {blobs}=await store.list({prefix:'exams/'});
    const records=await Promise.all(blobs.map(async b=>{const v=await read(b.key);return v?{...v.data,revision:v.etag}:null;}));
    if(!records.some(r=>r?.id===BASE))records.push({id:BASE,bank:seed,revision:'seed'});
    return json({exams:records.filter(r=>r&&!r.deleted)});
   }
   if(request.method!=='PUT'&&request.method!=='DELETE')return json({error:'Método no permitido.'},405);
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)return json({error:'Utiliza el editor de esta web.'},403);
   if(!id)return json({error:'Falta el identificador del examen.'},400);
   if(Number(request.headers.get('content-length'))>MAX)return json({error:'El examen supera 5 MB.'},413);
   const text=await request.text();if(new TextEncoder().encode(text).length>MAX)return json({error:'El examen supera 5 MB.'},413);
   let input;try{input=JSON.parse(text);}catch{return json({error:'No se ha podido leer el examen.'},400);}
   const current=await read('exams/'+id);
   const expected=current?.etag??(id===BASE?'seed':null);
   if((input.revision??null)!==expected)return json({error:'Otra persona ha cambiado este examen. Tu borrador sigue abierto. Copia tus cambios y actualiza la biblioteca antes de volver a editar.'},409);
   if(request.method==='DELETE'&&!current&&id!==BASE)return json({error:'Este examen ya no existe.'},404);
   let bank=null;if(request.method==='PUT'){try{bank=Catalog.normalize(input.bank);}catch(e){return json({error:e.message},400);}}
   const record={id,bank,deleted:request.method==='DELETE',updatedAt:Date.now()};
   const result=await store.setJSON('exams/'+id,record,current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
   if(!result.modified)return json({error:'Otra persona acaba de guardar cambios. Tu borrador se conserva; actualiza la biblioteca antes de volver a editar.'},409);
   return json({...record,revision:result.etag});
  }catch(e){console.error('Shared library:',e.message);return json({error:'No se ha podido acceder a la biblioteca compartida. No se ha confirmado el guardado; conserva tu borrador y vuelve a intentarlo.'},503);}
 };
}
