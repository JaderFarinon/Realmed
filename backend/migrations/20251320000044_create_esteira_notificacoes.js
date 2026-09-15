const NOTIFICACOES_TABLE = 'esteira_notificacoes'
const DESTINATARIOS_TABLE = 'esteira_notificacao_destinatarios'

exports.up = async function up(knex) {
  const notificacoesExists = await knex.schema.hasTable(NOTIFICACOES_TABLE)
  if (!notificacoesExists) {
    await knex.schema.createTable(NOTIFICACOES_TABLE, (table) => {
      table.increments('id').primary()
      table.string('tipo', 100).notNullable()
      table
        .enum('status', ['PENDENTE', 'ENVIANDO', 'ENVIADO', 'FALHA'])
        .notNullable()
        .defaultTo('PENDENTE')
      table
        .integer('solicitacao_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('esteira_procedimento')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
      table
        .integer('etapa_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('esteira_procedimento_etapas')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
      table.string('assunto', 255).notNullable()
      table.text('mensagem').notNullable()
      table.text('dados_json').nullable()
      table.timestamp('scheduled_at').nullable()
      table.timestamp('enviado_em').nullable()
      table.text('erro_envio').nullable()
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

      table.index(['status'], 'idx_est_notificacoes_status')
      table.index(['tipo'], 'idx_est_notificacoes_tipo')
      table.index(['scheduled_at'], 'idx_est_notificacoes_scheduled_at')
      table.index(['solicitacao_id'], 'idx_est_notificacoes_solicitacao')
      table.index(['etapa_id'], 'idx_est_notificacoes_etapa')
    })
  }

  const destinatariosExists = await knex.schema.hasTable(DESTINATARIOS_TABLE)
  if (!destinatariosExists) {
    await knex.schema.createTable(DESTINATARIOS_TABLE, (table) => {
      table.increments('id').primary()
      table
        .integer('notificacao_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(NOTIFICACOES_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE')
      table.string('email', 255).notNullable()
      table
        .enum('status', ['PENDENTE', 'ENVIADO', 'FALHA'])
        .notNullable()
        .defaultTo('PENDENTE')
      table.timestamp('enviado_em').nullable()
      table.text('erro_envio').nullable()
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
      table
        .timestamp('updated_at')
        .notNullable()
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'))

      table.index(['notificacao_id'], 'idx_est_notif_dest_notificacao')
      table.index(['status'], 'idx_est_notif_dest_status')
      table.index(['email'], 'idx_est_notif_dest_email')
    })
  }
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(DESTINATARIOS_TABLE)
  await knex.schema.dropTableIfExists(NOTIFICACOES_TABLE)
}
