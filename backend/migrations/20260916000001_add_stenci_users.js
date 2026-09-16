exports.up = async function (knex) {
  await knex.schema.alterTable('people', (table) => {
    table.string('cpf', 14).nullable().alter()
    table.string('full_name', 150).nullable().alter()
    table.string('email', 150).nullable().alter()
  })
  await knex.schema.alterTable('users', (table) => {
    table.string('password', 255).nullable().alter()
    table.string('stenci_user_id', 191).nullable().unique('uk_users_stenci_user_id')
    table.string('stenci_username', 191).nullable().index('idx_users_stenci_username')
  })
}

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropUnique(['stenci_user_id'], 'uk_users_stenci_user_id')
    table.dropIndex(['stenci_username'], 'idx_users_stenci_username')
    table.dropColumns('stenci_user_id', 'stenci_username')
    table.string('password', 255).notNullable().alter()
  })
  await knex.schema.alterTable('people', (table) => {
    table.string('cpf', 14).notNullable().alter()
    table.string('full_name', 150).notNullable().alter()
    table.string('email', 150).notNullable().alter()
  })
}
