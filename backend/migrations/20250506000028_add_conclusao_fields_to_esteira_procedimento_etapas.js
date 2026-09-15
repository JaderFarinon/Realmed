const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario')

const TABLE_NAME = 'esteira_procedimento_etapas'
const USER_COLUMN = 'id_usuario_concluido'
const DATE_COLUMN = 'dt_concluido'

exports.up = async function up(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME)
  if (!tableExists) {
    return
  }

  const useUnsignedUserId = await shouldUseUnsignedUserId(knex)

  const addColumnIfMissing = async (columnName, callback) => {
    const exists = await knex.schema.hasColumn(TABLE_NAME, columnName)
    if (!exists) {
      await knex.schema.alterTable(TABLE_NAME, callback)
    }
  }

  await addColumnIfMissing(USER_COLUMN, (table) => {
    const column = addUserReferenceColumn(table, USER_COLUMN, useUnsignedUserId)
    column.nullable()
    table.index(USER_COLUMN, 'idx_etapa_usuario_concluido')
  })

  await addColumnIfMissing(DATE_COLUMN, (table) => {
    table.dateTime(DATE_COLUMN).nullable()
    table.index(DATE_COLUMN, 'idx_etapa_dt_concluido')
  })
}

exports.down = async function down(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME)
  if (!tableExists) {
    return
  }

  const dropIndexIfExists = async (indexName) => {
    try {
      await knex.raw('ALTER TABLE ?? DROP INDEX ??', [TABLE_NAME, indexName])
    } catch (err) {
      // ignora caso o índice não exista
    }
  }

  const dropColumnIfExists = async (columnName, indexName) => {
    const exists = await knex.schema.hasColumn(TABLE_NAME, columnName)
    if (!exists) {
      return
    }

    if (indexName) {
      await dropIndexIfExists(indexName)
    }

    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropColumn(columnName)
    })
  }

  await dropColumnIfExists(DATE_COLUMN, 'idx_etapa_dt_concluido')
  await dropColumnIfExists(USER_COLUMN, 'idx_etapa_usuario_concluido')
}
