exports.up = function up(knex) {
  const TABLE_NAME = 'internal_chat_messages'

  return knex.schema.hasTable(TABLE_NAME).then((exists) => {
    if (exists) {
      return undefined
    }

    return knex.schema.createTable(TABLE_NAME, (table) => {
      table.increments('id').primary()
      table
        .integer('sender_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('recipient_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.text('content').nullable()
      table.string('attachment_original_name', 255).nullable()
      table.string('attachment_stored_name', 255).nullable()
      table.string('attachment_mime_type', 255).nullable()
      table.bigInteger('attachment_size').nullable()
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())

      table.index(['sender_id', 'recipient_id'], 'idx_internal_chat_participants')
      table.index(['created_at'], 'idx_internal_chat_created_at')
    })
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('internal_chat_messages')
}
