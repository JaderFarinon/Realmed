exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('user_permissions')

  if (exists) {
    return undefined
  }

  return knex.schema.createTable('user_permissions', (table) => {
    table.increments('id').primary()
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table.string('module_key', 100).notNullable()
    table.boolean('can_view').notNullable().defaultTo(false)
    table.boolean('can_create').notNullable().defaultTo(false)
    table.boolean('can_edit').notNullable().defaultTo(false)
    table.boolean('can_delete').notNullable().defaultTo(false)
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table
      .timestamp('updated_at')
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

    table.unique(['user_id', 'module_key'], 'uk_user_permissions_user_module')
    table.index(['module_key'], 'idx_user_permissions_module')
  })
}

exports.down = async function down(knex) {
  return knex.schema.dropTableIfExists('user_permissions')
}
