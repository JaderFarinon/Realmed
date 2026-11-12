const crypto = require('node:crypto')
const express = require('express')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const auth = require('../middleware/auth')
const { knex } = require('./guide-center')
const { getStenciConfig } = require('../../integrations/stenci/config')
const StenciMapper = require('../../integrations/stenci/StenciMapper')
const { refreshStenci } = require('../services/stenciRefreshService')
const { stenciSessionStore } = require('../services/StenciSessionStore')
const { publicUser } = require('./auth')
const faceRecognition = require('../services/physiotherapistFaceRecognition')
const { period } = require('../services/billingDashboard')
const { createFacialLoginAttempts } = require('../services/facialLoginAttempts')
const { createPhysioSession, serializePhysioStenci } = require('../services/physioStenciSession')
const { memberships } = require('../services/billingAgendaFilters')
const { groupSessions, sessionAccess, serverNow } = require('../services/physioAgenda')

const challenges = new Map()
const router = express.Router()
// Desafio e tentativa de autenticação têm limites separados: cada leitura usa os dois endpoints.
const challengeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas leituras iniciadas. Aguarde até 1 minuto antes de tentar novamente.' },
})
const loginAttempts = createFacialLoginAttempts()

function issueChallenge(mode = 'passive') {
  const now = Date.now()
  for (const [key, value] of challenges) if (value.expiresAt <= now) challenges.delete(key)
  if (challenges.size >= 500) challenges.delete(challenges.keys().next().value)
  const id = crypto.randomBytes(24).toString('base64url')
  challenges.set(id, { expiresAt: now + 30_000, mode })
  return { id, expiresInSeconds: 30, instruction: mode === 'blink' ? 'blink' : 'look', capture: { frames: mode === 'blink' ? 16 : 6, width: 480, intervalMs: 120 } }
}
router.post('/auth/challenge', loginAttempts.check, challengeLimiter, (_req, res) => {
  res.set('Cache-Control', 'no-store').json(issueChallenge())
})

router.post('/auth/face', loginAttempts.attempt, async (req, res) => {
  const challenge = String(req.body?.challenge || '')
  const state = challenges.get(challenge)
  challenges.delete(challenge)
  if (!state || state.expiresAt <= Date.now()) return res.status(401).json({ error: 'A leitura expirou. Toque em Entrar e tente novamente.' })
  let sid
  let descriptors
  try {
    descriptors = await faceRecognition.authenticateFrames(req.body?.frames, { requireBlink: state.mode === 'blink' })
    const biometricRows = await knex('physiotherapist_face_biometrics as b')
      .join('users as u', 'u.id', 'b.user_id')
      .join('physiotherapist_user_links as l', 'l.user_id', 'u.id')
      .join('professionals as p', 'p.id', 'l.professional_id')
      .where({ 'u.status': 'active', 'u.role': 'user', 'p.active': 1, 'p.type': 'PHYSIOTHERAPIST' }).whereRaw('UPPER(p.council) = ?', ['CREFITO'])
      .select('b.user_id', 'b.encrypted_templates', 'b.iv', 'b.auth_tag')
    const userId = await faceRecognition.matchDescriptors(descriptors, biometricRows)
    if (!userId) return res.status(401).json({ error: 'Não reconheci um fisioterapeuta cadastrado. Tente novamente ou use o login do Realmed.' })
    const user = await knex('users as u').join('people as p', 'p.id', 'u.person_id')
      .join('physiotherapist_user_links as l', 'l.user_id', 'u.id')
      .join('professionals as pr', 'pr.id', 'l.professional_id')
      .where({ 'u.id': userId, 'u.status': 'active', 'u.role': 'user', 'pr.active': 1, 'pr.type': 'PHYSIOTHERAPIST' }).whereRaw('UPPER(pr.council) = ?', ['CREFITO'])
      .first('u.id', 'u.username', 'u.role', 'u.status', 'u.auth_provider', 'u.person_id', 'p.full_name', 'p.email', 'p.avatar_url', 'l.professional_id', 'pr.full_name as professional_name')
    if (!user) return res.status(401).json({ error: 'Este usuário não está ativo para o modo fisioterapeuta.' })

    if (!process.env.JWT_SECRET) return res.status(503).json({ error: 'Autenticação do Realmed não está configurada.' })
    const access=await createPhysioSession({userId:user.id,professionalId:user.professional_id,sessionStore:stenciSessionStore})
    sid=access.sid
    const developmentMode=access.developmentMode
    const token = jwt.sign({ ...publicUser(user), sid, physiotherapistId: user.professional_id }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_EXPIRES_IN || '2h' })
    if (!stenciSessionStore.limitExpiration(sid, jwt.decode(token).exp * 1000)) throw Object.assign(new Error('Não foi possível criar a sessão.'), { code: 'REALMED_SESSION_ERROR' })
    await knex('users').where({ id: user.id }).update({ last_login: knex.fn.now(), updated_at: knex.fn.now() })
    res.set('Cache-Control', 'no-store').json({ token, developmentMode, user: { ...publicUser(user), professionalId: user.professional_id, professionalName: user.professional_name } })
  } catch (error) {
    if (sid) stenciSessionStore.delete(sid)
    if (error.code === 'FACE_MOTION_REQUIRED') {
      res.locals.faceAdditionalCheck = true
      return res.status(401).set('Cache-Control', 'no-store').json({ error: error.message, code: error.code, challenge: issueChallenge('blink') })
    }
    if (error.code === 'BIOMETRY_KEY_REQUIRED') return res.status(503).json({ error: error.message, code: error.code })
    if (error.code === 'FACE_BUSY') return res.status(503).json({ error: error.message })
    if (error.code === 'STENCI_LOGOUT_FAILED') return res.status(502).json({ error: 'O Stenci não confirmou o encerramento da autenticação. Tente novamente.' })
    if (error.code === 'STENCI_INVALID_CREDENTIALS') return res.status(503).json({ error: 'A conta compartilhada do Stenci não autenticou. Confira as credenciais configuradas.' })
    if (error.code === 'STENCI_CONNECTION_ERROR' || error.code === 'STENCI_BRANCH_FAILED' || error.code === 'STENCI_ME_FAILED') return res.status(503).json({ error: 'Não foi possível validar a conta compartilhada do Stenci. Tente novamente.' })
    if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message })
    console.error('[Modo Fisioterapeuta] falha de autenticação facial', error.code || error.name)
    res.status(error.status || 503).json({ error: 'Não foi possível entrar no modo fisioterapeuta. Tente novamente.' })
  } finally { descriptors?.forEach(descriptor => descriptor.fill(0)) }
})

