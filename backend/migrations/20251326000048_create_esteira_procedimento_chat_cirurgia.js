const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const CHAT_MENSAGENS_TABLE = 'esteira_procedimento_chat_mensagens'
const CHAT_ANEXOS_TABLE = 'esteira_procedimento_chat_anexos'

exports.up = async function up(knex) {
  const useUnsigned = await shouldUseUnsignedUserId(knex)

  const mensagensExists = await knex.schema.hasTable(CHAT_MENSAGENS_TABLE)
  if (!mensagensExists) {
    await knex.schema.createTable(CHAT_MENSAGENS_TABLE, (table) => {
      table.increments('id').primary()
      table.integer('solicitacao_id').unsigned().notNullable()
      table
        .foreign('solicitacao_id', 'fk_chat_solicitacao')
        .references('id')
        .inTable('esteira_procedimento')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.text('conteudo').notNullable()

      const createdBy = addUserReferenceColumn(table, 'created_by', useUnsigned)
      createdBy.nullable()

      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())

      table.index(['solicitacao_id'], 'idx_chat_solicitacao')
    })
  }

  const anexosExists = await knex.schema.hasTable(CHAT_ANEXOS_TABLE)
  if (!anexosExists) {
    await knex.schema.createTable(CHAT_ANEXOS_TABLE, (table) => {
      table.increments('id').primary()
      table.integer('chat_mensagem_id').unsigned().notNullable()
      table
        .foreign('chat_mensagem_id', 'fk_chat_cirurgia_msg')
        .references('id')
        .inTable(CHAT_MENSAGENS_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')

      table.string('nome_original', 255).notNullable()
      table.string('arquivo_armazenado', 255).notNullable()
      table.string('mime_type', 150)
      table.bigInteger('tamanho_bytes')

      const createdBy = addUserReferenceColumn(table, 'created_by', useUnsigned)
      createdBy.nullable()

      const deletedBy = addUserReferenceColumn(table, 'deleted_by', useUnsigned)
      deletedBy.nullable()

      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      table.timestamp('deleted_at').nullable()

      table.index(['chat_mensagem_id'], 'idx_chat_cirurgia_mensagem')
      table.index(['deleted_at'], 'idx_chat_cirurgia_deleted')
    })
  }
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(CHAT_ANEXOS_TABLE)
  await knex.schema.dropTableIfExists(CHAT_MENSAGENS_TABLE)
}
