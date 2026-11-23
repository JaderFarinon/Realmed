const crypto=require('node:crypto');
const {serializePhysioStenci}=require('./physioStenciSession');
const {withTransientStenci}=require('./transientStenciService');
const {groupSessions,sessionAccess,serverNow}=require('./physioAgenda');
const StenciClient=require('../../integrations/stenci/StenciClient');
const StenciService=require('../../integrations/stenci/StenciService');
const {generateText,signedText,toHtml}=require('./physioEvolutionText');
const {seal,unseal}=require('./physioEvolutionSnapshot');
const {treatmentOptions,readEvaluation}=require('./physioClinicalContext');
const fail=(message,code='PHYSIO_CLINICAL_UNAVAILABLE',status=409)=>{throw Object.assign(new Error(message),{code,status})};

// Only confirmed read contracts and an in-memory text preview are enabled.
// Reopening an existing medical record is still missing from the supplied HAR.
function createClinicalService({db,sessionStore,configFactory=require('../../integrations/stenci/config').getStenciConfig,serviceFactory,now=serverNow}){
 async function identity(userId,professionalId,adminPreview=false){
  if(adminPreview)return require('./physioAdminPreview').previewIdentity(db,userId,professionalId);
  const user=await db('users as u').join('physiotherapist_user_links as l','l.user_id','u.id').join('professionals as p','p.id','l.professional_id')
   .where({'u.id':userId,'u.status':'active','u.role':'user','l.professional_id':professionalId,'p.active':1,'p.type':'PHYSIOTHERAPIST'}).whereRaw('UPPER(p.council) = ?',['CREFITO'])
   .first('u.id','p.full_name as professional_name','p.council_number','p.state');
  if(!user)fail('O vínculo do fisioterapeuta não está disponível.','PHYSIO_ACCESS_UNAVAILABLE',403);
  const schedules=await db('physiotherapy_rotation_agendas').where({professional_id:professionalId}).select('schedule_id','schedule_name');
  return {user,schedules};
 }
 async function run({sid,userId,professionalId,date,appointmentId,action='read',body={}}){
  if(!['read','evaluation','preview','finish'].includes(action))fail('Operação clínica indisponível.','PHYSIO_CLINICAL_CONTRACT_PENDING',409);
  return serializePhysioStenci(async()=>{
   const session=sessionStore.get(sid),credentials=sessionStore.getCredentials(sid);
   if(!session||session.mode!=='physio-shared'||Number(session.userId)!==Number(userId)||Number(session.professionalId)!==Number(professionalId)||!credentials)fail('Renove a conexão da agenda.','PHYSIO_SESSION_REQUIRED',428);
    const config=configFactory(),service=serviceFactory?serviceFactory(config):new StenciService(new StenciClient({config,deadlineAt:Date.now()+60000}));
   try{return await withTransientStenci(service,async()=>{
    const auth=await service.authenticateUser(credentials.username,credentials.password,crypto.randomUUID().replace(/-/g,''));
    if(String(auth.stenci_user_id)!==String(session.stenciUserId))fail('A conexão Stenci mudou. Renove o acesso.','PHYSIO_SESSION_REQUIRED',428);
    const {schedules}=await identity(userId,professionalId,session.adminPreview===true),snapshots=[];
    for(const schedule of schedules){const data=await service.physioRead({date,scheduleId:schedule.schedule_id});snapshots.push({scheduleId:schedule.schedule_id,scheduleName:schedule.schedule_name,slots:data.slots,items:data.items.map(item=>({...item,schedule_id:schedule.schedule_id,schedule_name:schedule.schedule_name}))});}
    const sessions=groupSessions(snapshots,date),window=sessions.find(s=>s.items.some(item=>item.id===appointmentId)),appointment=window?.items.find(item=>item.id===appointmentId);
    if(!appointment)fail('Agendamento não encontrado nas suas agendas.','PHYSIO_APPOINTMENT_UNAVAILABLE',404);
    const assertCurrent=async()=>{
     if(sessionStore.get(sid)!==session && session.adminPreview)fail('Renove a conexão de visualização.','PHYSIO_SESSION_REQUIRED',428);
     if(sessionStore.get(sid)!==session)fail('A sessão terminou. Entre novamente.','AUTH_SESSION_EXPIRED',401);
     const fresh=await identity(userId,professionalId,session.adminPreview===true);
     if(!fresh.schedules.some(s=>s.schedule_id===appointment.schedule_id))fail('A agenda não está mais vinculada ao fisioterapeuta.','PHYSIO_ACCESS_UNAVAILABLE',403);
     if(!session.adminPreview && sessionAccess(window,date,now())!=='current')fail('Este atendimento só pode ser aberto durante o horário da sessão.','PHYSIO_OUTSIDE_SESSION');
     return fresh.user;
    };
    await assertCurrent();
    let result;
    if(action==='evaluation')result=body.processId?await readEvaluation(db,appointment.patient_id,body.processId):{options:await treatmentOptions(db,appointment.patient_id)};
    else if(action==='preview'){
     if(body.expectedProgress!==JSON.stringify(appointment.session_progress||null))fail('A numeração da sessão mudou. Confira a agenda antes de gerar o texto.','PHYSIO_SESSION_PROGRESS_CHANGED');
     const text=generateText(body.answers,{date,progress:appointment.session_progress});
     result={text,progress:appointment.session_progress};
    }else if(action==='finish'){
     if(session.adminPreview)fail('A visualização administrativa não pode gravar evoluções.','PHYSIO_PREVIEW_READ_ONLY',403);
     if(body.expectedProgress!==JSON.stringify(appointment.session_progress||null))fail('A numeração da sessão mudou. Confira a agenda antes de finalizar.','PHYSIO_SESSION_PROGRESS_CHANGED');
     const currentUser=await assertCurrent(),finalText=signedText(body.text,currentUser,date),hash=crypto.createHash('sha256').update(finalText).digest('hex');
     const fullAppointment=await service.physioAppointment(appointmentId);
     if(String(fullAppointment.patient?.id)!==String(appointment.patient_id)||String(fullAppointment.schedule?.id)!==String(appointment.schedule_id))fail('O agendamento mudou no Stenci. Atualize a agenda antes de finalizar.','PHYSIO_APPOINTMENT_CHANGED');
     const branchId=String(config.branchId),base={
      appointmentId,patientId:String(appointment.patient_id),professionalId:String(session.stenciUserId),insuranceId:String(fullAppointment.insurance?.id||''),
      start:true,private:false,screeningId:'',insurancePlanId:'',tag:'',anthropometry:{cephalicPerimeter:'',abdominalCircumference:'',height:'',weight:''},
      vitalSigns:{bloodPressure:'',respiratoryFrequency:'',heartRate:'',temperature:'',saturation:''},reminder:{date:'',notes:''},cids:[],telemedicine:{active:false,meetingUrl:null}
     };
     let binding=await db.transaction(async trx=>{
      let row=await trx('physio_evolutions').where({branch_id:branchId,appointment_external_id:appointmentId}).forUpdate().first();
      if(row){
       if(row.state==='FINISHED'){
        if(row.content_hash!==hash)fail('Esta sessão já possui uma evolução finalizada. Consulte o histórico; o Stenci não permite editá-la.','PHYSIO_EVOLUTION_IMMUTABLE');
        return row;
       }
       if(row.state==='UNCERTAIN'||row.state==='CREATING'&&!row.stenci_record_id)fail('A criação anterior precisa ser conferida antes de uma nova tentativa. Nenhum outro prontuário será criado.','PHYSIO_EVOLUTION_UNCERTAIN');
       if(row.content_hash!==hash)fail('Existe uma evolução iniciada para esta sessão. Preserve o texto original e confira o Stenci.','PHYSIO_EVOLUTION_CONFLICT');
       return row;
      }
      const ids=await trx('physio_evolutions').insert({branch_id:branchId,appointment_external_id:appointmentId,patient_external_id:String(appointment.patient_id),schedule_external_id:String(appointment.schedule_id),professional_id:professionalId,created_by:userId,state:'CREATING',content_hash:hash,service_date:date,updated_at:trx.fn.now()});
      return trx('physio_evolutions').where({id:ids[0]}).first();
     });
     if(binding.state==='FINISHED')result={finished:true,recordId:binding.stenci_record_id,appointmentStatus:'finished',progress:appointment.session_progress};
     else{
      let recordId=binding.stenci_record_id,templateId=binding.stenci_template_id,remote;
      if(!recordId){
       const template=await service.physioDefaultTemplate();templateId=String(template.id);
       const startedAt=new Date(now()).toISOString();
       try{remote=await service.physioCreateRecord({...base,id:null,status:'pending',events:[],startDate:startedAt,endDate:'',anamnesis:{templateId,templateRenderer:null,inputs:{}}});}
       catch(error){await db('physio_evolutions').where({id:binding.id,state:'CREATING'}).update({state:'UNCERTAIN',updated_at:db.fn.now()});throw error;}
       recordId=String(remote.id);
       await db('physio_evolutions').where({id:binding.id,state:'CREATING'}).update({state:'PENDING',stenci_record_id:recordId,stenci_template_id:templateId,updated_at:db.fn.now()});
      }else remote=await service.physioReadRecord(recordId);
      if(remote.status==='finished'){
       const remoteHtml=Array.isArray(remote.anamnesis?.inputs)?remote.anamnesis.inputs.find(input=>input?.name==='content')?.value:remote.anamnesis?.inputs?.content;
       if(remoteHtml!==toHtml(finalText))fail('O prontuário já foi finalizado com outro conteúdo. Solicite conferência.','PHYSIO_EVOLUTION_CONFLICT');
      }else{
       if(remote.status!=='pending')fail('O prontuário Stenci não está disponível para finalização.','PHYSIO_EVOLUTION_CONFLICT');
       const startedAt=remote.startDate||new Date(now()).toISOString(),events=Array.isArray(remote.events)?remote.events:[];
       await assertCurrent();
       remote=await service.physioUpdateRecord(recordId,{...base,id:recordId,status:'pending',events,startDate:startedAt,endDate:'',anamnesis:{templateId,templateRenderer:null,inputs:{content:toHtml(finalText)}},telemedicine:{active:false,provider:null,roomId:null,meetingUrl:null,startedAt:null,consent:null}});
       await assertCurrent();
       remote=await service.physioUpdateRecord(recordId,{...base,id:recordId,status:'finished',events:Array.isArray(remote.events)?remote.events:events,startDate:remote.startDate||startedAt,endDate:new Date(now()).toISOString(),anamnesis:{templateId,templateRenderer:null,inputs:{content:toHtml(finalText)}},telemedicine:{active:false,provider:null,roomId:null,meetingUrl:null,startedAt:null,consent:null}});
       if(remote.status!=='finished')fail('O Stenci não confirmou a finalização.','PHYSIO_EVOLUTION_NOT_FINISHED');
      }
      const snapshot={text:finalText,progress:appointment.session_progress,professional:{name:currentUser.professional_name,crefito:currentUser.council_number,state:currentUser.state}};
      const envelope=seal(snapshot,{branch_id:branchId,patient_external_id:String(appointment.patient_id),stenci_record_id:recordId});
      await db('physio_evolutions').where({id:binding.id}).whereIn('state',['PENDING','CREATING']).update({state:'FINISHED',stenci_record_id:recordId,stenci_template_id:templateId,snapshot_envelope:envelope,finalized_at:db.fn.now(),updated_at:db.fn.now()});
      await assertCurrent();
      result={finished:true,recordId,appointmentStatus:'finished',progress:appointment.session_progress};
     }
    }else{
     const binding=await db('physio_evolutions').where({branch_id:String(config.branchId),appointment_external_id:appointmentId}).first();
     const snapshot=binding?.state==='FINISHED'&&binding.snapshot_envelope?unseal(binding.snapshot_envelope,binding):null;
     result={progress:appointment.session_progress,appointmentStatus:appointment.status,writeEnabled:!session.adminPreview,evolution:binding?{state:binding.state,recordId:binding.stenci_record_id,snapshot}:null};
    }
    const currentUser=await assertCurrent();
    if(action==='preview')result.signedText=signedText(result.text,currentUser,date);
    return {...result,professional:{name:currentUser.professional_name,crefito:currentUser.council_number,state:currentUser.state},server_time:new Date(now()).toISOString()};
   });}finally{credentials.username='';credentials.password='';}
  });
 }
 return {run};
}
module.exports={createClinicalService};