router.use(auth, async (req,res,next)=>{
  try {
    const user=await knex('users as u').join('people as p','p.id','u.person_id')
      .join('physiotherapist_user_links as l','l.user_id','u.id').join('professionals as pr','pr.id','l.professional_id')
      .leftJoin('physiotherapist_face_biometrics as b','b.user_id','u.id')
      .where({'u.id':req.user.id,'u.status':'active','u.role':'user','pr.active':1,'pr.type':'PHYSIOTHERAPIST'})
      .whereRaw('UPPER(pr.council) = ?', ['CREFITO'])
      .first('u.id','u.username','u.role','u.status','u.auth_provider','u.person_id','p.full_name','p.email','p.avatar_url','l.professional_id','pr.full_name as professional_name','b.user_id as face_enrolled')
    if(!user)return res.status(403).json({error:'Seu usuário não possui um fisioterapeuta ativo vinculado.',code:'PHYSIO_ACCESS_UNAVAILABLE'})
    req.physiotherapist=user
    req.physioSchedules=await knex('physiotherapy_rotation_agendas').where({professional_id:user.professional_id}).select('schedule_id','schedule_name')
    res.set('Cache-Control','no-store')
    next()
  } catch(error){next(error)}
})
function ownSession(req){
  const session=stenciSessionStore.get(req.user.sid)
  if(session?.mode==='physio-shared'&&!stenciSessionStore.hasCredentials(req.user.sid))return null
  return session && ['physio-shared','physio-development'].includes(session.mode) && Number(session.userId)===Number(req.user.id) && Number(session.professionalId)===Number(req.physiotherapist.professional_id) ? session : null
}
function profile(req,session=ownSession(req)){
  return {professionalId:req.physiotherapist.professional_id,professionalName:req.physiotherapist.professional_name,faceEnrolled:Boolean(req.physiotherapist.face_enrolled),schedules:req.physioSchedules,developmentMode:session?.mode==='physio-development',needsSession:!session}
}
function physioError(res,error,fallback){
  if(['STENCI_REFRESH_REQUIRED','AUTH_SESSION_EXPIRED'].includes(error.code))return res.status(428).json({error:'A conexão da agenda precisa ser renovada.',code:'PHYSIO_SESSION_REQUIRED'})
  const messages={STENCI_INVALID_CREDENTIALS:'Não foi possível conectar a conta compartilhada ao Stenci.',STENCI_LOGOUT_FAILED:'O Stenci não confirmou o encerramento da consulta. Tente novamente.',STENCI_FISIO_NOT_CONFIGURED:'A conexão Stenci do modo fisioterapeuta ainda não foi configurada.'}
  res.status(error.status||503).json({error:messages[error.code]||fallback,code:error.code})
}
async function readStenci(req,operations){
  const session=ownSession(req)
  if(!session)throw Object.assign(new Error('Conexão ausente'),{code:'STENCI_REFRESH_REQUIRED'})
  if(session.mode==='physio-development')throw Object.assign(new Error('Modo de desenvolvimento'),{status:503})
  return serializePhysioStenci(()=>refreshStenci({sid:req.user.sid,sessionStore:stenciSessionStore,scope:'physio',operations}))
}
async function calendar(req,date){
  const snapshots=[]
  for(let index=0;index<req.physioSchedules.length;index+=4){
    const group=req.physioSchedules.slice(index,index+4)
    const batch=await readStenci(req,group.map(schedule=>({name:'physioRead',date,scheduleId:schedule.schedule_id})))
    for(let i=0;i<group.length;i++)snapshots.push({scheduleId:group[i].schedule_id,scheduleName:group[i].schedule_name,slots:batch[i]?.value?.slots||[],items:(batch[i]?.value?.items||[]).map(item=>({...item,schedule_id:group[i].schedule_id,schedule_name:group[i].schedule_name}))})
  }
  const sessions=groupSessions(snapshots,date)
  return {items:sessions.flatMap(session=>session.items),sessions}
}
function validDate(value){const parsed=/^\d{4}-\d{2}-\d{2}$/.test(value)?new Date(`${value}T00:00:00.000Z`):null;return Boolean(parsed&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value)}
function ownLedger(req){
  const ids=req.physioSchedules.map(schedule=>String(schedule.schedule_id))
  return knex('billing_stenci_appointments').where({branch_id:getStenciConfig().branchId}).where(function(){
    this.whereIn('schedule_id',ids)
    for(const id of ids)this.orWhereRaw("JSON_CONTAINS(schedule_memberships, JSON_OBJECT('id', ?))",[id])
  })
}
function ownScheduleNames(req,row){
  const allowed=new Map(req.physioSchedules.map(schedule=>[String(schedule.schedule_id),schedule.schedule_name]))
  return [...new Set(memberships(row).filter(link=>allowed.has(String(link.id))).map(link=>allowed.get(String(link.id))))].filter(Boolean).join(' • ')
}
router.get('/me',(req,res)=>res.json(profile(req)))
router.post('/session',async(req,res)=>{
  let sid
  try{
    if(ownSession(req))return res.json({profile:profile(req)})
    const access=await createPhysioSession({userId:req.user.id,professionalId:req.physiotherapist.professional_id,sessionStore:stenciSessionStore})
    sid=access.sid
    const remaining=Number(req.user.exp)-Math.floor(Date.now()/1000)
    if(remaining<=0)throw Object.assign(new Error('Sessão encerrada'),{status:401,code:'AUTH_SESSION_EXPIRED'})
    const token=jwt.sign({...publicUser(req.physiotherapist),sid,physiotherapistId:req.physiotherapist.professional_id},process.env.JWT_SECRET,{expiresIn:remaining})
    if(!stenciSessionStore.limitExpiration(sid,jwt.decode(token).exp*1000))throw new Error('Session unavailable')
    if(req.user.sid)stenciSessionStore.delete(req.user.sid)
    res.json({token,profile:profile(req,stenciSessionStore.get(sid))})
  }catch(error){if(sid)stenciSessionStore.delete(sid);physioError(res,error,'Não foi possível conectar sua agenda ao Stenci. Tente novamente.')}
})
router.get('/agenda',async(req,res)=>{
  const date=String(req.query.date||'')
  if(!validDate(date))return res.status(400).json({error:'Informe uma data válida.'})
  try{const agenda=await calendar(req,date);res.json({...agenda,date,server_time:new Date(serverNow()).toISOString()})}
  catch(error){physioError(res,error,'Não foi possível carregar a agenda do Stenci.')}
})
router.get('/agenda/:appointmentId',async(req,res)=>{
  const date=String(req.query.date||''),id=String(req.params.appointmentId)
  if(!validDate(date)||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return res.status(400).json({error:'Agendamento inválido.'})
  try{
    const agenda=await calendar(req,date),appointment=agenda.items.find(item=>item.id===id)
    if(!appointment)return res.status(404).json({error:'Este agendamento não está disponível nas suas agendas para esta data.'})
    const session=agenda.sessions.find(group=>group.items.some(item=>item.id===id))
    const outsideSession=()=>res.status(409).json({code:'PHYSIO_OUTSIDE_SESSION',error:'Este atendimento só pode ser aberto durante o horário da sessão. Consulte a sessão atual na agenda.'})
    if(sessionAccess(session,date,serverNow())!=='current')return outsideSession()
    const visits=await ownLedger(req).where({patient_external_id:appointment.patient_id}).select('external_id','service_date','start_at','schedule_id','schedule_name','schedule_memberships','status').orderBy('service_date','desc').orderBy('start_at','desc').limit(21)
    const now=serverNow()
    if(sessionAccess(session,date,now)!=='current')return outsideSession()
    res.json({appointment,session:session?{...session,items:undefined}:null,date,server_time:new Date(now).toISOString(),
      history:visits.slice(0,20).map(visit=>({id:visit.external_id,date:visit.service_date instanceof Date?visit.service_date.toISOString().slice(0,10):String(visit.service_date).slice(0,10),startAt:visit.start_at,schedule:ownScheduleNames(req,visit),status:visit.status})),hasMoreHistory:visits.length>20,
      capabilities:{start:false,saveEvolution:false,finish:false},clinicalHistoryAvailable:false})
  }catch(error){physioError(res,error,'Não foi possível abrir este atendimento. Tente novamente.')}
})
router.get('/patients/search',async(req,res)=>{
  const search=String(req.query.search||'').trim()
  if(search.length<2||search.length>180)return res.status(400).json({error:'Digite pelo menos dois caracteres para buscar.'})
  try{
    if(!req.physioSchedules.length)return res.json({items:[],hasMore:false})
    const batch=await readStenci(req,[{name:'searchPatients',search,limit:30,offset:0}])
    const result=batch[0]?.value||{items:[],hasMore:false}
    const patients=(result.items||[]).map(source=>StenciMapper.patient(source))
    const ids=patients.map(patient=>String(patient.external_id)).filter(Boolean)
    if(!ids.length)return res.json({items:[],hasMore:false})
    const visits=await ownLedger(req).whereIn('patient_external_id',ids)
      .select('external_id','patient_external_id','service_date','schedule_id','schedule_name','schedule_memberships','start_at','status','is_session')
      .orderBy('service_date','desc').orderBy('start_at','desc')
    const grouped=new Map()
    for(const visit of visits){
      const key=String(visit.patient_external_id)
      if(!grouped.has(key))grouped.set(key,new Map())
      grouped.get(key).set(visit.external_id,{id:visit.external_id,date:visit.service_date instanceof Date?visit.service_date.toISOString().slice(0,10):String(visit.service_date).slice(0,10),schedule:ownScheduleNames(req,visit),startAt:visit.start_at,status:visit.status,isSession:Boolean(visit.is_session)})
    }
    // Today's appointments remain visible even before the background collector runs.
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date())
    for(const visit of (await calendar(req,today)).items){
      const key=String(visit.patient_id)
      if(!ids.includes(key))continue
      if(!grouped.has(key))grouped.set(key,new Map())
      grouped.get(key).set(visit.id,{id:visit.id,date:today,schedule:visit.schedule_name,startAt:visit.startDate,status:visit.status,isSession:Boolean(visit.expenses?.some(expense=>expense.type==='session'&&String(expense.code||'').replace(/\D/g,'')!=='50000144'))})
    }
    res.json({items:patients.filter(patient=>grouped.has(String(patient.external_id))).map(patient=>({...patient,appointments:[...grouped.get(String(patient.external_id)).values()].sort((a,b)=>b.date.localeCompare(a.date)||String(b.startAt).localeCompare(String(a.startAt)))})),hasMore:Boolean(result.hasMore)})
  }catch(error){physioError(res,error,'Não foi possível buscar pacientes das suas agendas no Stenci.')}
})
router.get('/production',async(req,res)=>{
  try{
    const {start,end}=period({start:String(req.query.start||''),end:String(req.query.end||'')})
    const schedules=req.physioSchedules.map(s=>s.schedule_id)
    const items=schedules.length?await ownLedger(req)
      .whereBetween('service_date',[start,end]).select('service_date','status','is_session').orderBy('service_date'):[]
    const byDay=new Map()
    for(const item of items){
      const day=item.service_date instanceof Date?item.service_date.toISOString().slice(0,10):String(item.service_date).slice(0,10)
      const current=byDay.get(day)||{date:day,appointments:0,completed:0,sessions:0}
      current.appointments++;current.completed+=item.status==='finished'?1:0;current.sessions+=item.is_session?1:0;byDay.set(day,current)
    }
    res.json({start,end,totals:{appointments:items.length,completed:items.filter(item=>item.status==='finished').length,sessions:items.filter(item=>Boolean(item.is_session)).length},days:[...byDay.values()]})
  }catch(error){physioError(res,error,'Não foi possível carregar o relatório de produção.')}
})
module.exports=router
