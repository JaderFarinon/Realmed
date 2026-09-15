const TABLES = ['esteira_procedimento_etapa', 'procedimento_etapas']
const DIAS_COLUMN = 'dias_previstos'
const ANEXOS_COLUMN = 'minimo_anexos'

const addColumnIfMissing = async (knex, tableName, columnName, callback) => {
  const exists = await knex.schema.hasColumn(tableName, columnName)
  if (!exists) {
    await knex.schema.alterTable(tableName, callback)
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

    await addColumnIfMissing(knex, tableName, DIAS_COLUMN, (table) => {
      table.integer(DIAS_COLUMN).unsigned().nullable()
    })

    await addColumnIfMissing(knex, tableName, ANEXOS_COLUMN, (table) => {
      table.integer(ANEXOS_COLUMN).unsigned().notNullable().defaultTo(0)
    })
  }
}

exports.down = async function down(knex) {
  for (const tableName of TABLES) {
    const tableExists = await knex.schema.hasTable(tableName)
    if (!tableExists) {
      continue
    }

    await dropColumnIfExists(knex, tableName, ANEXOS_COLUMN)
    await dropColumnIfExists(knex, tableName, DIAS_COLUMN)
  }
}
