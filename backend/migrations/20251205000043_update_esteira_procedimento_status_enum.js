const TABLE_CANDIDATES = [
  'esteira_procedimento',
  'solicitacoes_proc',
  'solicitacoes_cirurgia',
]

const STATUS_ENUM_SQL = "ENUM('PENDENTE','EM_ANDAMENTO','AGENDADA','CANCELADA','CONCLUIDO')"
const STATUS_ENUM_SQL_LEGACY = "ENUM('PENDENTE','EM_ANDAMENTO','AGENDADA','CANCELADA')"

const alterarStatusEnum = async (knex, tableName, enumSql) => {
  const existeTabela = await knex.schema.hasTable(tableName)
  if (!existeTabela) {
    return
  }

  const possuiColunaStatus = await knex.schema.hasColumn(tableName, 'status')
  if (!possuiColunaStatus) {
    return
  }

  await knex.schema.raw(
    `ALTER TABLE ?? MODIFY COLUMN ?? ${enumSql} NOT NULL DEFAULT 'PENDENTE'`,
    [tableName, 'status'],
  )
}

exports.up = async function up(knex) {
  for (const tableName of TABLE_CANDIDATES) {
    // eslint-disable-next-line no-await-in-loop
    await alterarStatusEnum(knex, tableName, STATUS_ENUM_SQL)
  }
}

exports.down = async function down(knex) {
  for (const tableName of TABLE_CANDIDATES) {
    // eslint-disable-next-line no-await-in-loop
    await alterarStatusEnum(knex, tableName, STATUS_ENUM_SQL_LEGACY)
  }
}
