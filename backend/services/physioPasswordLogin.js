async function withPhysiotherapist(db,user) {
  if(user.role!=='user'||user.status!=='active')return user;
  const [rows]=await db.query(`SELECT p.id AS professional_id, p.full_name AS professional_name
    FROM physiotherapist_user_links l JOIN professionals p ON p.id=l.professional_id
    WHERE l.user_id=? AND p.active=1 AND p.type='PHYSIOTHERAPIST' AND UPPER(p.council)='CREFITO' LIMIT 1`,[user.id]);
  return {...user,professional_id:rows[0]?.professional_id||null,professional_name:rows[0]?.professional_name||null};
}
async function notifyPhysioPasswordLogin(db,user) {
  if(!user.professional_id)return;
  await db.query(`INSERT INTO system_notifications (type,audience,title,message,actor_user_id) VALUES (?,?,?,?,?)`,[
    'PHYSIO_PASSWORD_LOGIN','ADMIN','Fisioterapeuta entrou por senha',
    `${user.full_name||user.username} entrou com usuário e senha. Profissional: ${user.professional_name}.`,user.id,
  ]);
}
module.exports={withPhysiotherapist,notifyPhysioPasswordLogin};
