const crypto=require('node:crypto');
const {serializePhysioStenci}=require('./physioStenciSession');
const {withTransientStenci}=require('./transientStenciService');
const {groupSessions,sessionAccess,serverNow}=require('./physioAgenda');
const StenciClient=require('../../integrations/stenci/StenciClient');
const StenciService=require('../../integrations/stenci/StenciService');
const {generateText,signedText}=require('./physioEvolutionText');
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
  if(!user)fail('O vÃ­nculo do fisioterapeuta nÃ£o estÃ¡ disponÃ­vel.','PHYSIO_ACCESS_UNAVAILABLE',403);
  const schedules=await db('physiotherapy_rotation_agendas').where({professional_id:professionalId}).select('schedule_id','schedule_name');
  return {user,schedules};
 }
 async function run({sid,userId,professionalId,date,appointmentId,action='read',body={}}){
  if(!['read','evaluation','preview'].includes(action))fail('O envio de evoluÃ§Ãµes ainda nÃ£o estÃ¡ disponÃ­vel.','PHYSIO_CLINICAL_CONTRACT_PENDING',409);
  return serializePhysioStenci(async()=>{
   const session=sessionStore.get(sid),credentials=sessionStore.getCredentials(sid);
   if(!session||session.mode!=='physio-shared'||Number(session.userId)!==Number(userId)||Number(session.professionalId)!==Number(professionalId)||!credentials)fail('Renove a conexÃ£o da agenda.','PHYSIO_SESSION_REQUIRED',428);
   const config=configFactory(),service=serviceFactory?serviceFactory(config):new StenciService(new StenciClient({config,deadlineAt:Date.now()+60000}));
   try{return await withTransientStenci(service,async()=>{
    const auth=await service.authenticateUser(credentials.username,credentials.password,crypto.randomUUID().replace(/-/g,''));
    if(String(auth.stenci_user_id)!==String(session.stenciUserId))fail('A conexÃ£o Stenci mudou. Renove o acesso.','PHYSIO_SESSION_REQUIRED',428);
    const {schedules}=await identity(userId,professionalId,session.adminPreview===true),snapshots=[];
    for(const schedule of schedules){const data=await service.physioRead({date,scheduleId:schedule.schedule_id});snapshots.push({scheduleId:schedule.schedule_id,scheduleName:schedule.schedule_name,slots:data.slots,items:data.items.map(item=>({...item,schedule_id:schedule.schedule_id,schedule_name:schedule.schedule_name}))});}
    const sessions=groupSessions(snapshots,date),window=sessions.find(s=>s.items.some(item=>item.id===appointmentId)),appointment=window?.items.find(item=>item.id===appointmentId);
    if(!appointment)fail('Agendamento nÃ£o encontrado nas suas agendas.','PHYSIO_APPOINTMENT_UNAVAILABLE',404);
    const assertCurrent=async()=>{
     if(sessionStore.get(sid)!==session && session.adminPreview)fail('Renove a conexão de visualização.','PHYSIO_SESSION_REQUIRED',428);
     if(sessionStore.get(sid)!==session)fail('A sessÃ£o terminou. Entre novamente.','AUTH_SESSION_EXPIRED',401);
     const fresh=await identity(userId,professionalId,session.adminPreview===true);
     if(!fresh.schedules.some(s=>s.schedule_id===appointment.schedule_id))fail('A agenda nÃ£o estÃ¡ mais vinculada ao fisioterapeuta.','PHYSIO_ACCESS_UNAVAILABLE',403);
     if(!session.adminPreview && sessionAccess(window,date,now())!=='current')fail('Este atendimento sÃ³ pode ser aberto durante o horÃ¡rio da sessÃ£o.','PHYSIO_OUTSIDE_SESSION');
     return fresh.user;
    };
    await assertCurrent();
    let result;
    if(action==='evaluation')result=body.processId?await readEvaluation(db,appointment.patient_id,body.processId):{options:await treatmentOptions(db,appointment.patient_id)};
    else if(action==='preview'){
     if(body.expectedProgress!==JSON.stringify(appointment.session_progress||null))fail('A numeraÃ§Ã£o da sessÃ£o mudou. Confira a agenda antes de gerar o texto.','PHYSIO_SESSION_PROGRESS_CHANGED');
     const text=generateText(body.answers,{date,progress:appointment.session_progress});
     result={text,progress:appointment.session_progress};
    }else result={progress:appointment.session_progress,appointmentStatus:appointment.status,writeEnabled:false};
    const currentUser=await assertCurrent();
    if(action==='preview')result.signedText=signedText(result.text,currentUser,date);
    return {...result,professional:{name:currentUser.professional_name,crefito:currentUser.council_number,state:currentUser.state},server_time:new Date(now()).toISOString()};
   });}finally{credentials.username='';credentials.password='';}
  });
 }
 return {run};
}
module.exports={createClinicalService};
