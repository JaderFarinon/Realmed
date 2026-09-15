const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const SUPPORT_REQUESTS_TABLE = 'support_requests'
const SUPPORT_MESSAGES_TABLE = 'support_request_messages'
const SUPPORT_ATTACHMENTS_TABLE = 'support_request_attachments'

exports.up = async function up(knex) {
  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  const hasRequestsTable = await knex.schema.hasTable(SUPPORT_REQUESTS_TABLE)
  if (!hasRequestsTable) {
    await knex.schema.createTable(SUPPORT_REQUESTS_TABLE, (table) => {
      table.increments('id').primary()
      table.string('motivo', 50).notNullable()
      table.string('titulo', 180).notNullable()
      table.text('descricao').notNullable()
      table.string('status', 50).notNullable().defaultTo('aguardando_suporte')

      const createdBy = addUserReferenceColumn(table, 'created_by', useUnsignedUserId)
      createdBy.nullable()

      const updatedBy = addUserReferenceColumn(table, 'updated_by', useUnsignedUserId)
      updatedBy.nullable()

      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
      table.timestamp('closed_at').nullable()

      table.index(['status'], 'idx_support_requests_status')
      table.index(['created_by'], 'idx_support_requests_created_by')
      table.index(['updated_at'], 'idx_support_requests_updated_at')
    })
  }

  const hasMessagesTable = await knex.schema.hasTable(SUPPORT_MESSAGES_TABLE)
  if (!hasMessagesTable) {
    await knex.schema.createTable(SUPPORT_MESSAGES_TABLE, (table) => {
      table.increments('id').primary()
      table.integer('solicitacao_id').unsigned().notNullable()
      table
        .foreign('solicitacao_id', 'fk_support_messages_request')
        .references('id')
        .inTable(SUPPORT_REQUESTS_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.text('conteudo')

      const createdBy = addUserReferenceColumn(table, 'created_by', useUnsignedUserId)
      createdBy.nullable()

      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())

      table.index(['solicitacao_id'], 'idx_support_messages_request')
      table.index(['created_at'], 'idx_support_messages_created_at')
    })
  }

  const hasAttachmentsTable = await knex.schema.hasTable(SUPPORT_ATTACHMENTS_TABLE)
  if (!hasAttachmentsTable) {
    await knex.schema.createTable(SUPPORT_ATTACHMENTS_TABLE, (table) => {
      table.increments('id').primary()
      table.integer('mensagem_id').unsigned().notNullable()
      table
        .foreign('mensagem_id', 'fk_support_attachments_message')
        .references('id')
        .inTable(SUPPORT_MESSAGES_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('nome_original', 255).notNullable()
      table.string('arquivo_armazenado', 255).notNullable()
      table.string('mime_type', 150)
      table.bigInteger('tamanho_bytes')

      const createdBy = addUserReferenceColumn(table, 'created_by', useUnsignedUserId)
      createdBy.nullable()

      table.timestamp('created_at').defaultTo(knex.fn.now())

      table.index(['mensagem_id'], 'idx_support_attachments_message')
      table.index(['created_at'], 'idx_support_attachments_created_at')
    })
  }
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(SUPPORT_ATTACHMENTS_TABLE)
  await knex.schema.dropTableIfExists(SUPPORT_MESSAGES_TABLE)
  await knex.schema.dropTableIfExists(SUPPORT_REQUESTS_TABLE)
}
