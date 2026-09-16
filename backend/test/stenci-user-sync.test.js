const test = require('node:test')
const assert = require('node:assert/strict')
const { syncStenciUser, UserSyncError, databaseDiagnostic } = require('../services/stenciUserService')
const StenciMapper = require('../../integrations/stenci/StenciMapper')

class MemoryPool {
  constructor({ users = [], people = [] } = {}) { this.users=structuredClone(users); this.people=structuredClone(people); this.nextUser=Math.max(0,...this.users.map(x=>x.id))+1; this.nextPerson=Math.max(0,...this.people.map(x=>x.id))+1; this.tail=Promise.resolve() }
  async getConnection() { const p=this; let unlock, held=false
    return { beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release(){}, async query(sql,v=[]){ const q=sql.replace(/\s+/g,' ').trim()
      if(q.startsWith('SELECT GET_LOCK')) { if(held) return [[{acquired:1}]]; const prior=p.tail; p.tail=new Promise(r=>{unlock=r}); await prior; held=true; return [[{acquired:1}]] }
      if(q.startsWith('SELECT RELEASE_LOCK')) { if(held){ held=false; unlock?.() }; return [[{released:1}]] }
      if(q.includes('WHERE u.stenci_user_id =')) return [[p.users.find(u=>u.stenci_user_id===v[0])].filter(Boolean)]
      if(q.includes('WHERE p.email =')) return [[p.users.find(u=>p.people.find(x=>x.id===u.person_id)?.email===v[0])].filter(Boolean)]
      if(q.includes('u.username = ? OR u.stenci_username')) return [[p.users.find(u=>u.username===v[0]||u.stenci_username===v[1])].filter(Boolean)]
      if(q.includes('WHERE p.cpf =')) return [[p.users.find(u=>p.people.find(x=>x.id===u.person_id)?.cpf===v[0])].filter(Boolean)]
      if(q.startsWith('INSERT INTO people')) { const id=p.nextPerson++; p.people.push({id,cpf:v[0],full_name:v[1],email:v[2]}); return [{insertId:id}] }
      if(q.startsWith('UPDATE people SET')) { const x=p.people.find(x=>x.id===v.at(-1)); let i=0; for(const c of ['full_name','email','cpf']) if(q.includes(`${c} = ?`)) x[c]=v[i++]; return [{affectedRows:1}] }
      if(q.startsWith('UPDATE users SET')) { const u=p.users.find(x=>x.id===v[4]); Object.assign(u,{stenci_user_id:v[0],stenci_username:v[1],username:v[2],person_id:v[3],status:'active'}); return [{affectedRows:1}] }
      if(q.startsWith('INSERT INTO users')) { const id=p.nextUser++; p.users.push({id,username:v[0],password:null,person_id:v[1],status:'active',role:'user',stenci_user_id:v[2],stenci_username:v[3]}); return [{insertId:id}] }
      if(q.startsWith('SELECT u.id, u.username')) { const u=p.users.find(x=>x.id===v[0]), x=p.people.find(x=>x.id===u.person_id); return [[{...u,full_name:x?.full_name,email:x?.email,avatar_url:x?.avatar_url}]] }
      throw new Error(`Unsupported SQL: ${q}`)
    }}
  }
}
const identity=(x={})=>({stenci_user_id:'stenci-1',stenci_username:'05286020984',identity:'05286020984',name:'Maria Atual',email:'maria@example.test',...x})
const legacy=(x={})=>new MemoryPool({people:[{id:4,full_name:'Antigo',email:x.email??'maria@example.test',cpf:x.cpf===undefined?'05286020984':x.cpf}],users:[{id:7,username:x.username||'legacy',password:'hash',person_id:4,role:'admin',status:'active',stenci_user_id:x.stenci??null,stenci_username:null}]})

test('creates a new passwordless user and never persists supplied password or token',async()=>{const p=new MemoryPool(), input={...identity(),password:'secret',token:'jwt'}; await syncStenciUser(p,input); assert.equal(p.users.length,1); assert.equal(p.users[0].password,null); assert.equal(p.users[0].token,undefined); assert.notEqual(p.users[0].password,input.password)})
test('updates a user found by stenci_user_id without creating one',async()=>{const p=legacy({stenci:'stenci-1'}); const u=await syncStenciUser(p,identity()); assert.equal(u.id,7); assert.equal(p.users.length,1); assert.equal(p.people[0].full_name,'Maria Atual')})
test('links an existing user by email when stenci_user_id is null',async()=>{const p=legacy({username:'old',cpf:null}); const u=await syncStenciUser(p,identity({identity:null})); assert.equal(u.id,7); assert.equal(p.users.length,1); assert.equal(p.users[0].stenci_user_id,'stenci-1')})
test('links by username/CPF and preserves its leading zero and string type',async()=>{const p=legacy({username:'05286020984',email:'old@example.test'}); await syncStenciUser(p,identity({email:'new@example.test'})); assert.equal(p.users[0].stenci_user_id,'stenci-1'); assert.equal(p.users[0].username,'05286020984'); assert.equal(typeof p.people[0].cpf,'string')})
test('same email with another stenci_user_id returns identity conflict',async()=>{const p=legacy({stenci:'other'}); await assert.rejects(syncStenciUser(p,identity()),e=>e instanceof UserSyncError&&e.code==='USER_IDENTITY_CONFLICT'&&e.status===409); assert.equal(p.users[0].stenci_user_id,'other')})
test('repeated and simultaneous synchronization create one user',async()=>{const p=new MemoryPool(); await syncStenciUser(p,identity()); await syncStenciUser(p,identity()); assert.equal(p.users.length,1); const c=new MemoryPool(); const users=await Promise.all([syncStenciUser(c,identity()),syncStenciUser(c,identity())]); assert.equal(c.users.length,1); assert.deepEqual(users.map(x=>x.id),[1,1])})
test('duplicate diagnostics retain index metadata but discard duplicate data',()=>{const d=databaseDiagnostic({code:'ER_DUP_ENTRY',errno:1062,sqlMessage:"Duplicate entry 'private@example.test' for key 'people.uk_people_email'"}); assert.deepEqual(d,{code:'ER_DUP_ENTRY',errno:1062,constraint:'people.uk_people_email',duplicateField:'people.uk_people_email'}); assert.doesNotMatch(JSON.stringify(d),/private@example\.test/)})
test('mapper uses user.id as the primary Stenci key and keeps CPF textual',()=>{const mapped=StenciMapper.userIdentity({user:{id:'user-9',identityId:'identity-legacy',name:'Maria',identity:{type:'cpf',value:'05286020984'}}},'fallback'); assert.equal(mapped.stenci_user_id,'user-9'); assert.equal(mapped.stenci_username,'05286020984'); assert.equal(mapped.identity,'05286020984'); assert.equal(typeof mapped.identity,'string')})
