const express=require('express');
const auth=require('../middleware/auth');
const {permissionMiddleware}=require('../middleware/permission');
function createNotificationsRouter(db){
  const router=express.Router();
  router.use(auth,permissionMiddleware(['admin','masteradmin']));
  const query=userId=>db('system_notifications as n').leftJoin('system_notification_reads as r',function(){this.on('r.notification_id','=','n.id').andOn('r.user_id','=',db.raw('?', [userId]))}).where('n.audience','ADMIN');
  router.get('/',async(req,res,next)=>{
    try{
      const before=req.query.before==null?null:Number(req.query.before);
      if(before!==null&&(!Number.isSafeInteger(before)||before<1))return res.status(400).json({error:'Página de notificações inválida.'});
      const list=query(req.user.id).select('n.id','n.type','n.title','n.message','n.created_at','r.read_at').orderBy('n.id','desc').limit(21);
      if(before)list.where('n.id','<',before);
      const [items,count]=await Promise.all([list,query(req.user.id).whereNull('r.read_at').count({total:'n.id'}).first()]);
      res.set('Cache-Control','no-store').json({items:items.slice(0,20),unread:Number(count.total),hasMore:items.length>20});
    }catch(e){next(e)}
  });
  router.post('/:id/read',async(req,res,next)=>{
    try{
      const id=Number(req.params.id);
      if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Notificação inválida.'});
      if(!await db('system_notifications').where({id,audience:'ADMIN'}).first())return res.status(404).json({error:'Notificação não encontrada.'});
      await db('system_notification_reads').insert({notification_id:id,user_id:req.user.id}).onConflict(['notification_id','user_id']).ignore();
      res.status(204).end();
    }catch(e){next(e)}
  });
  return router;
}
module.exports={createNotificationsRouter};
