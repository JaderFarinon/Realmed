const TABLE_NAME = 'esteira_procedimento_etapas'
const STAGE_TABLE_CANDIDATES = ['esteira_procedimento_etapa', 'procedimento_etapas']
const VIEW_NAME = 'vw_solicitacoes_resumo_etapas'
const SOLICITACAO_FOREIGN_KEYS = [
  { name: 'fk_etapa_esteira_proc', table: 'esteira_procedimento' },
  { name: 'fk_etapa_solic_proc', table: 'solicitacoes_proc' },
  { name: 'fk_etapa_solic', table: 'solicitacoes_cirurgia' },
]

const dropResumoEtapasView = (knex) => knex.schema.raw('DROP VIEW IF EXISTS ??', [VIEW_NAME])

async function ensureSolicitacaoEtapasTable(knex) {
  const exists = await knex.schema.hasTable(TABLE_NAME)
  if (!exists) {
    throw new Error('Tabela "esteira_procedimento_etapas" não encontrada')
  }

  return TABLE_NAME
}

async function resolveSolicitacoesTable(knex) {
  if (await knex.schema.hasTable('esteira_procedimento')) {
    return 'esteira_procedimento'
  }

  if (await knex.schema.hasTable('solicitacoes_proc')) {
    return 'solicitacoes_proc'
  }

  if (await knex.schema.hasTable('solicitacoes_cirurgia')) {
    return 'solicitacoes_cirurgia'
  }

  throw new Error('Nenhuma tabela de solicitações encontrada para criar a view de resumo')
}

async function resolveProcedimentoEtapaTable(knex) {
  for (const candidate of STAGE_TABLE_CANDIDATES) {
    if (await knex.schema.hasTable(candidate)) {
      return candidate
    }
  }

  throw new Error('Tabela de etapas de procedimento não encontrada')
}

const createResumoEtapasViewNovo = async (knex, tableName, stageTable) => {
  const solicitacoesTable = await resolveSolicitacoesTable(knex)

  return knex.schema.raw(
    `CREATE VIEW ?? AS
    SELECT
      sc.id AS solicitacao_id,
      sc.paciente_id,
      sc.medico_id,
      sc.convenio_id,
      sc.data_solicitacao,
      sc.data_ultima_consulta,
      sc.status AS status_solicitacao,
      MAX(CASE WHEN UPPER(COALESCE(pe.nome, '')) = 'CARDIO' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS cardio_concluido,
      MAX(CASE WHEN UPPER(COALESCE(pe.nome, '')) = 'APA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS apa_concluido,
      MAX(CASE WHEN UPPER(COALESCE(pe.nome, '')) = 'LIBERACAO_GUIA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_guia_concluida,
      MAX(CASE WHEN UPPER(COALESCE(pe.nome, '')) = 'LIBERACAO_OPME' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_opme_concluida,
      SUM(CASE WHEN se.status IN ('PENDENTE', 'ATRIBUIDO') THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ('EM_ANDAMENTO', 'PARADO', 'ATRASADO') THEN 1 ELSE 0 END) AS etapas_em_andamento,
      SUM(CASE WHEN se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS etapas_concluidas
    FROM ?? sc
    LEFT JOIN ?? se ON se.solicitacao_id = sc.id
    LEFT JOIN ?? pe ON pe.id = se.procedimento_etapa_id
    GROUP BY
      sc.id,
      sc.paciente_id,
      sc.medico_id,
      sc.convenio_id,
      sc.data_solicitacao,
      sc.data_ultima_consulta,
      sc.status;`,
    [VIEW_NAME, solicitacoesTable, tableName, stageTable]
  )
}

const createResumoEtapasViewAntigo = async (knex, tableName) => {
  const solicitacoesTable = await resolveSolicitacoesTable(knex)

  return knex.schema.raw(
    `CREATE VIEW ?? AS
    SELECT
      sc.id AS solicitacao_id,
      sc.paciente_id,
      sc.medico_id,
      sc.convenio_id,
      sc.data_solicitacao,
      sc.data_ultima_consulta,
      sc.status AS status_solicitacao,
      MAX(CASE WHEN se.etapa = 'CARDIO' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS cardio_concluido,
      MAX(CASE WHEN se.etapa = 'APA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS apa_concluido,
      MAX(CASE WHEN se.etapa = 'LIBERACAO_GUIA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_guia_concluida,
      MAX(CASE WHEN se.etapa = 'LIBERACAO_OPME' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_opme_concluida,
      SUM(CASE WHEN se.status IN ('PENDENTE', 'ATRIBUIDO') THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ('EM_ANDAMENTO', 'PARADO', 'ATRASADO') THEN 1 ELSE 0 END) AS etapas_em_andamento,
      SUM(CASE WHEN se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS etapas_concluidas
    FROM ?? sc
    LEFT JOIN ?? se ON se.solicitacao_id = sc.id
    GROUP BY
      sc.id,
      sc.paciente_id,
      sc.medico_id,
      sc.convenio_id,
      sc.data_solicitacao,
      sc.data_ultima_consulta,
      sc.status;`,
    [VIEW_NAME, solicitacoesTable, tableName]
  )
}

