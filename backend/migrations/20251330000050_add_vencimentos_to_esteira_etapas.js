const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const ETAPAS_TABLE = 'esteira_procedimento_etapa'
const VENCIMENTOS_TABLE = 'esteira_procedimento_etapa_vencimentos'

exports.up = async function up(knex) {
  const etapasExists = await knex.schema.hasTable(ETAPAS_TABLE)
  if (etapasExists) {
    const hasColumn = await knex.schema.hasColumn(ETAPAS_TABLE, 'solicitar_data_limite')
    if (!hasColumn) {
      await knex.schema.alterTable(ETAPAS_TABLE, (table) => {
        table.boolean('solicitar_data_limite').notNullable().defaultTo(0)
      })
    }
  }

  const vencimentosExists = await knex.schema.hasTable(VENCIMENTOS_TABLE)
  if (vencimentosExists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  await knex.schema.createTable(VENCIMENTOS_TABLE, (table) => {
    table.increments('id').primary()
    table.integer('solicitacao_etapa_id').unsigned().notNullable()
    table
      .foreign('solicitacao_etapa_id', 'fk_vencimentos_etapa')
      .references('id')
      .inTable('esteira_procedimento_etapas')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table.string('descricao', 500)
    table.date('data_limite').notNullable()

    const createdBy = addUserReferenceColumn(table, 'created_by', useUnsignedUserId)
    createdBy.nullable()

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    table.index(['solicitacao_etapa_id'], 'idx_vencimentos_etapa')
    table.index(['data_limite'], 'idx_vencimentos_data')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(VENCIMENTOS_TABLE)

  const etapasExists = await knex.schema.hasTable(ETAPAS_TABLE)
  if (etapasExists) {
    const hasColumn = await knex.schema.hasColumn(ETAPAS_TABLE, 'solicitar_data_limite')
    if (hasColumn) {
      await knex.schema.alterTable(ETAPAS_TABLE, (table) => {
        table.dropColumn('solicitar_data_limite')
      })
    }
  }
}
