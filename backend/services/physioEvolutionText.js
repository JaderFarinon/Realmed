const fields={arrival:'Condição na chegada e queixas',findings:'Achados físico-funcionais',procedures:'Condutas realizadas e parâmetros',response:'Resposta ao atendimento',events:'Intercorrências',guidance:'Orientações fornecidas',plan:'Plano para continuidade',comparison:'Comparação com a avaliação inicial',goals:'Objetivos alcançados e pendentes',limitations:'Limitações persistentes',outcome:'Desfecho do ciclo e encaminhamentos'};
const fail=message=>{throw Object.assign(new Error(message),{status:422,code:'PHYSIO_EVOLUTION_INVALID'})};
function normalizeAnswers(input,final=false){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Preencha o questionário da evolução.');
 const result={};
 for(const [key,label]of Object.entries(fields)){
  const value=input[key];if(value!=null&&typeof value!=='string')fail('Campo inválido: '+label);
  const text=String(value||'').trim();if(text.length>3000)fail(label+': limite de 3000 caracteres.');
  if((final||!['comparison','goals','limitations','outcome'].includes(key))&&!text)fail('Preencha: '+label+'.');
  result[key]=text;
 }
 for(const key of ['painBefore','painAfter']){
  const value=input[key];if(value==='not_assessed')result[key]=value;
  else if((typeof value==='number'||typeof value==='string')&&String(value).trim()!==''&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=10)result[key]=Number(value);
  else fail('Informe a dor de 0 a 10 ou selecione Não avaliada.');
 }
 return result;
}
function generateText(input,{date,progress}){
 const a=normalizeAnswers(input,Boolean(progress?.final));
 const lines=['EVOLUÇÃO FISIOTERAPÊUTICA',`Data do atendimento: ${date.split('-').reverse().join('/')}`];
 if(progress)lines.push(`Sessão ${progress.current}/${progress.total} — numeração da agenda Stenci.`);
 lines.push('',`${fields.arrival}: ${a.arrival}`,`Dor antes: ${a.painBefore==='not_assessed'?'não avaliada':a.painBefore+'/10'}. Dor após: ${a.painAfter==='not_assessed'?'não avaliada':a.painAfter+'/10'}.`);
 for(const key of ['findings','procedures','response','events','guidance','plan'])lines.push(`${fields[key]}: ${a[key]}`);
 if(progress?.final){lines.push('','REAVALIAÇÃO AO FINAL DAS SESSÕES PREVISTAS');for(const key of ['comparison','goals','limitations','outcome'])lines.push(`${fields[key]}: ${a[key]}`);}
 return lines.join('\n');
}
function signedText(text,professional,date){
 if(typeof text!=='string'||!text.trim()||text.length>26000)fail('Revise o texto da evolução (até 26000 caracteres).');
 if(!professional?.professional_name||!professional?.council_number||!professional?.state)fail('Complete o nome, CREFITO e UF do fisioterapeuta no cadastro.');
 return text.trim()+`\n\nFisioterapeuta responsável: ${professional.professional_name}\nCREFITO: ${professional.council_number} — ${professional.state}\nRegistro realizado pelo acesso individual no Realmed em ${date.split('-').reverse().join('/')}.`;
}
const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const toHtml=text=>text.split('\n').map(line=>`<p>${escape(line)||'<br>'}</p>`).join('');
module.exports={fields,normalizeAnswers,generateText,signedText,toHtml};
