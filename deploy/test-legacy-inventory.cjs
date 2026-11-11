// Creates/removes only its isolated temporary database. No source DB is queried.
const fs = require('node:fs'),
  os = require('node:os'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..'),
  mysql = require(path.join(root, 'backend/node_modules/mysql2/promise')),
  knex = require(path.join(root, 'backend/node_modules/knex')),
  dotenv = require(path.join(root, 'backend/node_modules/dotenv'))
const { importLegacyInventory, digest } = require(
  path.join(root, 'backend/services/legacyInventoryImport'),
)
const fixture = require(
  path.join(root, 'backend/test-support/legacyInventoryFixture.cjs'),
)
async function main() {
  const index = process.argv.indexOf('--snapshot'),
    snapshot =
      index >= 0
        ? JSON.parse(fs.readFileSync(process.argv[index + 1], 'utf8'))
        : fixture()
  const env = dotenv.parse(fs.readFileSync(path.join(root, 'backend/.env'))),
    connection = {
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      user: env.DB_USER,
      password: env.DB_PASS,
    }
  const name =
      'realmed_verify_legacy_' +
      Date.now() +
      '_' +
      crypto.randomBytes(3).toString('hex'),
    admin = await mysql.createConnection(connection),
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'realmed-legacy-'))
  let db, server, pool, guideDb
  try {
    await admin.query(
      'CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [name],
    )
    const secret = crypto.randomBytes(32).toString('hex'),
      settings = {
        ...env,
        DB_NAME: name,
        JWT_SECRET: secret,
        PERMISSIONS_ENABLED: 'true',
        NODE_ENV: 'test',
      }
    fs.writeFileSync(
      path.join(temp, '.env'),
      Object.entries(settings)
        .map(([key, value]) => key + '=' + JSON.stringify(String(value)))
        .join('\n'),
      { mode: 0o600 },
    )
    process.env.DOTENV_CONFIG_PATH = path.join(temp, '.env')
    process.chdir(temp)
    db = knex({
      client: 'mysql2',
      connection: { ...connection, database: name },
    })
    for (const file of [
      '001_create_people.js',
      '002_create_users.js',
      '20250520000031_create_user_permissions.js',
      '20260916000001_add_stenci_users.js',
      '20261014000001_create_inventory.js',
      '20261019000002_legacy_inventory_import.js',
    ])
      await require(path.join(root, 'backend/migrations', file)).up(db)
    const [person] = await db('people').insert({
      full_name: 'Administrador fictício',
      email: 'migration@example.invalid',
    })
    const [actorId] = await db('users').insert({
      username: 'migration-test',
      person_id: person,
      role: 'admin',
      status: 'active',
    })
    const general = await db('inventory_sectors')
      .where({ name: 'Geral' })
      .first()
    await db('inventory_user_profiles').insert({
      user_id: actorId,
      sector_id: general.id,
      profile: 'USER',
    })
    // A conflict late in the transaction must not leave partial imports behind.
    const [collision] = await db('inventory_categories').insert({
      name: snapshot.data.categoria[0].nome_categoria,
    })
    await assert.rejects(
      importLegacyInventory(db, snapshot, { actorId }),
      /já existente/,
    )
    assert.equal(
      Number((await db('inventory_import_runs').count('* as n').first()).n),
      0,
    )
    assert.equal(
      Number((await db('inventory_products').count('* as n').first()).n),
      0,
    )
    assert.equal(
      Number((await db('inventory_sectors').count('* as n').first()).n),
      1,
    )
    await db('inventory_categories').where({ id: collision }).del()
    const result = await importLegacyInventory(db, snapshot, { actorId })
    assert.equal(result.alreadyImported, false)
    for (const [table, count] of [
      ['inventory_products', result.summary.products],
      ['inventory_requests', result.summary.requests],
      ['inventory_request_items', result.summary.requestItems],
      ['inventory_invoice_items', result.summary.invoiceItems],
    ])
      assert.equal(Number((await db(table).count('* as n').first()).n), count)
    assert.equal(
      Number((await db('inventory_balances').sum('quantity as n').first()).n),
      result.summary.totalQuantity,
    )
    assert.equal(
      Number((await db('inventory_movements').sum('delta as n').first()).n),
      result.summary.totalQuantity,
    )
    assert.equal(
      Number((await db('users').count('* as n').first()).n),
      1,
      'legacy users must not become login accounts',
    )
    const records = await db('inventory_import_records').where({
      synthetic: false,
    })
    assert.equal(
      records.length,
      Object.values(snapshot.data).reduce((sum, rows) => sum + rows.length, 0),
    )
    assert.equal(JSON.stringify(records).includes('"senha"'), false)
    const repeated = await importLegacyInventory(db, snapshot, { actorId })
    assert.equal(repeated.alreadyImported, true)
    const changed = structuredClone(snapshot)
    changed.data.produto[0].nome_produto += ' altered'
    changed.fingerprint = digest(changed.data)
    await assert.rejects(
      importLegacyInventory(db, changed, { actorId }),
      /outro snapshot/,
    )
    const express = require(path.join(root, 'backend/node_modules/express')),
      jwt = require(path.join(root, 'backend/node_modules/jsonwebtoken'))
    const app = express()
    app.use(express.json())
    app.use(
      '/api/inventory',
      require(path.join(root, 'backend/routes/inventory')),
    )
    guideDb = require(path.join(root, 'backend/routes/guide-center')).knex
    pool = require(path.join(root, 'backend/db'))
    server = await new Promise((resolve) => {
      const running = app.listen(0, '127.0.0.1', () => resolve(running))
    })
    const base = 'http://127.0.0.1:' + server.address().port + '/api/inventory',
      headers = {
        Authorization:
          'Bearer ' + jwt.sign({ id: actorId, role: 'admin' }, secret),
        'Content-Type': 'application/json',
      }
    const list = await fetch(base + '/requests', { headers })
    assert.equal(list.status, 200)
    const requests = await list.json()
    assert.equal(requests.length, result.summary.requests)
    assert.ok(requests.every((r) => r.requester_name))
    const stock = await (
      await fetch(base + '/stock?show_zero=true', { headers })
    ).json()
    assert.equal(
      stock.reduce((sum, row) => sum + Number(row.quantity), 0),
      result.summary.totalQuantity,
      'inactive products with positive balance remain visible',
    )
    const incomplete = requests.find((r) => r.legacy_incomplete)
    assert.ok(incomplete)
    const detail = await (
      await fetch(base + '/requests/' + incomplete.id, { headers })
    ).json()
    const blocked = await fetch(
      base +
        '/requests/' +
        incomplete.id +
        '/items/' +
        detail.items[0].id +
        '/fulfill',
      { method: 'POST', headers, body: JSON.stringify({ quantity: 1 }) },
    )
    assert.equal(blocked.status, 409)
    const repaired = await fetch(base + '/requests/' + incomplete.id, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        requester_id: actorId,
        request_date: '2026-10-19',
        notes: 'Revisado em teste isolado',
      }),
    })
    assert.equal(repaired.status, 200)
    assert.equal(Boolean((await repaired.json()).legacy_incomplete), false)
    const report = await fetch(base + '/imports/latest', { headers })
    assert.equal(report.status, 200)
    assert.equal(
      (await report.json()).run.summary.totalQuantity,
      result.summary.totalQuantity,
    )
    const balance = await db('inventory_balances')
      .where('quantity', '>', 0)
      .first()
    await db('inventory_balances')
      .where({ id: balance.id })
      .increment('quantity', 7)
    await importLegacyInventory(db, snapshot, { actorId })
    assert.equal(
      Number(
        (await db('inventory_balances').where({ id: balance.id }).first())
          .quantity,
      ),
      Number(balance.quantity) + 7,
      'rerun must not reset live balances',
    )
    console.log(
      JSON.stringify(
        {
          pass: true,
          isolated: true,
          rollback: true,
          idempotent: true,
          httpRequests: requests.length,
          blockedIncomplete: true,
          repair: true,
          summary: result.summary,
        },
        null,
        2,
      ),
    )
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve))
    if (guideDb) await guideDb.destroy()
    if (pool) await pool.end()
    if (db) await db.destroy()
    if (!/^realmed_verify_legacy_[0-9]+_[a-f0-9]{6}$/.test(name))
      throw Error('Unsafe test database name')
    await admin.query('DROP DATABASE IF EXISTS ??', [name])
    await admin.end()
    process.chdir(root)
    const resolved = path.resolve(temp)
    if (
      path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
      !path.basename(resolved).startsWith('realmed-legacy-')
    )
      throw Error('Unsafe temporary directory')
    fs.rmSync(resolved, { recursive: true, force: true })
  }
}
main().catch((error) => {
  console.error('Legacy inventory verification failed:', error.message)
  process.exitCode = 1
})
