const TABLE_NAME = 'esteira_procedimento_etapas'

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable(TABLE_NAME)
  if (!hasTable) return

  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, 'etapa')
  if (!hasColumn) return

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.string('etapa', 255).nullable().alter()
  })
}

exports.down = async function down(knex) {
  const hasTable = await knex.schema.hasTable(TABLE_NAME)
  if (!hasTable) return

  const hasColumn = await knex.schema.hasColumn(TABLE_NAME, 'etapa')
  if (!hasColumn) return

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table
      .enu('etapa', ['CARDIO', 'APA', 'LIBERACAO_GUIA', 'LIBERACAO_OPME'])
      .notNullable()
      .alter()
  })
}