const normalizeStageKey = (value) => {
  if (!value && value !== 0) return ''
  return String(value)
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
}

const ALLOWED_ENUMS = new Map([
  ['CARDIO', 'CARDIO'],
  ['APA', 'APA'],
  ['LIBERACAO_GUIA', 'LIBERACAO_GUIA'],
  ['LIBERACAO_OPME', 'LIBERACAO_OPME'],
])

async function findForeignKey(knex, tableName, constraintName) {
  if (!constraintName) return null

  const [rows] = await knex.raw(
    `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName]
  )

  return rows.length ? rows[0] : null
}

async function findSolicitacaoForeignKey(knex, tableName, constraintName) {
  if (!constraintName) return null

  const [rows] = await knex.raw(
    `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName]
  )

  return rows.length ? rows[0] : null
}

async function dropSolicitacaoForeignKey(knex, tableName) {
  for (const candidate of SOLICITACAO_FOREIGN_KEYS) {
    const constraint = await findSolicitacaoForeignKey(knex, tableName, candidate.name)
    if (constraint) {
      await knex.schema.raw('ALTER TABLE ?? DROP FOREIGN KEY ??', [tableName, candidate.name])
      return candidate
    }
  }

  return null
}

async function ensureSolicitacaoForeignKey(knex, tableName, preferred) {
  const seen = new Set()
  const candidates = []

  if (preferred) {
    candidates.push(preferred)
    seen.add(preferred.name)
  }

  for (const candidate of SOLICITACAO_FOREIGN_KEYS) {
    if (seen.has(candidate.name)) continue
    candidates.push(candidate)
    seen.add(candidate.name)
  }

  for (const candidate of candidates) {
    const hasTable = await knex.schema.hasTable(candidate.table)
    if (!hasTable) {
      continue
    }

    const constraint = await findSolicitacaoForeignKey(knex, tableName, candidate.name)
    if (constraint) {
      return candidate
    }

    await knex.schema.alterTable(tableName, (table) => {
      table
        .foreign('solicitacao_id', candidate.name)
        .references('id')
        .inTable(candidate.table)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })

    return candidate
  }

  return null
}

async function hasIndex(knex, tableName, indexName) {
  const [rows] = await knex.raw('SHOW INDEX FROM ?? WHERE Key_name = ?', [tableName, indexName])
  return rows.length > 0
}

async function dropIndexIfExists(knex, tableName, indexName, dropFn) {
  if (!(await hasIndex(knex, tableName, indexName))) return
  await knex.schema.alterTable(tableName, dropFn)
}

async function ensureIndex(knex, tableName, indexName, createFn) {
  if (await hasIndex(knex, tableName, indexName)) return
  await knex.schema.alterTable(tableName, createFn)
}


async function ensureStageForeignKey(knex, tableName, stageTable) {

  const constraint = await findForeignKey(knex, tableName, 'fk_solicitacao_etapas_procedimento')
  if (constraint) return

  await knex.schema.alterTable(tableName, (table) => {
    table
      .foreign('procedimento_etapa_id', 'fk_solicitacao_etapas_procedimento')
      .references('id')
      .inTable(stageTable)
      .onDelete('RESTRICT')
      .onUpdate('CASCADE')
  })
}

async function normalizeStageColumn(knex, tableName) {
  const [rows] = await knex.raw(
    `SELECT COLUMN_TYPE, DATA_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = 'procedimento_etapa_id'
     LIMIT 1`,
    [tableName]
  )

  if (!rows.length) {
    return
  }

  const column = rows[0]
  const dataType = String(column.DATA_TYPE || '').toLowerCase()
  const columnType = String(column.COLUMN_TYPE || '').toLowerCase()
  const isNullable = String(column.IS_NULLABLE || '').toUpperCase() === 'YES'

  const integerTypes = new Set(['tinyint', 'smallint', 'mediumint', 'int', 'bigint'])
  const isInteger = integerTypes.has(dataType)
  const isUnsigned = columnType.includes('unsigned')

  const shouldBeNullable = false
  const needsUnsigned = !isUnsigned
  const needsInteger = !isInteger

  let needsNotNull = false
  if (isNullable && !shouldBeNullable) {
    const [nullRows] = await knex.raw(
      `SELECT COUNT(*) AS total FROM ?? WHERE ?? IS NULL`,
      [tableName, 'procedimento_etapa_id']
    )
    const nullCount = Number(nullRows?.[0]?.total ?? nullRows?.[0]?.TOTAL ?? 0)
    needsNotNull = nullCount === 0
  }

  if (!needsUnsigned && !needsInteger && !needsNotNull) {
    return
  }

  const targetType = integerTypes.has(dataType) ? dataType.toUpperCase() : 'INT'
  const nullSql = needsNotNull || (!isNullable && !shouldBeNullable) ? 'NOT NULL' : 'NULL'

  await knex.raw(
    `ALTER TABLE ?? MODIFY COLUMN ?? ${targetType} UNSIGNED ${nullSql}`,
    [tableName, 'procedimento_etapa_id']
  )
}

