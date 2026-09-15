const TABLE_NAME = 'esteira_procedimento_etapas'
const VIEW_NAME = 'vw_solicitacoes_resumo_etapas'

const SOLICITACAO_TABLE_CANDIDATES_UP = [
  { name: 'fk_etapa_esteira_proc', table: 'esteira_procedimento' },
  { name: 'fk_etapa_solic_proc', table: 'solicitacoes_proc' },
  { name: 'fk_etapa_solic', table: 'solicitacoes_cirurgia' },
]

const SOLICITACAO_TABLE_CANDIDATES_DOWN = [
  { name: 'fk_etapa_solic_proc', table: 'solicitacoes_proc' },
  { name: 'fk_etapa_solic', table: 'solicitacoes_cirurgia' },
  { name: 'fk_etapa_esteira_proc', table: 'esteira_procedimento' },
]

const STAGE_TABLE_CANDIDATES = ['esteira_procedimento_etapa', 'procedimento_etapas']

const dropResumoEtapasView = (knex) => knex.schema.raw('DROP VIEW IF EXISTS ??', [VIEW_NAME])

async function ensureSolicitacaoEtapasTable(knex) {
  if (await knex.schema.hasTable(TABLE_NAME)) {
    return TABLE_NAME
  }

  const legacyTable = 'solicitacao_etapas'
  if (await knex.schema.hasTable(legacyTable)) {
    return legacyTable
  }

  throw new Error('Tabela "esteira_procedimento_etapas" não encontrada')
}

async function resolveStageTable(knex) {
  for (const candidate of STAGE_TABLE_CANDIDATES) {
    if (await knex.schema.hasTable(candidate)) {
      return candidate
    }
  }

  throw new Error('Tabela de etapas de procedimento não encontrada')
}

async function resolveSolicitacoesTable(knex, candidates) {
  for (const candidate of candidates) {
    if (await knex.schema.hasTable(candidate.table)) {
      return candidate
    }
  }

  throw new Error('Nenhuma tabela de solicitações encontrada para criar a view de resumo')
}

async function dropForeignKey(knex, tableName, constraintName) {
  await knex.schema.raw('ALTER TABLE ?? DROP FOREIGN KEY ??', [tableName, constraintName])
}

async function fetchSolicitacaoForeignKeys(knex, tableName) {
  return knex('information_schema.KEY_COLUMN_USAGE')
    .select('CONSTRAINT_NAME', 'REFERENCED_TABLE_NAME')
    .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('TABLE_NAME', tableName)
    .andWhere('COLUMN_NAME', 'solicitacao_id')
    .whereNotNull('REFERENCED_TABLE_NAME')
}

async function ensureSolicitacaoForeignKey(knex, tableName, candidates) {
  const candidateNames = new Set(candidates.map((item) => item.name))

  for (const candidate of candidates) {
    if (!(await knex.schema.hasTable(candidate.table))) {
      continue
    }

    const foreignKeys = await fetchSolicitacaoForeignKeys(knex, tableName)
    const exactMatch = foreignKeys.find(
      (fk) => fk.CONSTRAINT_NAME === candidate.name && fk.REFERENCED_TABLE_NAME === candidate.table,
    )

    if (exactMatch) {
      return candidate
    }

    const sameName = foreignKeys.find((fk) => fk.CONSTRAINT_NAME === candidate.name)
    if (sameName) {
      await dropForeignKey(knex, tableName, sameName.CONSTRAINT_NAME)
    }

    for (const fk of foreignKeys) {
      if (fk.CONSTRAINT_NAME !== candidate.name && candidateNames.has(fk.CONSTRAINT_NAME)) {
        await dropForeignKey(knex, tableName, fk.CONSTRAINT_NAME)
      }
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

  throw new Error('Não foi possível definir a foreign key solicitacao_id')
}

async function createResumoEtapasViewNovo(knex, solicitacoesTable, etapasTable, stageTable) {
  await knex.schema.raw(
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
    [VIEW_NAME, solicitacoesTable.table, etapasTable, stageTable],
  )
}

async function createResumoEtapasViewAntigo(knex, solicitacoesTable, etapasTable) {
  await knex.schema.raw(
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
    [VIEW_NAME, solicitacoesTable.table, etapasTable],
  )
}

exports.up = async function up(knex) {
  const tableName = await ensureSolicitacaoEtapasTable(knex)
  const stageTable = await resolveStageTable(knex)
  const solicitacoesTable = await resolveSolicitacoesTable(knex, SOLICITACAO_TABLE_CANDIDATES_UP)

  await dropResumoEtapasView(knex)
  await ensureSolicitacaoForeignKey(knex, tableName, SOLICITACAO_TABLE_CANDIDATES_UP)
  await createResumoEtapasViewNovo(knex, solicitacoesTable, tableName, stageTable)
}

exports.down = async function down(knex) {
  const tableName = await ensureSolicitacaoEtapasTable(knex)
  const solicitacoesTable = await resolveSolicitacoesTable(knex, SOLICITACAO_TABLE_CANDIDATES_DOWN)

  await dropResumoEtapasView(knex)
  await ensureSolicitacaoForeignKey(knex, tableName, SOLICITACAO_TABLE_CANDIDATES_DOWN)
  await createResumoEtapasViewAntigo(knex, solicitacoesTable, tableName)
}
