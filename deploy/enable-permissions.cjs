const fs = require('node:fs')
const dotenv = require('../backend/node_modules/dotenv')
const envPath = '/qyvia/realmed/shared/backend.env'
function enablePermissionsText(original) {
  const key = /^(?:export\s+)?PERMISSIONS_ENABLED\s*=[^\r\n]*/gm
  const updated = key.test(original)
    ? original.replace(key, 'PERMISSIONS_ENABLED=true')
    : original + (original.endsWith('\n') ? '' : '\n') + 'PERMISSIONS_ENABLED=true\n'
  // Preserve dotenv quoting. JSON escaping changes passwords containing quotes.
  const before = dotenv.parse(original), after = dotenv.parse(updated)
  if (after.PERMISSIONS_ENABLED !== 'true' || [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .some(name => name !== 'PERMISSIONS_ENABLED' && before[name] !== after[name])) {
    throw new Error('Permission update would change another environment setting')
  }
  return updated
}
function main() {
  const updated = enablePermissionsText(fs.readFileSync(envPath, 'utf8'))
  const temporary = envPath + '.next'
  fs.writeFileSync(temporary, updated, {mode:0o600})
  fs.chmodSync(temporary, 0o600)
  fs.renameSync(temporary, envPath)
  console.log('Realmed permissions enabled')
}
if (require.main === module) main()
module.exports = {enablePermissionsText}
