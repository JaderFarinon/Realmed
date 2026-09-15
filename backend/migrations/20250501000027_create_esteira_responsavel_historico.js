const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const TABLE_NAME = 'esteira_procedimento_etapa_responsaveis'

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (exists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary()
    table.integer('solicitacao_etapa_id').unsigned().notNullable()

    const responsavelColumn = addUserReferenceColumn(table, 'responsavel_id', useUnsignedUserId)
    responsavelColumn.notNullable()

    const alteradoPorColumn = addUserReferenceColumn(table, 'alterado_por_id', useUnsignedUserId)
    alteradoPorColumn.notNullable()

    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now())

    table
      .foreign('solicitacao_etapa_id', 'fk_etapa_resp_hist_solicitacao')
      .references('id')
      .inTable('esteira_procedimento_etapas')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')

    table.index('solicitacao_etapa_id', 'idx_etapa_resp_hist_solicitacao')
    table.index('responsavel_id', 'idx_etapa_resp_hist_responsavel')
    table.index('alterado_por_id', 'idx_etapa_resp_hist_alterado_por')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE_NAME)
}
