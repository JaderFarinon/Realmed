const crypto=require('node:crypto');
const {getStenciConfig}=require('../../integrations/stenci/config');
const StenciClient=require('../../integrations/stenci/StenciClient');
const StenciService=require('../../integrations/stenci/StenciService');
const {withTransientStenci}=require('./transientStenciService');
let sharedQueue=Promise.resolve();
function serializePhysioStenci(operation){
  const running=sharedQueue.then(operation);
  sharedQueue=running.catch(()=>{});
  return running;
}
function developmentAllowed(env){return env.STENCI_FISIO_DEV_BYPASS==='true'&&(env.NODE_ENV!=='production'||env.STENCI_FISIO_DEV_BYPASS_IN_PRODUCTION==='true')}
async function createPhysioSession({userId,professionalId,sessionStore,env=process.env,configFactory=getStenciConfig,serviceFactory,logger=console}){
  const username=String(env.STENCI_FISIO_USERNAME||'').trim(),password=String(env.STENCI_FISIO_PASSWORD||'');
  if(!username||!password){
    if(!developmentAllowed(env))throw Object.assign(new Error('A conexão Stenci do modo fisioterapeuta ainda não foi configurada.'),{status:503,code:'STENCI_FISIO_NOT_CONFIGURED'});
    return {sid:sessionStore.create({mode:'physio-development',userId,professionalId,stenciUserId:null,cache:new Map()}),developmentMode:true};
  }
  return serializePhysioStenci(async()=>{
    const config=configFactory(),deviceId=crypto.randomUUID().replace(/-/g,'');
    const service=serviceFactory?serviceFactory(config):new StenciService(new StenciClient({config}));
    const identity=await withTransientStenci(service,()=>service.authenticateUser(username,password,deviceId),logger);
    if(!identity?.stenci_user_id)throw Object.assign(new Error('A conta compartilhada não retornou uma identidade válida.'),{status:502,code:'STENCI_FISIO_INVALID_IDENTITY'});
    const sid=sessionStore.create({mode:'physio-shared',userId,professionalId,deviceId,branchId:config.branchId,stenciUserId:identity.stenci_user_id,cache:new Map()});
    try{sessionStore.setCredentials(sid,{username,password});return {sid,developmentMode:false}}
    catch(e){sessionStore.delete(sid);throw e}
  });
}
module.exports={createPhysioSession,serializePhysioStenci};
