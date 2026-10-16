const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')
const dotenv = require('../backend/node_modules/dotenv')
const knex = require('../backend/node_modules/knex')

async function main() {
  const env = dotenv.parse(fs.readFileSync('/qyvia/realmed/shared/backend.env'))
  if (env.DB_NAME !== 'realmed') throw new Error('Unexpected database name')
  const db = knex({ client: 'mysql2', connection: { host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASS, database: env.DB_NAME }, migrations: { directory: path.resolve(__dirname, '../backend/migrations') } })
  try {
    const [, pending] = await db.migrate.list()
    if (!pending.length) { console.log('No pending Realmed migrations'); return }
    const backupRoot = '/qyvia/realmed/shared/backups'
    fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const config = path.join(backupRoot, `.mysql-${stamp}.cnf`)
    const quote = value => '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"'
    fs.writeFileSync(config, `[client]\nhost=${quote(env.DB_HOST)}\nport=${Number(env.DB_PORT)}\nuser=${quote(env.DB_USER)}\npassword=${quote(env.DB_PASS)}\n`, { mode: 0o600 })
    const backupPath = path.join(backupRoot, `realmed-${stamp}.sql`)
    const fd = fs.openSync(backupPath, 'wx', 0o600)
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('mysqldump', [`--defaults-extra-file=${config}`, '--single-transaction', '--no-tablespaces', '--skip-lock-tables', 'realmed'], { stdio: ['ignore', fd, 'ignore'] })
        child.on('error', reject)
        child.on('exit', code => code === 0 ? resolve() : reject(new Error('Database backup failed; migrations were not run')))
      })
    } finally { fs.closeSync(fd); fs.unlinkSync(config) }
    if (!fs.statSync(backupPath).size) throw new Error('Empty database backup')
    console.log('Realmed backup completed; applying pending migrations:', pending.length)
    await db.migrate.latest()
  } finally { await db.destroy() }
}
main().catch(error => { console.error('Migration preparation failed:', error.code || error.name); process.exitCode = 1 })
