const TABLES = ['esteira_procedimento_etapa', 'procedimento_etapas']
const COLUMN_NAME = 'depende_de_id'

const normalizeTableName = (table) => table.replace(/[^a-z0-9_]/gi, '')

exports.up = async function up(knex) {
  for (const table of TABLES) {
    const tableExists = await knex.schema.hasTable(table)
    if (!tableExists) continue

    const hasColumn = await knex.schema.hasColumn(table, COLUMN_NAME)
    if (hasColumn) continue

    await knex.schema.alterTable(table, (tbl) => {
      tbl
        .integer(COLUMN_NAME)
        .unsigned()
        .nullable()
        .references('id')
        .inTable(table)
        .onUpdate('CASCADE')
        .onDelete('SET NULL')
    })

    const indexName = `idx_${normalizeTableName(table)}_${COLUMN_NAME}`
    try {
      await knex.schema.alterTable(table, (tbl) => {
        tbl.index([COLUMN_NAME], indexName)
      })
    } catch (err) {
      console.warn(`Não foi possível criar índice ${indexName} na tabela ${table}:`, err?.message || err)
    }
  }
}

exports.down = async function down(knex) {
  for (const table of TABLES) {
    const tableExists = await knex.schema.hasTable(table)
    if (!tableExists) continue

    const hasColumn = await knex.schema.hasColumn(table, COLUMN_NAME)
    if (!hasColumn) continue

    const indexName = `idx_${normalizeTableName(table)}_${COLUMN_NAME}`
    try {
      await knex.schema.alterTable(table, (tbl) => {
        tbl.dropIndex([COLUMN_NAME], indexName)
      })
    } catch (err) {
      console.warn(`Não foi possível remover índice ${indexName} na tabela ${table}:`, err?.message || err)
    }

    await knex.schema.alterTable(table, (tbl) => {
      tbl.dropForeign([COLUMN_NAME])
      tbl.dropColumn(COLUMN_NAME)
    })
  }
}
