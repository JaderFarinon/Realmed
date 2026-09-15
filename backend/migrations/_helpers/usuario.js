const MYSQL_CLIENTS = new Set(['mysql', 'mysql2', 'mariadb'])

const getClientName = (knex) => {
  const client = knex?.client?.config?.client || knex?.client?.dialect
  return typeof client === 'string' ? client.toLowerCase() : ''
}

const getConfiguredDatabaseName = (knex) => {
  const connection = knex?.client?.config?.connection
  if (!connection || typeof connection !== 'object') {
    return null
  }

  return (
    connection.database ||
    connection.db ||
    connection.name ||
    connection.schemaName ||
    null
  )
}

const getActiveDatabaseName = async (knex) => {
  try {
    const [rows] = await knex.raw('SELECT DATABASE() AS db')
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].db || rows[0].DB || null
    }
  } catch (err) {
    return null
  }
  return null
}

const extractColumnType = (row) => {
  if (!row || typeof row !== 'object') {
    return ''
  }

  const value = row.Type || row.COLUMN_TYPE || row.column_type || ''
  return typeof value === 'string' ? value.toLowerCase() : ''
}

const isMysqlClient = (knex) => MYSQL_CLIENTS.has(getClientName(knex))

const fetchColumnTypeFromShowColumns = async (knex) => {
  try {
    const [rows] = await knex.raw('SHOW COLUMNS FROM ?? LIKE ?', ['users', 'id'])
    if (Array.isArray(rows) && rows.length > 0) {
      return extractColumnType(rows[0])
    }
  } catch (err) {
    return ''
  }
  return ''
}

const fetchColumnTypeFromInformationSchema = async (knex) => {
  try {
    let databaseName = getConfiguredDatabaseName(knex)
    if (!databaseName) {
      databaseName = await getActiveDatabaseName(knex)
    }

    if (!databaseName) {
      return ''
    }

    const [rows] = await knex.raw(
      'SELECT COLUMN_TYPE FROM information_schema.columns WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
      [databaseName, 'users', 'id']
    )

    if (Array.isArray(rows) && rows.length > 0) {
      return extractColumnType(rows[0])
    }
  } catch (err) {
    return ''
  }
  return ''
}

const shouldUseUnsignedUserId = async (knex) => {
  if (!isMysqlClient(knex)) {
    return false
  }

  const fromShowColumns = await fetchColumnTypeFromShowColumns(knex)
  if (fromShowColumns.includes('unsigned')) {
    return true
  }
  if (fromShowColumns && !fromShowColumns.includes('unsigned')) {
    return false
  }

  const fromInformationSchema = await fetchColumnTypeFromInformationSchema(knex)
  if (fromInformationSchema.includes('unsigned')) {
    return true
  }
  if (fromInformationSchema && !fromInformationSchema.includes('unsigned')) {
    return false
  }

  return true
}

const addUserReferenceColumn = (table, columnName, useUnsigned) => {
  const column = table.integer(columnName)
  if (useUnsigned && typeof column.unsigned === 'function') {
    column.unsigned()
  }

  column
    .references('id')
    .inTable('users')
    .onDelete('SET NULL')
    .onUpdate('CASCADE')

  return column
}

module.exports = {
  addUserReferenceColumn,
  addUsuarioIdColumn: (table, useUnsigned) => addUserReferenceColumn(table, 'usuario_id', useUnsigned),
  shouldUseUnsignedUserId,
}
