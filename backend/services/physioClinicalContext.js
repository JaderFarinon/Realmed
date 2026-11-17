const {serialize}=require('./evaluationValidation');
async function treatmentOptions(db,patientId){
 return db('guide_processes as g').join('patients as p','p.id','g.patient_id')
  .leftJoin('physiotherapy_evaluations as e','e.guide_process_id','g.id')
  .where({'p.external_source':'STENCI','p.external_id':patientId}).whereNull('g.deleted_at')
  .select('g.id','g.guide_number','g.treatment_root_id','g.continuation_of_id','g.created_at','g.assessment_date','g.medical_diagnosis','g.cid','g.treatment_status','e.status as evaluation_status','e.evaluation_date','e.responsible_name')
  .orderBy('g.created_at','desc').limit(100);
}
async function readEvaluation(db,patientId,processId){
 const options=await treatmentOptions(db,patientId);
 const process=options.find(item=>Number(item.id)===Number(processId));
 if(!process)throw Object.assign(new Error('Este tratamento não pertence ao paciente do agendamento.'),{status:404});
 const evaluation=await db('physiotherapy_evaluations').where({guide_process_id:process.id,status:'COMPLETED'}).first();
 return {process,evaluation:serialize(evaluation)};
}
module.exports={treatmentOptions,readEvaluation};
