const TABLE_NAME = 'parametros_esteira_procedimento'

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (exists) {
    return undefined
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary()
    table.string('parametro', 150).notNullable().unique()
    table.string('valor', 255).notNullable()
    table
      .integer('usuario_id')
      .unsigned()
      .references('id')
      .inTable('users')
      .onUpdate('CASCADE')
      .onDelete('SET NULL')
    table.timestamps(true, true)
    table.engine('InnoDB')
  })

  await knex(TABLE_NAME).insert({
    parametro: 'antecedencia_minima_preparacao',
    valor: '0',
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE_NAME)
}