exports.up = async function up(knex) {
  await dropResumoEtapasView(knex)

  const tableName = await ensureSolicitacaoEtapasTable(knex)
  const stageTable = await resolveProcedimentoEtapaTable(knex)
  const hasProcedimentoColumn = await knex.schema.hasColumn(tableName, 'procedimento_etapa_id')

  let solicitacaoFk = null
  if (!hasProcedimentoColumn) {
    solicitacaoFk = await dropSolicitacaoForeignKey(knex, tableName)

    await knex.schema.alterTable(tableName, (table) => {
      table.integer('procedimento_etapa_id').unsigned()
    })

    await dropIndexIfExists(knex, tableName, 'uq_solic_etapa', (table) => {
      table.dropUnique(['solicitacao_id', 'etapa'], 'uq_solic_etapa')
    })

    await dropIndexIfExists(knex, tableName, 'idx_etapa_solic', (table) => {
      table.dropIndex(['solicitacao_id', 'etapa'], 'idx_etapa_solic')
    })

    await knex.raw(
      `UPDATE ?? se
      LEFT JOIN (
        SELECT MIN(id) AS id, UPPER(nome) AS nome_normalizado
        FROM ??
        GROUP BY UPPER(nome)
      ) pe ON pe.nome_normalizado = se.etapa
      SET se.procedimento_etapa_id = pe.id`,
      [tableName, stageTable]
    )

    const existingStages = await knex(stageTable).select('id', 'nome')
    const stageCache = new Map()
    for (const stage of existingStages) {
      const key = normalizeStageKey(stage.nome)
      if (key && !stageCache.has(key)) {
        stageCache.set(key, stage.id)
      }
    }

    const pendingRows = await knex(tableName)
      .select('id', 'etapa')
      .whereNull('procedimento_etapa_id')

    for (const row of pendingRows) {
      const key = normalizeStageKey(row.etapa)
      let stageId = stageCache.get(key)

      if (!stageId) {
        const insertData = {
          nome: row.etapa,
          procedimento_tipo_ids: JSON.stringify([]),
          convenio_ids: JSON.stringify([]),
          convenio_referencias: null,
          usa_integracao: 0,
          ativo: 1,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        }

        const insertResult = await knex(stageTable).insert(insertData)
        stageId = Array.isArray(insertResult) ? insertResult[0] : insertResult
        stageCache.set(key, stageId)
      }

      await knex(tableName)
        .where({ id: row.id })
        .update({ procedimento_etapa_id: stageId })
    }

    const [remaining] = await knex(tableName)
      .whereNull('procedimento_etapa_id')
      .count({ total: '*' })
    const missing = Number(remaining?.total ?? remaining?.Total ?? 0)
    if (missing > 0) {
      throw new Error('Não foi possível atribuir procedimento_etapa_id para todas as etapas da solicitação')
    }

    await knex.schema.alterTable(tableName, (table) => {
      table.integer('procedimento_etapa_id').unsigned().notNullable().alter()
    })

    await ensureStageForeignKey(knex, tableName, stageTable)

    await ensureIndex(knex, tableName, 'uq_solic_etapa', (table) => {
      table.unique(['solicitacao_id', 'procedimento_etapa_id'], 'uq_solic_etapa')
    })

    await ensureIndex(knex, tableName, 'idx_etapa_solic', (table) => {
      table.index(['solicitacao_id', 'procedimento_etapa_id'], 'idx_etapa_solic')
    })

    await ensureIndex(knex, tableName, 'idx_solic_procedimento_etapa', (table) => {
      table.index(['procedimento_etapa_id'], 'idx_solic_procedimento_etapa')
    })

    const hasEtapaColumn = await knex.schema.hasColumn(tableName, 'etapa')
    if (hasEtapaColumn) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('etapa')
      })
    }
  } else {
    await ensureStageForeignKey(knex, tableName, stageTable)

    await ensureIndex(knex, tableName, 'uq_solic_etapa', (table) => {
      table.unique(['solicitacao_id', 'procedimento_etapa_id'], 'uq_solic_etapa')
    })

    await ensureIndex(knex, tableName, 'idx_etapa_solic', (table) => {
      table.index(['solicitacao_id', 'procedimento_etapa_id'], 'idx_etapa_solic')
    })

    await ensureIndex(knex, tableName, 'idx_solic_procedimento_etapa', (table) => {
      table.index(['procedimento_etapa_id'], 'idx_solic_procedimento_etapa')
    })
  }

  await ensureSolicitacaoForeignKey(knex, tableName, solicitacaoFk)
  await createResumoEtapasViewNovo(knex, tableName, stageTable)
}

