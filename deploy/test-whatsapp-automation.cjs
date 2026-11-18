// Disposable local MySQL database. No production rows, accounts or external calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),http=require('node:http'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..'),dep=name=>require(path.join(root,'backend/node_modules',name))
;(async()=>{
  const env=dep('dotenv').parse(fs.readFileSync(path.join(root,'backend/.env')))
  const connection={host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS}
  assert.ok(['localhost','127.0.0.1','::1'].includes(connection.host))
  const database='realmed_whatsapp_verify_'+Date.now()+'_'+crypto.randomBytes(3).toString('hex')
  const admin=await dep('mysql2/promise').createConnection(connection);let db,created=false,webhookServer
  try{
    await admin.query('CREATE DATABASE ??',[database]);created=true
    db=dep('knex')({client:'mysql2',connection:{...connection,database}})
    await db.schema.createTable('users',t=>{t.increments('id');t.string('role');t.string('status')})
    await db.schema.createTable('patients',t=>{t.increments('id');t.string('external_source');t.string('external_id');t.string('phone');t.date('birth_date');t.string('gender')})
    await db.schema.createTable('billing_collection_days',t=>{t.string('branch_id');t.date('service_date');t.string('status');t.dateTime('last_success_at')})
    await db.schema.createTable('billing_stenci_appointments',t=>{
      t.string('branch_id');t.string('external_id');t.date('service_date');t.string('schedule_id');t.string('schedule_name');t.string('patient_external_id');t.string('patient_name');t.string('start_at');t.string('status');t.boolean('is_session');t.boolean('is_evaluation');t.boolean('is_physiotherapy');t.json('schedule_memberships');t.json('expenses');t.json('patient_demographics')
    })
    await require(path.join(root,'backend/migrations/20261117000001_whatsapp_automation')).up(db)
    const branch='branch-test',days=['2026-11-15','2026-11-16','2026-11-17'],coverageDays=[...days,'2026-11-18']
    await db('billing_collection_days').insert(coverageDays.map(service_date=>({branch_id:branch,service_date,status:'COMPLETE',last_success_at:'2026-11-17 12:00:00'})))
    await db('patients').insert([{external_source:'STENCI',external_id:'patient-absence',phone:'41999990001'},{external_source:'STENCI',external_id:'patient-survey',phone:'41999990002'}])
    const membership=JSON.stringify([{id:'schedule-1',name:'Fisioterapia',place_name:'Matriz'}])
    await db('billing_stenci_appointments').insert([
      ...days.map((service_date,index)=>({branch_id:branch,external_id:'miss-'+index,service_date,schedule_id:'schedule-1',schedule_name:'Fisioterapia',patient_external_id:'patient-absence',patient_name:'Paciente Faltas',start_at:service_date+'T09:00:00',status:'missed',is_session:true,is_evaluation:false,is_physiotherapy:true,schedule_memberships:membership,expenses:'[]'})),
      {branch_id:branch,external_id:'finished-10',service_date:'2026-11-17',schedule_id:'schedule-1',schedule_name:'Fisioterapia',patient_external_id:'patient-survey',patient_name:'Paciente Pesquisa',start_at:'2026-11-17T10:00:00',status:'finished',is_session:true,is_evaluation:false,is_physiotherapy:true,schedule_memberships:membership,expenses:'[]',bundle_current:10,bundle_total:10},
      {branch_id:branch,external_id:'confirmed-1',service_date:'2026-11-17',schedule_id:'schedule-1',schedule_name:'Fisioterapia',patient_external_id:'patient-survey',patient_name:'Paciente Pesquisa',start_at:'2026-11-17T14:00:00',status:'confirmed',is_session:true,is_evaluation:false,is_physiotherapy:true,schedule_memberships:membership,expenses:'[]'},
      {branch_id:branch,external_id:'scheduled-1',service_date:'2026-11-18',schedule_id:'schedule-1',schedule_name:'Fisioterapia',patient_external_id:'patient-survey',patient_name:'Paciente Pesquisa',start_at:'2026-11-18T14:00:00',status:'scheduled',is_session:true,is_evaluation:false,is_physiotherapy:true,schedule_memberships:membership,expenses:'[]'},
    ])
    const service=require(path.join(root,'backend/services/whatsappAutomation'))
    const absence=await service.createAbsenceBatch(db,branch,{date:'2026-11-17',historyStart:'2026-11-15',minimumMisses:3})
    assert.equal(absence.contactable_total,1)
    const [absenceCase]=await service.listAbsenceCases(db,absence.id,branch);assert.equal(absenceCase.totalMisses,3);await assert.rejects(()=>service.listAbsenceCases(db,absence.id,'another-branch'),error=>error.code==='ABSENCE_BATCH_NOT_FOUND')
    await assert.rejects(()=>service.recordAbsenceResponse(db,absenceCase.caseToken,{choice:'STOP_TREATMENT',externalEventId:'wrong-branch-event'},'another-branch'),error=>error.code==='ABSENCE_CASE_NOT_FOUND');const first=await service.recordAbsenceResponse(db,absenceCase.caseToken,{choice:'STOP_TREATMENT',externalEventId:'meta-response-1',text:'Deseja encerrar'},branch)
    assert.equal(first.billingStatus,'PENDING')
    const repeated=await service.recordAbsenceResponse(db,absenceCase.caseToken,{choice:'STOP_TREATMENT',externalEventId:'meta-response-1',text:'Repetição técnica'},branch)
    assert.equal(repeated.repeated,true);assert.equal(Number((await db('whatsapp_absence_responses').count({n:'*'}).first()).n),1)
    await service.recordAbsenceResponse(db,absenceCase.caseToken,{choice:'CONTINUE_TREATMENT',externalEventId:'meta-response-2',text:'Vai retomar'},branch);const resumption=await service.getResumptionContext(db,absenceCase.caseToken,branch);assert.equal(resumption.missingCount,3);assert.equal(resumption.futureAppointments.length,0);assert.ok(resumption.usualDays.length>=0);await assert.rejects(()=>service.getResumptionContext(db,absenceCase.caseToken,'another-branch'),error=>error.code==='ABSENCE_CASE_NOT_FOUND')
    const fakeStenci={patient:async()=>({planId:'plan-1'}),availability:async(dates,schedules)=>[{date:dates[0],scheduleId:schedules[0],items:[{status:'available',occupied:false,isSlot:false,startDate:dates[0]+'T09:00:00',endDate:dates[0]+'T09:01:00',planIds:['plan-1'],professionals:[{id:'professional-1',name:'Fisio de teste'}]}]}]};const available=await service.resumptionAvailability(db,fakeStenci,absenceCase.caseToken,{weekdays:['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'],preferredTime:'09:00',horizonDays:14},branch);assert.ok(available.exactMatches.length)
    const completion=await service.createCompletionBatch(db,branch,{date:'2026-11-17'});assert.equal(completion.contactable_total,1)
    const [surveyCase]=await service.listCompletionCases(db,completion.id,branch);assert.equal(surveyCase.current,10);assert.equal(surveyCase.total,10);await assert.rejects(()=>service.listCompletionCases(db,completion.id,'another-branch'),error=>error.code==='COMPLETION_BATCH_NOT_FOUND')
    await assert.rejects(()=>service.recordSurveyResponse(db,surveyCase.caseToken,{structureRating:5,serviceRating:4,professionalsRating:5,overallRating:5,wouldRecommend:true,externalEventId:'wrong-branch-survey'},'another-branch'),error=>error.code==='COMPLETION_CASE_NOT_FOUND');await service.recordSurveyResponse(db,surveyCase.caseToken,{structureRating:5,serviceRating:4,professionalsRating:5,overallRating:5,wouldRecommend:true,comment:'Teste',externalEventId:'meta-survey-1'},branch)
    assert.equal((await db('whatsapp_completion_cases').where({case_token:surveyCase.caseToken}).first()).response_status,'COMPLETED')
    const scheduled=await service.listAppointmentsByStatus(db,branch,'scheduled',{from:'2026-11-17',days:2}),confirmed=await service.listAppointmentsByStatus(db,branch,'confirmed',{from:'2026-11-17',days:2});assert.equal(scheduled.items.length,1);assert.equal(confirmed.items.length,1);assert.equal(scheduled.coverage.complete,true)
    const event=service.normalizeEvent({type:'HOLIDAY',name:'Feriado de teste',startDate:'2026-12-25',endDate:'2026-12-25',status:'ACTIVE'})
    const [eventId]=await db('whatsapp_events').insert({...event,branch_id:branch});assert.ok(eventId)
    const campaign=service.normalizeEvent({type:'CAMPAIGN',name:'Campanha de teste',startDate:'2026-11-15',endDate:'2026-11-17',message:'Mensagem',sendAt:'2026-11-17T08:00',sendDeadlineAt:'2026-11-17T18:00',audience:{patientStatus:'ABSENT',gender:'ALL'}})
    const [campaignId]=await db('whatsapp_events').insert({...campaign,branch_id:branch});const preview=await service.campaignPreview(db,{id:campaignId,revision:1,branch_id:branch,...campaign});assert.equal(preview.total,1)
    const approved=await service.approveCampaign(db,campaignId,1,null,branch);assert.equal(approved.recipients,1);assert.equal((await service.getCampaignRecipients(db,campaignId,1,branch)).items.length,1);await assert.rejects(()=>service.getCampaignRecipients(db,campaignId,1,'another-branch'),error=>error.code==='CAMPAIGN_NOT_FOUND')
    const received=[];webhookServer=http.createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{received.push({body,signature:req.headers['x-realmed-signature']});res.writeHead(204);res.end()})});await new Promise(resolve=>webhookServer.listen(0,'127.0.0.1',resolve))
    process.env.NODE_ENV='test';process.env.WHATSAPP_CHATBOT_WEBHOOK_URL=`http://127.0.0.1:${webhookServer.address().port}/campaign`;process.env.WHATSAPP_CHATBOT_WEBHOOK_SECRET='webhook-test-secret'
    const campaignWorker=require(path.join(root,'backend/services/whatsappCampaignWorker')),deliveries=await Promise.allSettled([campaignWorker.notifyCampaign(db,campaignId,new Date('2026-11-17T12:00:00-03:00'),branch),campaignWorker.notifyCampaign(db,campaignId,new Date('2026-11-17T12:00:00-03:00'),branch)]);assert.ok(deliveries.some(item=>item.status==='fulfilled'));assert.equal(received.length,1);assert.match(received[0].signature,/^sha256=[a-f0-9]{64}$/);assert.equal((await db('whatsapp_events').where({id:campaignId}).first()).webhook_status,'DELIVERED')
    const writes=require(path.join(root,'backend/services/whatsappAppointmentWrites'));let executions=0;const writeArgs={db,branchId:branch,operationKey:'write-test-001',kind:'SCHEDULE_BLOCK',input:{destination:{scheduleId:'schedule-1',startDate:'2026-11-18T09:00'}},targetKey:`${branch}:schedule-1:2026-11-18T09:00`,executor:async()=>{executions++;return{appointmentId:'blocked-test',status:'blocked'}}};const writeFirst=await writes.execute(writeArgs),writeRepeated=await writes.execute(writeArgs);assert.equal(writeFirst.status,'SUCCEEDED');assert.equal(writeRepeated.repeated,true);const otherBranchWrite=await writes.execute({...writeArgs,branchId:'another-branch',input:{destination:{scheduleId:'schedule-2',startDate:'2026-11-18T10:00'}},targetKey:'another-branch:schedule-2:2026-11-18T10:00'});assert.equal(otherBranchWrite.status,'SUCCEEDED');assert.equal(executions,2);assert.equal(Number((await db('whatsapp_stenci_slot_locks').count({n:'*'}).first()).n),0)
    assert.equal(Number((await db('whatsapp_automation_audit').count({n:'*'}).first()).n),9)
    console.log('PASS WhatsApp automation/MySQL: migration, branch isolation, absence parameter, resumption availability, idempotent Stenci operation/slot lock, billing follow-up, explicit 10/10 completion, survey, campaign freeze and concurrent signed webhook. Disposable data only.')
  }finally{
    if(webhookServer)await new Promise(resolve=>webhookServer.close(resolve))
    if(db)await db.destroy()
    if(created)await admin.query('DROP DATABASE ??',[database])
    await admin.end()
  }
})().catch(error=>{console.error(error);process.exitCode=1})
