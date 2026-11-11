const fs = require('node:fs'),
  path = require('node:path')
const root = process.cwd(),
  knex = require(path.join(root, 'node_modules/knex'))
const { planLegacyInventory, importLegacyInventory } = require(
  path.join(root, 'services/legacyInventoryImport'),
)
const arg = (name) => {
  const index = process.argv.indexOf(name)
  return index < 0 ? null : process.argv[index + 1]
}
async function main() {
  const file = arg('--snapshot')
  if (!file)
    throw Error('Informe --snapshot com o arquivo operacional sem senhas.')
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')),
    plan = planLegacyInventory(snapshot)
  if (
    arg('--expect-fingerprint') &&
    arg('--expect-fingerprint') !== snapshot.fingerprint
  )
    throw Error('Fingerprint diferente do autorizado para importação.')
  if (!process.argv.includes('--apply')) {
    console.log(
      JSON.stringify(
        {
          mode: 'preview',
          fingerprint: snapshot.fingerprint,
          summary: plan.summary,
        },
        null,
        2,
      ),
    )
    return
  }
  const env = require(path.join(root, 'node_modules/dotenv')).parse(
    fs.readFileSync(arg('--env') || path.join(root, '.env')),
  )
  if (env.DB_NAME !== 'realmed')
    throw Error('Este comando só pode importar no banco realmed.')
  const backupRoot = arg('--backup-root')
  if (!backupRoot)
    throw Error(
      'Informe --backup-root para salvar o estado anterior do estoque.',
    )
  const db = knex({
    client: 'mysql2',
    connection: {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
      database: env.DB_NAME,
    },
  })
  try {
    const actor = arg('--actor')
      ? await db('users')
          .where({ id: Number(arg('--actor')), status: 'active' })
          .whereIn('role', ['admin', 'masteradmin'])
          .first()
      : await db('users')
          .where({ status: 'active' })
          .whereIn('role', ['admin', 'masteradmin'])
          .orderBy('id')
          .first()
    if (!actor) throw Error('Administrador de importação não encontrado.')
    const previous = await db('inventory_import_runs')
      .where({ source_schema: snapshot.schema })
      .first()
    let backupPath = null
    if (!previous) {
      fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 })
      const tables = await db('information_schema.TABLES')
        .where({ TABLE_SCHEMA: env.DB_NAME, TABLE_TYPE: 'BASE TABLE' })
        .where('TABLE_NAME', 'like', 'inventory\\_%')
        .select('TABLE_NAME')
      const saved = await db.transaction(async (trx) => {
        const rows = {}
        for (const { TABLE_NAME: table } of tables)
          rows[table] = await trx(table).select('*')
        return rows
      })
      backupPath = path.join(
        backupRoot,
        'realmed-inventory-before-' +
          new Date().toISOString().replace(/[:.]/g, '-') +
          '.json',
      )
      fs.writeFileSync(
        backupPath,
        JSON.stringify(
          {
            database: 'realmed',
            createdAt: new Date().toISOString(),
            tables: saved,
          },
          null,
          2,
        ),
        { flag: 'wx', mode: 0o600 },
      )
    }
    const manifest = arg('--photo-manifest')
      ? JSON.parse(fs.readFileSync(arg('--photo-manifest'), 'utf8'))
      : {}
    const photoRoot = path.resolve(root, '../storage/assets/products'),
      crypto = require('node:crypto')
    const photoSource = arg('--photo-source-root')
    if (photoSource) fs.mkdirSync(photoRoot, { recursive: true })
    for (const asset of Object.values(manifest)) {
      if (!/^[a-f0-9]{64}\.(?:jpg|png)$/.test(asset.filename || ''))
        throw Error('Nome de foto inválido no manifesto.')
      if (photoSource) {
        const source = fs.readFileSync(path.join(photoSource, asset.filename))
        if (
          crypto.createHash('sha256').update(source).digest('hex') !==
            asset.sha256 ||
          source.length !== asset.bytes
        )
          throw Error('Foto de origem ausente ou adulterada.')
        const destination = path.join(photoRoot, asset.filename)
        if (!fs.existsSync(destination))
          fs.writeFileSync(destination, source, { flag: 'wx' })
      }
      const bytes = fs.readFileSync(path.join(photoRoot, asset.filename))
      if (
        crypto.createHash('sha256').update(bytes).digest('hex') !==
          asset.sha256 ||
        bytes.length !== asset.bytes
      )
        throw Error('Foto ausente ou adulterada no destino.')
    }
    const result = await importLegacyInventory(db, snapshot, {
      actorId: actor.id,
      photoManifest: manifest,
    })
    console.log(
      JSON.stringify(
        { ...result, backup: backupPath, fingerprint: snapshot.fingerprint },
        null,
        2,
      ),
    )
  } finally {
    await db.destroy()
  }
}
main().catch((error) => {
  console.error('Importação não aplicada:', error.code || error.message)
  process.exitCode = 1
})
