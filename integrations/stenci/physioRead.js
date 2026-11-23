const { billingOptions } = require('./billingRead');
function physioOptions(input) {
  const { date, scheduleId } = billingOptions({ ...input, kind: 'calendar' });
  return { date, scheduleId };
}
function sessionProgress(bundle) {
  const current=bundle?.current,total=bundle?.total;
  return Number.isInteger(current)&&Number.isInteger(total)&&current>0&&total>0&&current<=total
    ? {current,total,final:current===total} : null;
}
function schedule(item) { return String(item?.scheduleId || item?.schedule?.id || ''); }
function patient(item) { return String(item?.patient?.id || ''); }
function appointment(item, progress = sessionProgress(item?.bundle)) {
  const text = value => typeof value === 'string' ? value : null;
  return {
    id: String(item.id), patient_id: patient(item), patient_name: text(item.patient?.name) || 'Paciente',
    patient_birth_date: text(item.patient?.birthDate), insurance_name: text(item.insurance?.name),
    startDate: text(item.startDate), endDate: text(item.endDate), status: text(item.status), session_progress: progress,
    expenses: (Array.isArray(item.expenses) ? item.expenses : []).map(expense => ({
      name: text(expense.expense?.name), code: text(expense.expense?.code), type: text(expense.expense?.type),
      quantity: Number.isFinite(Number(expense.quantity)) ? Number(expense.quantity) : null,
    })),
  };
}
// Read-only /v1/calendar contract observed in the supplied Stenci HAR.
async function physioRead(client, input) {
  const options = physioOptions(input);
  client.assertAuthenticated();
  const data = await client.request('/v1/calendar', { base: 'apiX', query: { type: 'elective', ...options } });
  if (!Array.isArray(data?.items) || data.hasMore) throw Object.assign(new Error('O Stenci retornou uma agenda incompleta. Tente atualizar novamente.'), { status: 502, code: 'PHYSIO_CALENDAR_INCOMPLETE' });
  // The attendance list supplies bundle.current/total (e.g. 10/10), as observed
  // in evolucao.har. Keep /calendar positions for grouping, including vacancies.
  const attendance = await client.request('/v1/calendar/attendances', {base:'apiX',query:options});
  if(!Array.isArray(attendance?.items)||attendance.hasMore)throw Object.assign(new Error('Não foi possível conferir as sessões da agenda.'),{status:502,code:'PHYSIO_CALENDAR_INCOMPLETE'});
  const attendanceItems=attendance.items.filter(item=>schedule(item)===options.scheduleId&&item?.id&&patient(item)&&typeof item.startDate==='string');
  const attendanceById=new Map(attendanceItems.map(item=>[String(item.id),item]));
  const appointments=new Map();
  for(const item of data.items.filter(item=>item?.id&&patient(item)&&!item.isSlot&&typeof item.startDate==='string')){
    const counter=attendanceById.get(String(item.id));
    const progress=counter&&patient(counter)===patient(item)?sessionProgress(item.bundle)||sessionProgress(counter.bundle):sessionProgress(item.bundle);
    appointments.set(String(item.id),appointment(item,progress));
  }
  // /calendar supplies the positions that delimit the sessions. The attendance
  // list is the complete patient source and may contain fit-ins beyond those
  // positions; add them without turning their times into new boundaries.
  for(const item of attendanceItems){
    const id=String(item.id),existing=appointments.get(id);
    if(existing){
      if(existing.patient_id===patient(item)&&!existing.session_progress)existing.session_progress=sessionProgress(item.bundle);
      continue;
    }
    appointments.set(id,appointment(item));
  }
  return {
    ...options,
    // Empty positions are needed to keep 13:00 / 13:02 in one session when 13:01 is vacant.
    slots: data.items.filter(item => typeof item.startDate === 'string').map(item => ({ startDate: item.startDate })),
    items: [...appointments.values()].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate))||a.id.localeCompare(b.id)),
  };
}
module.exports = { physioOptions, physioRead, sessionProgress };
