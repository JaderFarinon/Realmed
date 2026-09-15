const TABLE_NAME = 'esteira_procedimento'
const COLUMN_NAME = 'medico_id'

async function getColumnMetadata(knex) {
  return knex('information_schema.COLUMNS')
    .select('COLUMN_TYPE', 'IS_NULLABLE', 'COLUMN_DEFAULT')
    .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('TABLE_NAME', TABLE_NAME)
    .andWhere('COLUMN_NAME', COLUMN_NAME)
    .first()
}

exports.up = async function up(knex) {
  const column = await getColumnMetadata(knex)
  if (!column) {
    return
  }

  const requiresAlter = column.IS_NULLABLE === 'NO' || column.COLUMN_DEFAULT !== null
  if (!requiresAlter) {
    return
  }

  const columnType = column.COLUMN_TYPE || 'int(10) unsigned'
  await knex.schema.raw(`ALTER TABLE ?? MODIFY ?? ${columnType} NULL`, [TABLE_NAME, COLUMN_NAME])
}

exports.down = async function down(knex) {
  const column = await getColumnMetadata(knex)
  if (!column) {
    return
  }

  if (column.IS_NULLABLE === 'YES') {
    const columnType = column.COLUMN_TYPE || 'int(10) unsigned'
    await knex.schema.raw(`ALTER TABLE ?? MODIFY ?? ${columnType} NOT NULL`, [TABLE_NAME, COLUMN_NAME])
  }
}
