const TABLE_NAME = 'esteira_procedimento_motivo_canc'
const ESTEIRA_TABLE = 'esteira_procedimento'

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (exists) {
    return
  }

  await knex.schema.createTable(TABLE_NAME, (table) => {
    table.increments('id').primary()
    table
      .integer('esteira_procedimento_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable(ESTEIRA_TABLE)
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
    table.text('descricao_motivo').notNullable()
    table.integer('id_usuario').unsigned().nullable()
    table
      .timestamp('data')
      .notNullable()
      .defaultTo(knex.fn.now())

    table.index(['esteira_procedimento_id'], 'idx_est_proc_mot_canc_proc')
    table.index(['id_usuario'], 'idx_est_proc_mot_canc_user')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists(TABLE_NAME)
}
