const fail = message => Object.assign(new Error(message),{status:409});
function metadata(row) {
  if (!row?.metadata) return {};
  return typeof row.metadata==='string'?JSON.parse(row.metadata):row.metadata;
}
function assertScheduled(value) {
  if(value!==true) throw Object.assign(new Error('Marque “Agendei o paciente no Stenci” antes de confirmar.'),{status:422});
}
function previewFromHistory(row,token,userId) {
  const data=metadata(row);
  if(!row || Number(row.user_id)!==Number(userId) || !token || data.previewToken!==token || !data.candidate)
    throw fail('Esta indicação foi substituída ou pertence a outro usuário. Confira o histórico e consulte novamente.');
  return {...data,historyId:row.id};
}
function historyItem(row) {
  const data=metadata(row);
  return {id:row.id,created_at:row.created_at,user_name:row.user_name,
    action:row.action,professional_name:data.professionalName || data.candidate?.professional_name || row.professional_name || '—',
    schedule_name:data.scheduleName || data.candidate?.schedule_name || '—',
    sessions:data.sessions || data.candidate?.sessions || [],
    stenci_scheduled_confirmed:data.stenciScheduledConfirmed===true,
    label:row.action==='PHYSIOTHERAPY_ROTATION_CONFIRMED'?'Confirmado':data.candidate?'Sorteio consultado':'Consulta sem vagas'};
}
module.exports={assertScheduled,previewFromHistory,historyItem};
