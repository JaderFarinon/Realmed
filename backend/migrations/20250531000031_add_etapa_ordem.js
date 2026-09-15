const TABLES = ['esteira_procedimento_etapa', 'procedimento_etapas']
const COLUMN_NAME = 'ordem'

const addColumnIfMissing = async (knex, tableName, columnName) => {
  const exists = await knex.schema.hasColumn(tableName, columnName)
  if (!exists) {
    await knex.schema.alterTable(tableName, (table) => {
      table.integer(columnName).unsigned().nullable()
    })
  }
}

const dropColumnIfExists = async (knex, tableName, columnName) => {
  const exists = await knex.schema.hasColumn(tableName, columnName)
  if (exists) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn(columnName)
    })
  }
}

exports.up = async function up(knex) {
  for (const tableName of TABLES) {
    const tableExists = await knex.schema.hasTable(tableName)
    if (!tableExists) {
      continue
    }

    await addColumnIfMissing(knex, tableName, COLUMN_NAME)
  }
}

exports.down = async function down(knex) {
  for (const tableName of TABLES) {
    const tableExists = await knex.schema.hasTable(tableName)
    if (!tableExists) {
      continue
    }

    await dropColumnIfExists(knex, tableName, COLUMN_NAME)
  }
}
