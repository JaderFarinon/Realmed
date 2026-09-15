const TABLE_NAME = 'esteira_procedimento_etapas'
const VIEW_NAME = 'vw_solicitacoes_resumo_etapas'

const STATUS_ENUM_SQL = "ENUM('PENDENTE','ATRIBUIDO','EM_ANDAMENTO','PARADO','ATRASADO','CONCLUIDO')"
const STATUS_ENUM_SQL_LEGACY = "ENUM('PENDENTE','EM_ANDAMENTO','CONCLUIDO')"

const STATUS_PENDENTES_NOVO = "('PENDENTE', 'ATRIBUIDO')"
const STATUS_EM_ANDAMENTO_NOVO = "('EM_ANDAMENTO', 'PARADO', 'ATRASADO')"
const STATUS_PENDENTES_LEGACY = "('PENDENTE')"
const STATUS_EM_ANDAMENTO_LEGACY = "('EM_ANDAMENTO')"

const hasTable = (knex, table) => knex.schema.hasTable(table)

const hasView = async (knex, viewName) => {
  const [rows] = await knex.schema.raw(
    `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [viewName],
  )
  return Array.isArray(rows) && rows.length > 0
}

const dropViewIfExists = (knex, viewName) => knex.schema.raw('DROP VIEW IF EXISTS ??', [viewName])

const resolveSolicitacoesTable = async (knex) => {
  const candidates = [
    { name: 'fk_etapa_esteira_proc', table: 'esteira_procedimento' },
    { name: 'fk_etapa_solic_proc', table: 'solicitacoes_proc' },
    { name: 'fk_etapa_solic', table: 'solicitacoes_cirurgia' },
  ]

  for (const candidate of candidates) {
    if (await hasTable(knex, candidate.table)) {
      return candidate
    }
  }

  throw new Error('Nenhuma tabela de solicitações encontrada para atualizar a view de etapas')
}

const resolveStageTable = async (knex) => {
  const candidates = ['esteira_procedimento_etapa', 'procedimento_etapas']
  for (const candidate of candidates) {
    if (await hasTable(knex, candidate)) {
      return candidate
    }
  }

  return null
}

const createResumoEtapasView = async (knex, solicitacoesTable, etapasTable, stageTable) =>
  knex.schema.raw(
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
      SUM(CASE WHEN se.status IN ${STATUS_PENDENTES_NOVO} THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ${STATUS_EM_ANDAMENTO_NOVO} THEN 1 ELSE 0 END) AS etapas_em_andamento,
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

const createResumoEtapasViewSemTabelaEtapas = async (knex, solicitacoesTable, etapasTable) =>
  knex.schema.raw(
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
      SUM(CASE WHEN se.status IN ${STATUS_PENDENTES_NOVO} THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ${STATUS_EM_ANDAMENTO_NOVO} THEN 1 ELSE 0 END) AS etapas_em_andamento,
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

exports.up = async function up(knex) {
  if (await hasTable(knex, TABLE_NAME)) {
    await knex.schema.raw(
      `ALTER TABLE ?? MODIFY COLUMN ?? ${STATUS_ENUM_SQL} NOT NULL DEFAULT 'PENDENTE'`,
      [TABLE_NAME, 'status'],
    )
  }

  if (await hasView(knex, VIEW_NAME)) {
    const solicitacoesTable = await resolveSolicitacoesTable(knex)
    const etapasTable = TABLE_NAME
    const stageTable = await resolveStageTable(knex)

    await dropViewIfExists(knex, VIEW_NAME)
    if (stageTable) {
      await createResumoEtapasView(knex, solicitacoesTable, etapasTable, stageTable)
    } else {
      await createResumoEtapasViewSemTabelaEtapas(knex, solicitacoesTable, etapasTable)
    }
  }
}

exports.down = async function down(knex) {
  if (await hasTable(knex, TABLE_NAME)) {
    await knex.schema.raw(
      `ALTER TABLE ?? MODIFY COLUMN ?? ${STATUS_ENUM_SQL_LEGACY} NOT NULL DEFAULT 'PENDENTE'`,
      [TABLE_NAME, 'status'],
    )
  }

  if (await hasView(knex, VIEW_NAME)) {
    const solicitacoesTable = await resolveSolicitacoesTable(knex)
    const etapasTable = TABLE_NAME

    await dropViewIfExists(knex, VIEW_NAME)
    await createResumoEtapasViewLegacy(knex, solicitacoesTable, etapasTable)
  }
}
const createResumoEtapasViewLegacy = async (knex, solicitacoesTable, etapasTable) =>
  knex.schema.raw(
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
      SUM(CASE WHEN se.status IN ${STATUS_PENDENTES_LEGACY} THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ${STATUS_EM_ANDAMENTO_LEGACY} THEN 1 ELSE 0 END) AS etapas_em_andamento,
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
