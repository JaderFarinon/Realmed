const { addUsuarioIdColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const MOTIVOS_TABLE = 'motivos_pendencia'
const RELACIONAMENTOS_TABLE = 'motivo_pendencia_etapas'

exports.up = async function up(knex) {
  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  const hasMotivosTable = await knex.schema.hasTable(MOTIVOS_TABLE)
  if (!hasMotivosTable) {
    await knex.schema.createTable(MOTIVOS_TABLE, (table) => {
      table.increments('id').primary()
      table.string('descricao', 255).notNullable()
      table.boolean('ativo').notNullable().defaultTo(1)
      addUsuarioIdColumn(table, useUnsignedUserId)
      table.timestamps(true, true)

      table.unique(['descricao'], 'uq_motivos_pendencia_descricao')
      table.index('ativo', 'idx_motivos_pendencia_ativo')
    })
  }

  const hasRelacionamentosTable = await knex.schema.hasTable(RELACIONAMENTOS_TABLE)
  if (!hasRelacionamentosTable) {
    await knex.schema.createTable(RELACIONAMENTOS_TABLE, (table) => {
      table.increments('id').primary()
      table
        .integer('motivo_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(MOTIVOS_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .integer('etapa_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('procedimento_etapas')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.unique(['motivo_id', 'etapa_id'], 'uq_motivo_pendencia_etapa')
      table.index('etapa_id', 'idx_motivo_pendencia_etapa_id')
    })
  }
}

exports.down = async function down(knex) {
  const hasRelacionamentosTable = await knex.schema.hasTable(RELACIONAMENTOS_TABLE)
  if (hasRelacionamentosTable) {
    await knex.schema.dropTable(RELACIONAMENTOS_TABLE)
  }

  const hasMotivosTable = await knex.schema.hasTable(MOTIVOS_TABLE)
  if (hasMotivosTable) {
    await knex.schema.dropTable(MOTIVOS_TABLE)
  }
}
