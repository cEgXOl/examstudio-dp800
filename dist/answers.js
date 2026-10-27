(function(root){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const enabled=q=>q.answerMarkdown??q.body.some(p=>p.kind==='markdown');
 const render=(q,text)=>enabled(q)?ExamMarkdown.render(text):esc(text);
 function template(q,slot){
  if(!enabled(q))return esc(q.template).replace(/\{\{(\d+)\}\}/g,(_,n)=>slot(Number(n)));
  return ExamMarkdown.template(q.template,slot);
 }
 root.ExamAnswers={enabled,render,template};if(typeof module!=='undefined')module.exports=root.ExamAnswers;
})(globalThis);
