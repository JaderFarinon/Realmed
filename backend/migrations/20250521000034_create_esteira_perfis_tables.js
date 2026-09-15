const CAC_TABLE = 'esteira_perfis_cac'
const SECRETARIA_TABLE = 'esteira_perfis_secretarias'

exports.up = async function up(knex) {
  const hasCacTable = await knex.schema.hasTable(CAC_TABLE)
  if (!hasCacTable) {
    await knex.schema.createTable(CAC_TABLE, (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.boolean('is_coordenacao').notNullable().defaultTo(false)
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now())
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

      table.unique(['user_id'], 'uk_est_perfis_cac_user')
      table.index(['is_coordenacao'], 'idx_est_perfis_cac_is_coordenacao')
    })
  }

  const hasSecretariaTable = await knex.schema.hasTable(SECRETARIA_TABLE)
  if (!hasSecretariaTable) {
    await knex.schema.createTable(SECRETARIA_TABLE, (table) => {
      table.increments('id').primary()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .timestamp('created_at')
        .notNullable()
        .defaultTo(knex.fn.now())
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

      table.unique(['user_id'], 'uk_est_perfis_secretaria_user')
    })
  }
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(CAC_TABLE)
  await knex.schema.dropTableIfExists(SECRETARIA_TABLE)
}
