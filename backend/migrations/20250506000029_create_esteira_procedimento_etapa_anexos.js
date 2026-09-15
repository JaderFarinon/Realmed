const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const TABLE_NAME = 'esteira_procedimento_etapa_anexos'

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (exists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary()
    table
      .integer('solicitacao_etapa_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('esteira_procedimento_etapas')
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table.string('nome_original', 255).notNullable()
    table.string('arquivo_armazenado', 255).notNullable()
    table.string('mime_type', 150)
    table.bigInteger('tamanho_bytes')
    table.string('observacao', 500)

    const createdBy = addUserReferenceColumn(table, 'created_by', useUnsignedUserId)
    createdBy.nullable()

    const deletedBy = addUserReferenceColumn(table, 'deleted_by', useUnsignedUserId)
    deletedBy.nullable()

    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
    table.timestamp('deleted_at').nullable()

    table.index(['solicitacao_etapa_id'], 'idx_anexo_solicitacao')
    table.index(['deleted_at'], 'idx_anexo_deleted')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE_NAME)
}
