const TABLE_NAME = 'esteira_procedimento_secretarias'
const ESTEIRA_TABLE = 'esteira_procedimento'

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)

  if (exists) {
    return undefined
  }

  return knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary()
    table
      .integer('esteira_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(ESTEIRA_TABLE)
      .onDelete('CASCADE')
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
    table.timestamp('created_at').defaultTo(knex.fn.now())

    table.unique(['esteira_id', 'user_id'], 'uk_est_proc_secretaria_user')
    table.index(['user_id'], 'idx_est_proc_secretaria_user_id')
  })
}

exports.down = async function down(knex) {
  return knex.schema.dropTableIfExists(TABLE_NAME)
}
