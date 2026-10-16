const fs = require('node:fs')
const dotenv = require('../backend/node_modules/dotenv')
const envPath = '/qyvia/realmed/shared/backend.env'
const env = dotenv.parse(fs.readFileSync(envPath))
env.PERMISSIONS_ENABLED = 'true'
const temporary = `${envPath}.next`
fs.writeFileSync(temporary, Object.entries(env).map(([key,value])=>`${key}=${JSON.stringify(String(value))}`).join('\n')+'\n',{mode:0o600})
fs.renameSync(temporary,envPath)
console.log('Realmed permissions enabled')
