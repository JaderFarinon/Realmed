const express = require('express');
const rateLimit = require('express-rate-limit');
const {createHash} = require('node:crypto');
const EVENT_SLUG = 'realmed-2026';
function normalizeConfirmation(body) {
  const name = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  const validName = value => value.length >= 2 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value);
  const participant = name(body?.name);
  if (!validName(participant)) throw new Error('Informe seu nome completo, com 2 a 120 caracteres.');
  if (!Array.isArray(body?.companions) || body.companions.length > 1) throw new Error('É permitido no máximo 1 acompanhante por confirmação.');
  const companions = body.companions.map(name);
  if (companions.some(value => !validName(value))) throw new Error('Preencha o nome de cada acompanhante, com 2 a 120 caracteres.');
  if (typeof body?.submission_key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submission_key)) throw new Error('Não foi possível identificar o envio. Atualize a página e tente novamente.');
  return {participant, companions, key:body.submission_key.toLowerCase()};
}
function createPublicEventsRouter(db) {
  const router = express.Router();
  router.use((_req,res,next) => {res.set('Cache-Control','no-store'); next();});
  router.post(`/${EVENT_SLUG}/confirmations`, rateLimit({windowMs:60000,limit:60,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Muitas confirmações em pouco tempo. Aguarde um minuto e tente novamente.'}}), async (req,res,next) => {
    let input;
    try {input=normalizeConfirmation(req.body);} catch(error) {return res.status(400).json({error:error.message});}
    const payloadHash=createHash('sha256').update(JSON.stringify([input.participant,input.companions])).digest('hex');
    try {
      let repeated=false;
      try {
        await db('event_confirmations').insert({event_slug:EVENT_SLUG,submission_key:input.key,payload_hash:payloadHash,participant_name:input.participant,companion_names:JSON.stringify(input.companions),companion_count:input.companions.length});
      } catch(error) {
        if(error.code!=='ER_DUP_ENTRY') throw error;
        const previous=await db('event_confirmations').where({event_slug:EVENT_SLUG,submission_key:input.key}).first('payload_hash');
        if(!previous || previous.payload_hash!==payloadHash) return res.status(409).json({error:'Este envio já foi confirmado com outros dados. Atualize a página para fazer uma nova confirmação.'});
        repeated=true;
      }
      res.status(repeated?200:201).json({confirmed:true,total:1+input.companions.length});
    } catch(error) {next(error);}
  });
  return router;
}
module.exports={createPublicEventsRouter,normalizeConfirmation};
