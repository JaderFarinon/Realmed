exports.up = function (knex) {
  return knex.schema.hasTable('marketing_campanhas').then((exists) => {
    if (exists) {
      return undefined
    }

    return knex.schema.createTable('marketing_campanhas', (table) => {
      table.increments('id').primary()
      table.string('nome', 180).notNullable()
      table.json('filtros')
      table.string('status', 20).notNullable().defaultTo('Pendente')
      table.timestamps(true, true)
    })
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('marketing_campanhas')
}
