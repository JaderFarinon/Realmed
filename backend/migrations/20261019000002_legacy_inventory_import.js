exports.up = async (knex) => {
  await knex.schema.createTable('inventory_import_runs', (t) => {
    t.increments('id')
    t.string('source_schema', 100).notNullable()
    t.string('fingerprint', 64).notNullable()
    t.dateTime('captured_at').notNullable()
    t.integer('created_by')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
    t.json('summary').notNullable()
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now())
    t.unique(['source_schema', 'fingerprint'], 'inv_import_snapshot')
  })
  await knex.schema.createTable('inventory_import_records', (t) => {
    t.increments('id')
    t.integer('run_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('inventory_import_runs')
    t.string('source_schema', 100).notNullable()
    t.string('source_table', 60).notNullable()
    t.string('source_key', 100).notNullable()
    t.string('target_table', 80).nullable()
    t.integer('target_id').unsigned().nullable()
    t.boolean('synthetic').notNullable().defaultTo(false)
    t.json('source_data').notNullable()
    t.unique(
      ['source_schema', 'source_table', 'source_key'],
      'inv_import_source',
    )
  })
  await knex.schema.alterTable('inventory_requests', (t) => {
    t.integer('requester_id').unsigned().nullable().alter()
    t.date('request_date').nullable().alter()
    t.string('legacy_requester_name', 150).nullable()
    t.boolean('legacy_incomplete').notNullable().defaultTo(false)
  })
  await knex.schema.alterTable('inventory_suppliers', (t) => {
    t.string('email', 255).nullable().alter()
    t.string('contact_name', 255).nullable().alter()
  })
}
exports.down = async (knex) => {
  if (
    Number(
      (await knex('inventory_import_runs').count('* as total').first()).total,
    )
  )
    throw new Error(
      'A importação possui histórico. Não reverta esta migration sem um plano de restauração.',
    )
  await knex.schema.alterTable('inventory_requests', (t) => {
    t.dropColumn('legacy_incomplete')
    t.dropColumn('legacy_requester_name')
    t.integer('requester_id').unsigned().notNullable().alter()
    t.date('request_date').notNullable().alter()
  })
  await knex.schema.dropTable('inventory_import_records')
  await knex.schema.dropTable('inventory_import_runs')
}
