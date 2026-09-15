exports.up = function up(knex) {
  return knex.schema.hasTable('ia_settings').then((exists) => {
    if (exists) {
      return undefined
    }

    return knex.schema.createTable('ia_settings', (table) => {
      table.increments('id').primary()
      table.string('model', 50).notNullable()
      table.string('api_key', 255).notNullable()
      table.timestamps(true, true)
    })
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('ia_settings')
}
