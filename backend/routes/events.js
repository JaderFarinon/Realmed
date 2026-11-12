const express=require('express');
const auth=require('../middleware/auth');
const {modulePermission}=require('../middleware/permission');
function createEventsRouter(db){
  const router=express.Router();
  router.use(auth,modulePermission('events','view'));
  router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next()});
  router.get('/:slug/confirmations',async(req,res,next)=>{
    const page=Number(req.query.page ?? 1),size=Number(req.query.pageSize ?? 10);
    const search=req.query.search ?? '',companions=req.query.companions ?? '',sort=req.query.sort ?? 'recent';
    if(!Number.isSafeInteger(page)||page<1||page>100000||!Number.isSafeInteger(size)||size<1||size>100||typeof search!=='string'||search.length>120||!['','with','without'].includes(companions)||!['recent','name'].includes(sort))return res.status(400).json({error:'Filtros de confirmações inválidos.'});
    try{
      const result=await db.transaction(async trx=>{
        const event=await trx('events').where({slug:req.params.slug}).select('id','slug','name','event_time','location_name','address','confirmation_path',trx.raw("DATE_FORMAT(event_date, '%Y-%m-%d') as event_date")).first();
        if(!event)return null;
        const base=()=>trx('event_confirmations').where({event_slug:event.slug});
        const filtered=()=>{
          const query=base();
          if(search.trim()){
            const pattern='%'+search.trim().replace(/[\\%_]/g,'\\$&')+'%';
            query.where(function(){this.where('participant_name','like',pattern).orWhereRaw('LOWER(CAST(companion_names AS CHAR)) LIKE ?',[pattern.toLocaleLowerCase('pt-BR')])});
          }
          if(companions==='with')query.where('companion_count','>',0);
          if(companions==='without')query.where('companion_count',0);
          return query;
        };
        const summary=await base().count({confirmations:'id'}).sum({companions:'companion_count'}).first();
        const {total}=await filtered().count({total:'id'}).first();
        const totalRows=Number(total),currentPage=Math.min(page,Math.max(1,Math.ceil(totalRows/size)));
        const query=filtered().select('id','participant_name','companion_names','companion_count','created_at');
        if(sort==='name')query.orderBy('participant_name','asc').orderBy('id','desc');
        else query.orderBy('created_at','desc').orderBy('id','desc');
        const items=await query.limit(size).offset((currentPage-1)*size);
        const confirmations=Number(summary.confirmations),companionCount=Number(summary.companions || 0);
        return {event,items:items.map(row=>({...row,companion_names:typeof row.companion_names==='string'?JSON.parse(row.companion_names):row.companion_names,companion_count:Number(row.companion_count),total_people:1+Number(row.companion_count)})),pagination:{page:currentPage,pageSize:size,total:totalRows},summary:{confirmations,companions:companionCount,total_people:confirmations+companionCount}};
      });
      if(!result)return res.status(404).json({error:'Evento não encontrado.'});
      res.json(result);
    }catch(error){next(error)}
  });
  return router;
}
module.exports={createEventsRouter};
