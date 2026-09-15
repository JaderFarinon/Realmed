const TABLE_NAME = 'esteira_procedimento'
const USERS_TABLE = 'users'
const FOREIGN_KEY_NAME = 'fk_est_proc_created_by'

async function hasColumn(knex, tableName, columnName) {
  try {
    return await knex.schema.hasColumn(tableName, columnName)
  } catch (error) {
    console.warn(
      `Falha ao verificar a coluna ${columnName} na tabela ${tableName}:`,
      error?.sqlMessage || error?.message || error,
    )
    throw error
  }
}

exports.up = async function up(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME)
  if (!tableExists) {
    return
  }

  const columnExists = await hasColumn(knex, TABLE_NAME, 'created_by')
  if (columnExists) {
    return
  }

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.integer('created_by').unsigned().nullable()
    table
      .foreign('created_by', FOREIGN_KEY_NAME)
      .references('id')
      .inTable(USERS_TABLE)
      .onUpdate('CASCADE')
      .onDelete('SET NULL')
  })
}

exports.down = async function down(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME)
  if (!tableExists) {
    return
  }

  const columnExists = await hasColumn(knex, TABLE_NAME, 'created_by')
  if (!columnExists) {
    return
  }

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.dropForeign('created_by', FOREIGN_KEY_NAME)
  })

  await knex.schema.alterTable(TABLE_NAME, (table) => {
    table.dropColumn('created_by')
  })
}
