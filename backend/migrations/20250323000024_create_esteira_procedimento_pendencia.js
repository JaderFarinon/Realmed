const TABLE_NAME = 'esteira_procedimento_pendencia'
const TASK_TABLE = 'esteira_procedimento_etapas'
const MOTIVO_TABLE = 'esteira_procedimento_mot_pend'

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (exists) {
    return
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary()
    table.integer('id_tarefa').unsigned().notNullable()
    table.integer('id_motivo_pend').unsigned().notNullable()
    table.text('descricao').nullable()
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())

    table
      .foreign('id_tarefa')
      .references('id')
      .inTable(TASK_TABLE)
      .onDelete('CASCADE')

    table
      .foreign('id_motivo_pend')
      .references('id')
      .inTable(MOTIVO_TABLE)
      .onDelete('RESTRICT')

    table.index(['id_tarefa'], 'idx_esteira_pendencia_tarefa')
    table.index(['id_motivo_pend'], 'idx_esteira_pendencia_motivo')
  })
}

exports.down = async function down(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (!exists) {
    return
  }

  await knex.schema.dropTable(TABLE_NAME)
}
