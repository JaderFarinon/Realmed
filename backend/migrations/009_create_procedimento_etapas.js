const { addUsuarioIdColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('procedimento_etapas')
  if (exists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  await knex.schema.createTable('procedimento_etapas', (table) => {
    table.increments('id').primary()
    table.string('nome', 255).notNullable()
    table
      .integer('procedimento_tipo_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('procedimento_tipos')
      .onUpdate('CASCADE')
    table
      .integer('convenio_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('convenios')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table.string('convenio_referencia', 120).notNullable()
    table.boolean('usa_integracao').notNullable().defaultTo(0)
    table.boolean('ativo').notNullable().defaultTo(1)
    addUsuarioIdColumn(table, useUnsignedUserId)
    table.timestamps(true, true)
    table.unique(['convenio_id', 'nome'], 'uq_etapa_convenio_nome')
    table.index('procedimento_tipo_id', 'idx_etapas_tipo')
    table.index('convenio_referencia', 'idx_etapas_convenio_ref')
    table.index('usuario_id', 'fk_etapas_usuario')
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('procedimento_etapas')
}
