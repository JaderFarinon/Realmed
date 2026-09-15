exports.up = function up(knex) {
  return knex.schema.hasTable('ia_messages').then((exists) => {
    if (exists) {
      return undefined
    }

    return knex.schema.createTable('ia_messages', (table) => {
      table.increments('id').primary()
      table.integer('chat_id').unsigned().notNullable()
      table
        .enu('role', ['user', 'assistant'], {
          useNative: true,
          enumName: 'ia_messages_role_enum',
        })
        .notNullable()
      table.text('content').notNullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())

      table
        .foreign('chat_id')
        .references('id')
        .inTable('ia_chats')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('ia_messages')
}
