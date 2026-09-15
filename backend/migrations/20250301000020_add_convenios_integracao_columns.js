const TABLE_NAME = 'convenios'
const COLUMN_CODIGO = 'integracao_codigo'
const COLUMN_ORIGEM = 'integracao_origem'
const UNIQUE_INDEX = 'uq_convenios_integracao_codigo'

const hasTable = (knex) => knex.schema.hasTable(TABLE_NAME)
const hasColumn = (knex, column) => knex.schema.hasColumn(TABLE_NAME, column)

const indexExists = async (knex, indexName) => {
  const [rows] = await knex.raw('SHOW INDEX FROM ?? WHERE Key_name = ?', [TABLE_NAME, indexName])
  if (Array.isArray(rows)) {
    return rows.length > 0
  }
  return rows?.[0]?.length > 0
}

exports.up = async function up(knex) {
  const tableExists = await hasTable(knex)
  if (!tableExists) {
    return
  }

  const codigoExiste = await hasColumn(knex, COLUMN_CODIGO)
  if (!codigoExiste) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.string(COLUMN_CODIGO, 120).nullable()
    })
  }

  const origemExiste = await hasColumn(knex, COLUMN_ORIGEM)
  if (!origemExiste) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.string(COLUMN_ORIGEM, 40).nullable()
    })
  }

  const possuiIndiceUnico = await indexExists(knex, UNIQUE_INDEX)
  if (!possuiIndiceUnico) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.unique([COLUMN_CODIGO], UNIQUE_INDEX)
    })
  }
}

exports.down = async function down(knex) {
  const tableExists = await hasTable(knex)
  if (!tableExists) {
    return
  }

  const possuiIndiceUnico = await indexExists(knex, UNIQUE_INDEX)
  if (possuiIndiceUnico) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropUnique([COLUMN_CODIGO], UNIQUE_INDEX)
    })
  }

  const origemExiste = await hasColumn(knex, COLUMN_ORIGEM)
  if (origemExiste) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropColumn(COLUMN_ORIGEM)
    })
  }

  const codigoExiste = await hasColumn(knex, COLUMN_CODIGO)
  if (codigoExiste) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropColumn(COLUMN_CODIGO)
    })
  }
}
