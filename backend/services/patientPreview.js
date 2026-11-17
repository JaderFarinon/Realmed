const { serialize } = require('./evaluationValidation');
const { localStart } = require('./physiotherapyRotation');
const evaluationFields = [
  'evaluation_date', 'responsible_name', 'responsible_crefito', 'chief_complaint',
  'functional_limitations', 'physical_exam', 'pain_score', 'pain_location',
  'therapeutic_goals', 'conducts', 'other_conduct', 'conduct_description',
  'precautions', 'other_precaution', 'specific_care_notes', 'medical_diagnosis',
  'referral_professional', 'referral_date', 'reevaluation_date', 'reevaluation_notes',
  'regions', 'other_region', 'body_marks',
];
const fail = (message, status) => Object.assign(new Error(message), { status });
function evaluationForPatient(row) {
  if (row?.status !== 'COMPLETED') return null;
  const record = serialize(row);
  return Object.fromEntries(evaluationFields.map(key => [key, record[key] ?? null]));
}
function clockParts(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}
function appointmentForPatient(row, now) {
  const start = localStart(row.start_at);
  if (!start) return null;
  const clock = clockParts(now);
  return {
    date: start.date, time: `${String(Math.floor(start.minute / 60)).padStart(2, '0')}:${String(start.minute % 60).padStart(2, '0')}`,
    status: row.status, type: row.is_evaluation ? 'Avaliação' : row.is_physiotherapy || row.is_session ? 'Fisioterapia' : 'Atendimento',
    schedule: row.schedule_name,
    upcoming: start.date > clock.date || (start.date === clock.date && start.minute >= clock.minute),
  };
}
async function readPatientPreview(db, input, { now = Date.now(), branchId = process.env.STENCI_BRANCH_ID, patientId } = {}) {
  const processId = Number(input);
  if (!Number.isSafeInteger(processId) || processId < 1) throw fail('Tratamento inválido.', 400);
  // One consistent database snapshot. This preview never reads external APIs or acquires edit locks.
  return db.transaction(async trx => {
    const process = await trx('guide_processes as g').join('patients as p', 'p.id', 'g.patient_id')
      .leftJoin('patient_insurances as pi', 'pi.id', 'g.patient_insurance_id')
      .leftJoin('insurance_providers as insurer', 'insurer.id', 'pi.insurance_provider_id')
      .leftJoin('professionals as physio', 'physio.id', 'g.physiotherapist_id')
      .where('g.id', processId).whereNull('g.deleted_at')
      .modify(query => { if (patientId !== undefined) query.where('g.patient_id', patientId); })
      .first('g.id', 'g.patient_id', 'g.treatment_root_id', 'g.guide_number', 'g.continuation_of_id', 'g.assessment_date', 'g.requested_sessions', 'g.authorized_sessions', 'g.performed_sessions', 'g.treatment_status', 'p.full_name', 'p.external_source', 'p.external_id', 'insurer.name as insurance_name', 'physio.full_name as physiotherapist_name');
    if (!process) throw fail('Tratamento não encontrado.', 404);
    const evaluation = await trx('physiotherapy_evaluations').where({ guide_process_id: processId, status: 'COMPLETED' }).first();
    const linked = process.external_source === 'STENCI' && Boolean(process.external_id && branchId);
    let appointments = [], coverage = null;
    if (linked) {
      appointments = await trx('billing_stenci_appointments')
        .where({ branch_id: branchId, patient_external_id: process.external_id })
        .select('service_date', 'start_at', 'status', 'schedule_name', 'is_evaluation', 'is_physiotherapy', 'is_session')
        .orderBy('service_date', 'desc').orderBy('start_at', 'desc').limit(501);
      coverage = await trx('billing_collection_days').where({ branch_id: branchId }).whereNotNull('last_success_at')
        .min('service_date as from').max('service_date as to').max('last_success_at as updatedAt').first();
    }
    const mapped = appointments.map(row => appointmentForPatient(row, now)).filter(Boolean);
    const key = item => `${item.date}T${item.time}`;
    const upcoming = mapped.filter(item => item.upcoming).sort((a, b) => key(a).localeCompare(key(b)));
    const history = mapped.filter(item => !item.upcoming).sort((a, b) => key(b).localeCompare(key(a)));
    const dateOnly = value => !value ? null : value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
    return {
      preview: true, serverNow: new Date(now).toISOString(), patient: { name: process.full_name },
      treatment: {
        id: process.id, rootId: process.treatment_root_id || process.id, guideNumber: process.guide_number || 1,
        continuation: Boolean(process.continuation_of_id), assessmentDate: dateOnly(process.assessment_date),
        insurance: process.insurance_name || null, physiotherapist: process.physiotherapist_name || null,
        requested: process.requested_sessions, authorized: process.authorized_sessions, performed: process.performed_sessions ?? 0,
        status: process.treatment_status,
      },
      evaluation: evaluationForPatient(evaluation),
      agenda: { linked, upcoming: upcoming.slice(0, 20), history: history.slice(0, 20), limited: appointments.length > 500 || upcoming.length > 20 || history.length > 20,
        coverage: coverage?.from ? { from: dateOnly(coverage.from), to: dateOnly(coverage.to), updatedAt: coverage.updatedAt } : null },
      capabilities: { evolutions: false, dischargeReport: false, publicAccess: false, booking: false },
    };
  });
}
module.exports = { readPatientPreview, evaluationForPatient, appointmentForPatient };
