const fs = require('node:fs')
const mysql = require('../backend/node_modules/mysql2/promise')
const dotenv = require('../backend/node_modules/dotenv')
async function main() {
  const env = dotenv.parse(fs.readFileSync('/qyvia/realmed/shared/backend.env'))
  const db = await mysql.createConnection({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER, password: env.DB_PASS })
  try {
    const [tables] = await db.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', ['realmed'])
    const [users] = await db.query("SELECT User, Host FROM mysql.user WHERE User = 'realmed_app'")
    const counts = {}
    for (const table of ['patients', 'guide_processes', 'users', 'guide_process_documents', 'document_templates']) {
      if (tables.some(t => t.TABLE_NAME === table)) {
        const [rows] = await db.query('SELECT COUNT(*) AS total FROM ??', [`realmed.${table}`])
        counts[table] = rows[0].total
      }
    }
    console.log(JSON.stringify({ tables: tables.map(t => t.TABLE_NAME), applicationUsers: users, counts }))
  } finally { await db.end() }
}
main().catch(e => { console.error({ code: e.code }); process.exitCode = 1 })
