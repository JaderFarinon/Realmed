const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('esteira_procedimento_etapas')
  if (exists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  await knex.schema.createTable('esteira_procedimento_etapas', (table) => {
    table.increments('id').primary()
    table
      .integer('solicitacao_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('solicitacoes_cirurgia')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table
      .enu('etapa', ['CARDIO', 'APA', 'LIBERACAO_GUIA', 'LIBERACAO_OPME'])
      .notNullable()
    table
      .enu('status', [
        'PENDENTE',
        'ATRIBUIDO',
        'EM_ANDAMENTO',
        'PARADO',
        'ATRASADO',
        'CONCLUIDO',
      ])
      .notNullable()
      .defaultTo('PENDENTE')
    addUserReferenceColumn(table, 'responsavel_id', useUnsignedUserId)
    table.date('dt_prevista')
    table.date('dt_conclusao')
    table.text('observacoes')
    table.timestamps(true, true)
    table.unique(['solicitacao_id', 'etapa'], 'uq_solic_etapa')
    table.index('responsavel_id', 'fk_etapa_responsavel')
    table.index('status', 'idx_etapa_status')
    table.index(['solicitacao_id', 'etapa'], 'idx_etapa_solic')
  })
}

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('esteira_procedimento_etapas')
}
