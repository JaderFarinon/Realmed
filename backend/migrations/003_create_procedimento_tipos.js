const { addUsuarioIdColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('procedimento_tipos')
  if (exists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  await knex.schema.createTable('procedimento_tipos', (table) => {
    table.increments('id').primary()
    table.string('nome', 150).notNullable()
    table.boolean('ativo').notNullable().defaultTo(1)
    addUsuarioIdColumn(table, useUnsignedUserId)
    table.timestamps(true, true)
    table.unique('nome', 'uq_procedimento_tipos_nome')
    table.index('usuario_id', 'idx_procedimento_tipos_usuario')
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('procedimento_tipos')
}
