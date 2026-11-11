// Read-only schema inventory. Never select passwords or application secrets.
const fs=require('node:fs'),path=require('node:path')
const mysql=require(path.join(process.cwd(),'node_modules/mysql2/promise'))
const dotenv=require(path.join(process.cwd(),'node_modules/dotenv'))
const envIndex=process.argv.indexOf('--env')
const env=dotenv.parse(fs.readFileSync(envIndex>=0?process.argv[envIndex+1]:path.join(process.cwd(),'.env')))
;(async()=>{
 const db=await mysql.createConnection({host:env.DB_HOST,port:Number(env.DB_PORT),user:env.DB_USER,password:env.DB_PASS,multipleStatements:false,dateStrings:true})
 try{
  await db.query('SET SESSION TRANSACTION READ ONLY')
  await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT')
  const [schemas]=await db.query('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN (?,?)',[env.DB_NAME,'estoque_realmed'])
  const result={environment:env.DB_HOST==='localhost'||env.DB_HOST==='127.0.0.1'?'local':'production',schemas:[]}
  for(const {SCHEMA_NAME:schema} of schemas){
   const [tables]=await db.query('SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=? ORDER BY TABLE_NAME',[schema,'BASE TABLE'])
   const entries=[]
   for(const table of tables){
    if(schema===env.DB_NAME && !table.TABLE_NAME.startsWith('inventory_') && !['users','people','knex_migrations'].includes(table.TABLE_NAME))continue
    const [count]=await db.query(`SELECT COUNT(*) AS total FROM ${db.escapeId(schema)}.${db.escapeId(table.TABLE_NAME)}`)
    const [columns]=await db.query('SELECT COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[schema,table.TABLE_NAME])
    entries.push({table:table.TABLE_NAME,engine:table.ENGINE,count:Number(count[0].total),columns})
   }
   result.schemas.push({name:schema,tables:entries})
  }
  console.log(JSON.stringify(result,null,2))
 }finally{await db.rollback();await db.end()}
})().catch(error=>{console.error('Inventory inspection failed:',error.code||error.name);process.exitCode=1})
