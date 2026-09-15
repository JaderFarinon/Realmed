const VIEW_NAME = 'vw_solicitacoes_resumo_etapas'
const OLD_TABLE = 'solicitacoes_cirurgia'
const NEW_TABLE = 'solicitacoes_proc'
const INDEX_RENAMES = [
  { from: 'fk_solic_paciente', to: 'fk_solic_proc_paciente' },
  { from: 'idx_solic_data', to: 'idx_solic_proc_data' },
  { from: 'idx_solic_status', to: 'idx_solic_proc_status' },
  { from: 'idx_solic_medico', to: 'idx_solic_proc_medico' },
  { from: 'idx_solic_convenio', to: 'idx_solic_proc_convenio' },
]
const OLD_FK = 'fk_etapa_solic'
const NEW_FK = 'fk_etapa_solic_proc'

const SOLICITACOES_FOREIGN_KEYS = [
  {
    column: 'convenio_id',
    oldName: 'fk_solic_convenio',
    newName: 'fk_solic_proc_convenio',
    referencedTable: 'convenios',
    options: { onDelete: 'SET NULL', onUpdate: 'CASCADE' },
  },
  {
    column: 'medico_id',
    oldName: 'fk_solic_medico',
    newName: 'fk_solic_proc_medico',
    referencedTable: 'medicos',
    options: { onUpdate: 'CASCADE' },
  },
  {
    column: 'paciente_id',
    oldName: 'fk_solic_paciente',
    newName: 'fk_solic_proc_paciente',
    referencedTable: 'pacientes',
    options: { onUpdate: 'CASCADE' },
  },
]

async function renameTable(knex, from, to) {
  const hasFrom = await knex.schema.hasTable(from)
  const hasTo = await knex.schema.hasTable(to)

  if (hasFrom && !hasTo) {
    await knex.schema.renameTable(from, to)
  }
}

function wrapIdentifier(knex, identifier) {
  return knex.client?.wrapIdentifier
    ? knex.client.wrapIdentifier(identifier)
    : `\`${identifier}\``
}

function buildIndexDefinition(knex, indexMetadata) {
  const wrap = (identifier) => wrapIdentifier(knex, identifier)

  const columns = indexMetadata
    .map(({ COLUMN_NAME, SUB_PART }) => {
      const column = wrap(COLUMN_NAME)
      if (SUB_PART && Number.isInteger(Number(SUB_PART))) {
        return `${column}(${SUB_PART})`
      }
      return column
    })
    .join(', ')

  const [{ NON_UNIQUE, INDEX_TYPE }] = indexMetadata
  const normalizedType = (INDEX_TYPE || '').toUpperCase()
  const isUnique = NON_UNIQUE === 0

  if (normalizedType === 'FULLTEXT') {
    return { keyword: 'FULLTEXT INDEX', columns }
  }

  if (normalizedType === 'SPATIAL') {
    return { keyword: 'SPATIAL INDEX', columns }
  }

  const keyword = `${isUnique ? 'UNIQUE ' : ''}INDEX`
  const usingClause = normalizedType && normalizedType !== 'BTREE' ? ` USING ${normalizedType}` : ''

  return { keyword, columns, usingClause }
}

async function recreateIndex(knex, tableName, from, to, indexMetadata) {
  const definition = buildIndexDefinition(knex, indexMetadata)
  const wrap = (identifier) => wrapIdentifier(knex, identifier)
  const usingClause = definition.usingClause ? definition.usingClause : ''

  await knex.schema.raw('ALTER TABLE ?? DROP INDEX ??', [tableName, from])

  const sql = `ALTER TABLE ${wrap(tableName)} ADD ${definition.keyword} ${wrap(to)}${usingClause} (${definition.columns})`
  await knex.schema.raw(sql)
}

async function renameIndex(knex, tableName, from, to) {
  const indexMetadata = await knex('information_schema.STATISTICS')
    .select('INDEX_NAME', 'NON_UNIQUE', 'INDEX_TYPE', 'SEQ_IN_INDEX', 'COLUMN_NAME', 'SUB_PART')
    .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('TABLE_NAME', tableName)
    .andWhere('INDEX_NAME', from)
    .orderBy('SEQ_IN_INDEX')

  if (!indexMetadata.length) {
    return
  }

  const newIndex = await knex('information_schema.STATISTICS')
    .select('INDEX_NAME')
    .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('TABLE_NAME', tableName)
    .andWhere('INDEX_NAME', to)
    .first()

  if (newIndex) {
    await knex.schema.raw('ALTER TABLE ?? DROP INDEX ??', [tableName, from])
    return
  }

  try {
    await knex.schema.raw('ALTER TABLE ?? RENAME INDEX ?? TO ??', [tableName, from, to])
  } catch (error) {
    const errorCode = error?.errno || error?.code
    const errorMessage = error?.sqlMessage || error?.message || ''

    if (errorCode === 1064 || errorCode === 1235 || /syntax/i.test(errorMessage) || /not support/i.test(errorMessage)) {
      await recreateIndex(knex, tableName, from, to, indexMetadata)
      return
    }

    throw error
  }
}

