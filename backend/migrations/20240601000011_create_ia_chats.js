exports.up = function up(knex) {
  return knex.schema.hasTable('ia_chats').then((exists) => {
    if (exists) {
      return undefined
    }

    return knex.schema.createTable('ia_chats', (table) => {
      table.increments('id').primary()
      table.string('title', 255).notNullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
    })
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('ia_chats')
}
