exports.up = async (knex) => {
  if (!(await knex.schema.hasTable('integration_logs'))) {
    await knex.schema.createTable('integration_logs', (table) => {
      table.bigIncrements('id').primary()
      table.string('integration', 40).notNullable()
      table.string('operation', 80).notNullable()
      table.enu('status', ['SUCCESS', 'ERROR']).notNullable()
      table.dateTime('started_at').notNullable()
      table.dateTime('finished_at').notNullable()
      table.integer('duration_ms').unsigned().notNullable().defaultTo(0)
      table.integer('records_processed').unsigned().notNullable().defaultTo(0)
      table.text('error_message').nullable()
      table.json('metadata').nullable()
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
      table.index(['integration', 'created_at'], 'idx_integration_logs_recent')
    })
  }

  await knex.raw("INSERT IGNORE INTO user_permissions (user_id, module_key, can_view, can_create, can_edit, can_delete) SELECT id, 'integrations', role IN ('masteradmin','admin'), role IN ('masteradmin','admin'), role IN ('masteradmin','admin'), role IN ('masteradmin','admin') FROM users")
}

exports.down = async (knex) => {
  await knex('user_permissions').where({ module_key: 'integrations' }).del()
  await knex.schema.dropTableIfExists('integration_logs')
}