async function dropForeignKey(knex, tableName, constraintName) {
  const constraint = await knex('information_schema.REFERENTIAL_CONSTRAINTS')
    .select('CONSTRAINT_NAME')
    .where('CONSTRAINT_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('CONSTRAINT_NAME', constraintName)
    .andWhere('TABLE_NAME', tableName)
    .first()

  if (constraint) {
    await knex.schema.raw('ALTER TABLE ?? DROP FOREIGN KEY ??', [tableName, constraintName])
  }
}

async function createForeignKey(
  knex,
  tableName,
  columnName,
  constraintName,
  referencedTable,
  options = {},
) {
  const constraint = await knex('information_schema.REFERENTIAL_CONSTRAINTS')
    .select('CONSTRAINT_NAME')
    .where('CONSTRAINT_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('CONSTRAINT_NAME', constraintName)
    .andWhere('TABLE_NAME', tableName)
    .first()

  if (constraint) {
    return
  }

  await knex.schema.alterTable(tableName, (table) => {
    const fk = table
      .foreign(columnName, constraintName)
      .references(options.referencedColumn || 'id')
      .inTable(referencedTable)

    if (options.onDelete) {
      fk.onDelete(options.onDelete)
    }

    if (options.onUpdate) {
      fk.onUpdate(options.onUpdate)
    }
  })
}

async function recreateResumoView(knex, solicitacoesTable) {
  await knex.schema.raw(`DROP VIEW IF EXISTS ${VIEW_NAME}`)

  await knex.schema.raw(
    `CREATE VIEW ${VIEW_NAME} AS
      SELECT
        sp.id AS solicitacao_id,
        sp.paciente_id,
        sp.medico_id,
        sp.convenio_id,
        sp.data_solicitacao,
        sp.data_ultima_consulta,
        sp.status AS status_solicitacao,
        MAX(CASE WHEN se.etapa = 'CARDIO' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS cardio_concluido,
        MAX(CASE WHEN se.etapa = 'APA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS apa_concluido,
        MAX(CASE WHEN se.etapa = 'LIBERACAO_GUIA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_guia_concluida,
        MAX(CASE WHEN se.etapa = 'LIBERACAO_OPME' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_opme_concluida,
        SUM(CASE WHEN se.status IN ('PENDENTE', 'ATRIBUIDO') THEN 1 ELSE 0 END) AS etapas_pendentes,
        SUM(CASE WHEN se.status IN ('EM_ANDAMENTO', 'PARADO', 'ATRASADO') THEN 1 ELSE 0 END) AS etapas_em_andamento,
        SUM(CASE WHEN se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS etapas_concluidas
      FROM ${solicitacoesTable} sp
      LEFT JOIN esteira_procedimento_etapas se ON se.solicitacao_id = sp.id
      GROUP BY
        sp.id,
        sp.paciente_id,
        sp.medico_id,
        sp.convenio_id,
        sp.data_solicitacao,
        sp.data_ultima_consulta,
        sp.status`
  )
}

exports.up = async function up(knex) {
  await renameTable(knex, OLD_TABLE, NEW_TABLE)

  const hasNewTable = await knex.schema.hasTable(NEW_TABLE)
  if (hasNewTable) {
    for (const { oldName } of SOLICITACOES_FOREIGN_KEYS) {
      await dropForeignKey(knex, NEW_TABLE, oldName)
    }

    for (const { from, to } of INDEX_RENAMES) {
      await renameIndex(knex, NEW_TABLE, from, to)
    }

    for (const { column, newName, referencedTable, options } of SOLICITACOES_FOREIGN_KEYS) {
      await createForeignKey(knex, NEW_TABLE, column, newName, referencedTable, options)
    }
  }

  await dropForeignKey(knex, 'esteira_procedimento_etapas', OLD_FK)
  await createForeignKey(knex, 'esteira_procedimento_etapas', 'solicitacao_id', NEW_FK, NEW_TABLE, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  await recreateResumoView(knex, NEW_TABLE)
}

exports.down = async function down(knex) {
  await knex.schema.raw(`DROP VIEW IF EXISTS ${VIEW_NAME}`)

  for (const { newName } of SOLICITACOES_FOREIGN_KEYS) {
    await dropForeignKey(knex, NEW_TABLE, newName)
  }

  await dropForeignKey(knex, 'esteira_procedimento_etapas', NEW_FK)

  const hasNewTable = await knex.schema.hasTable(NEW_TABLE)
  if (hasNewTable) {
    for (const { from, to } of INDEX_RENAMES) {
      await renameIndex(knex, NEW_TABLE, to, from)
    }
  }

  await renameTable(knex, NEW_TABLE, OLD_TABLE)

  const hasOldTable = await knex.schema.hasTable(OLD_TABLE)
  if (hasOldTable) {
    for (const { column, oldName, referencedTable, options } of SOLICITACOES_FOREIGN_KEYS) {
      await createForeignKey(knex, OLD_TABLE, column, oldName, referencedTable, options)
    }
  }

  await createForeignKey(knex, 'esteira_procedimento_etapas', 'solicitacao_id', OLD_FK, OLD_TABLE, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })

  await recreateResumoView(knex, OLD_TABLE)
}
