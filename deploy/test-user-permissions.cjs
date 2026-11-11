// Uses only a disposable local database; never updates the Realmed database.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dependency = name => require(path.join(root, 'backend/node_modules', name));
async function main() {
  const env = dependency('dotenv').parse(fs.readFileSync(path.join(root, 'backend/.env')));
  assert.ok(['localhost','127.0.0.1','::1'].includes(env.DB_HOST), 'Local database required');
  const connection = {host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS};
  const name = `realmed_users_verify_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const admin = await dependency('mysql2/promise').createConnection(connection);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'realmed-users-'));
  let db, server, pool, created = false;
  const routers = [];
  try {
    await admin.query('CREATE DATABASE ??', [name]); created = true;
    const secret = crypto.randomBytes(32).toString('hex');
    Object.assign(env, {DB_NAME:name,JWT_SECRET:secret,PERMISSIONS_ENABLED:'true',NODE_ENV:'test'});
    const envPath = path.join(temp,'.env');
    fs.writeFileSync(envPath, Object.entries(env).map(([k,v])=>`${k}=${JSON.stringify(String(v))}`).join('\n'), {mode:0o600});
    process.env.DOTENV_CONFIG_PATH = envPath; process.chdir(temp);
    db = dependency('knex')({client:'mysql2',connection:{...connection,database:name}});
    for (const file of ['001_create_people.js','002_create_users.js','20250520000031_create_user_permissions.js','20260916000001_add_stenci_users.js','20261014000001_create_inventory.js']) {
      await require(path.join(root,'backend/migrations',file)).up(db);
    }
    const [person] = await db('people').insert({full_name:'Verification admin'});
    const [actor] = await db('users').insert({username:'verify-admin',person_id:person,role:'admin',status:'active'});
    const express = dependency('express'), jwt = dependency('jsonwebtoken');
    const app = express(); app.use(express.json());
    for (const [url,file] of [['usuarios','usuarios'],['permissoes','permissoes']]) {
      const router = require(path.join(root,'backend/routes',file)); routers.push(router); app.use('/api/'+url,router);
    }
    pool = require(path.join(root,'backend/db'));
    const auth = require(path.join(root,'backend/middleware/auth'));
    const {modulePermission} = require(path.join(root,'backend/middleware/permission'));
    app.get('/api/protected',auth,modulePermission('patients'),(_req,res)=>res.json({ok:true}));
    server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const token = id=>jwt.sign({id,role:'admin'},secret); // stale role must never bypass DB checks
    async function call(method,url,body,status=200,as=actor) {
      const response = await fetch(base+url,{method,headers:{Authorization:`Bearer ${token(as)}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const data = response.status===204?null:await response.json();
      assert.equal(response.status,status,`${method} ${url}: ${JSON.stringify(data)}`); return data;
    }
    const payload = {nome:'Verification staff',login:'01234567890',role:'user',status:'active'};
    await call('POST','/usuarios',{...payload,senha:'local-password'},400);
    await call('POST','/usuarios',{...payload,role:'doctor'},400);
    const user = await call('POST','/usuarios',payload,201);
    assert.equal(user.documento,'01234567890'); assert.equal(user.stenciLinked,false);
    assert.equal((await db('users').where({id:user.id}).first()).password,null);
    assert.equal((await db('user_permissions').where({user_id:user.id})).length,0);
    await call('POST','/usuarios',payload,409);
    await call('GET','/usuarios',undefined,403,user.id);
    await call('GET','/permissoes/users',undefined,403,user.id);
    await call('GET',`/permissoes/${user.id}`);
    await call('GET','/protected',undefined,403,user.id);
    await call('POST',`/permissoes/${user.id}`,{permissions:[{moduleKey:'patients',canView:true,canCreate:true}]});
    await call('GET','/protected',undefined,200,user.id);
    await call('POST',`/permissoes/${user.id}`,{permissions:[{moduleKey:'patients',canView:false,canEdit:true}]});
    const rights = (await call('GET',`/permissoes/${user.id}`)).permissions[0];
    assert.equal(rights.canEdit,false);
    await call('GET','/protected',undefined,403,user.id);
    await call('POST',`/permissoes/${user.id}`,{role:'admin',permissions:[]});
    await call('GET','/usuarios',undefined,200,user.id);
    await call('GET','/protected',undefined,200,user.id);
    await call('POST',`/permissoes/${user.id}`,{role:'user',permissions:[]});
    await call('GET','/usuarios',undefined,403,user.id);
    await call('GET','/protected',undefined,403,user.id);
    await call('PUT',`/usuarios/${actor}`,{nome:'Admin',login:'verify-admin',role:'user',status:'active'},403);
    await call('DELETE',`/usuarios/${actor}`,undefined,400);
    await db('users').where({id:user.id}).update({stenci_user_id:'test-stenci'});
    await call('PUT',`/usuarios/${user.id}`,{...payload,login:'other'},422);
    await call('DELETE',`/usuarios/${user.id}`,undefined,204);
    assert.equal((await db('users').where({id:user.id}).first()).status,'blocked');
    assert.ok(await db('people').where({id:user.personId}).first());
    assert.equal((await db('permission_audit').where({user_id:user.id})).length,6);
    await call('GET','/protected',undefined,401,user.id);
    await call('DELETE',`/usuarios/${user.id}`,undefined,204);
    assert.equal((await db('permission_audit').where({user_id:user.id})).length,6);
    console.log('PASS: passwordless registration, leading-zero CPF, denied direct API/stale admin JWT, grant/revoke, audit, soft block, self-protection and linked identity protection.');
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    for(const router of routers) await router.knex.destroy();
    if(pool) await pool.end();
    if(db) await db.destroy();
    if(created && /^realmed_users_verify_\d+_[a-f0-9]{6}$/.test(name)) await admin.query('DROP DATABASE ??',[name]);
    await admin.end(); process.chdir(root);
    if(!path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep)) throw new Error('Unexpected temporary directory');
    fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(error=>{console.error({code:error.code||error.name,message:error.code?.startsWith('ER_')?'Database verification failed':error.message});process.exitCode=1});