exports.down = async function down(knex) {
  await dropResumoEtapasView(knex)

  const tableName = await ensureSolicitacaoEtapasTable(knex)
  const hasProcedimentoColumn = await knex.schema.hasColumn(tableName, 'procedimento_etapa_id')
  if (!hasProcedimentoColumn) {
    await createResumoEtapasViewAntigo(knex, tableName)
    return
  }

  const stageTable = await resolveProcedimentoEtapaTable(knex)
  const solicitacaoFk = await dropSolicitacaoForeignKey(knex, tableName)

  const stageFk = await findForeignKey(knex, tableName, 'fk_solicitacao_etapas_procedimento')
  if (stageFk) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropForeign('procedimento_etapa_id', 'fk_solicitacao_etapas_procedimento')
    })
  }

  await dropIndexIfExists(knex, tableName, 'uq_solic_etapa', (table) => {
    table.dropUnique(['solicitacao_id', 'procedimento_etapa_id'], 'uq_solic_etapa')
  })

  await dropIndexIfExists(knex, tableName, 'idx_etapa_solic', (table) => {
    table.dropIndex(['solicitacao_id', 'procedimento_etapa_id'], 'idx_etapa_solic')
  })

  await dropIndexIfExists(knex, tableName, 'idx_solic_procedimento_etapa', (table) => {
    table.dropIndex(['procedimento_etapa_id'], 'idx_solic_procedimento_etapa')
  })

  const hasEtapaColumn = await knex.schema.hasColumn(tableName, 'etapa')
  if (!hasEtapaColumn) {
    await knex.schema.alterTable(tableName, (table) => {
      table
        .enu('etapa', ['CARDIO', 'APA', 'LIBERACAO_GUIA', 'LIBERACAO_OPME'])
        .nullable()
    })
  }

  const rows = await knex(tableName).select('id', 'procedimento_etapa_id')
  if (rows.length) {
    const stageRows = await knex(stageTable).select('id', 'nome')
    const stageMap = new Map(stageRows.map((stage) => [Number(stage.id), stage.nome]))

    for (const row of rows) {
      const stageName = stageMap.get(Number(row.procedimento_etapa_id)) || ''
      const normalized = normalizeStageKey(stageName)
      const etapaEnum = ALLOWED_ENUMS.get(normalized)

      if (!etapaEnum) {
        throw new Error(
          `Não foi possível mapear a etapa "${stageName}" (ID ${row.procedimento_etapa_id}) para o enum original`
        )
      }

      await knex(tableName)
        .where({ id: row.id })
        .update({ etapa: etapaEnum })
    }
  }

  const [remaining] = await knex(tableName)
    .whereNull('etapa')
    .count({ total: '*' })
  const missing = Number(remaining?.total ?? remaining?.Total ?? 0)
  if (missing > 0) {
    throw new Error('Não foi possível restaurar os valores da coluna etapa')
  }

  await knex.schema.alterTable(tableName, (table) => {
    table
      .enu('etapa', ['CARDIO', 'APA', 'LIBERACAO_GUIA', 'LIBERACAO_OPME'])
      .notNullable()
      .alter()
  })

  await ensureIndex(knex, tableName, 'uq_solic_etapa', (table) => {
    table.unique(['solicitacao_id', 'etapa'], 'uq_solic_etapa')
  })

  await ensureIndex(knex, tableName, 'idx_etapa_solic', (table) => {
    table.index(['solicitacao_id', 'etapa'], 'idx_etapa_solic')
  })

  const hasProcedimentoAgain = await knex.schema.hasColumn(tableName, 'procedimento_etapa_id')
  if (hasProcedimentoAgain) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn('procedimento_etapa_id')
    })
  }

  await ensureSolicitacaoForeignKey(knex, tableName, solicitacaoFk)
  await createResumoEtapasViewAntigo(knex, tableName)
}
