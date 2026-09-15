const DATA_FILTER_TYPES = {
  CRIACAO: 'criacao',
  ULTIMA_MOVIMENTACAO: 'ultima_movimentacao',
}

const DATE_PARAM_REGEX = /^\d{4}-\d{2}-\d{2}$/

const normalizeTipoData = (value) => {
  if (typeof value !== 'string') {
    return DATA_FILTER_TYPES.CRIACAO
  }

  return value === DATA_FILTER_TYPES.ULTIMA_MOVIMENTACAO
    ? DATA_FILTER_TYPES.ULTIMA_MOVIMENTACAO
    : DATA_FILTER_TYPES.CRIACAO
}

const parseDateParam = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!DATE_PARAM_REGEX.test(trimmed)) {
    return null
  }

  return trimmed
}

const parseDateFilters = (query = {}) => {
  const dataInicio = parseDateParam(query.dataInicio)
  const dataFim = parseDateParam(query.dataFim)
  const tipoData = normalizeTipoData(query.tipoData)

  return {
    dataInicio,
    dataFim,
    tipoData,
  }
}

const buildCriacaoBaseQuery = (tables) => `
  SELECT
    sc.id AS solicitacao_id,
    sc.created_at AS data_referencia
  FROM ${tables.solicitacoes} sc
  WHERE sc.created_at IS NOT NULL
`

const buildUltimaMovimentacaoBaseQuery = (tables, options = {}) => {
  const {
    includeEtapaAnexos = false,
    includeChatMensagens = false,
    includeChatAnexos = false,
  } = options

  const joins = []

  joins.push(`
    LEFT JOIN (
      SELECT
        solicitacao_id,
        MAX(
          GREATEST(
            COALESCE(updated_at, '1970-01-01 00:00:00'),
            COALESCE(dt_conclusao, '1970-01-01 00:00:00'),
            COALESCE(dt_prevista, '1970-01-01 00:00:00'),
            COALESCE(created_at, '1970-01-01 00:00:00')
          )
        ) AS ultima_movimentacao
      FROM ${tables.etapas}
      GROUP BY solicitacao_id
    ) etapas ON etapas.solicitacao_id = sc.id
  `)

  if (includeEtapaAnexos && tables.etapaAnexos) {
    joins.push(`
      LEFT JOIN (
        SELECT
          se.solicitacao_id,
          MAX(COALESCE(a.updated_at, a.created_at)) AS ultima_movimentacao
        FROM ${tables.etapaAnexos} a
        INNER JOIN ${tables.etapas} se ON se.id = a.solicitacao_etapa_id
        WHERE a.deleted_at IS NULL
        GROUP BY se.solicitacao_id
      ) etapaAnexos ON etapaAnexos.solicitacao_id = sc.id
    `)
  }

  if (includeChatMensagens && tables.chatMensagens) {
    joins.push(`
      LEFT JOIN (
        SELECT
          se.solicitacao_id,
          MAX(COALESCE(m.updated_at, m.created_at)) AS ultima_movimentacao
        FROM ${tables.chatMensagens} m
        INNER JOIN ${tables.etapas} se ON se.id = m.solicitacao_etapa_id
        GROUP BY se.solicitacao_id
      ) chatMensagens ON chatMensagens.solicitacao_id = sc.id
    `)
  }

  if (includeChatAnexos && tables.chatAnexos && tables.chatMensagens) {
    joins.push(`
      LEFT JOIN (
        SELECT
          se.solicitacao_id,
          MAX(COALESCE(a.updated_at, a.created_at)) AS ultima_movimentacao
        FROM ${tables.chatAnexos} a
        INNER JOIN ${tables.chatMensagens} m ON m.id = a.chat_mensagem_id
        INNER JOIN ${tables.etapas} se ON se.id = m.solicitacao_etapa_id
        WHERE a.deleted_at IS NULL
        GROUP BY se.solicitacao_id
      ) chatAnexos ON chatAnexos.solicitacao_id = sc.id
    `)
  }

  return `
    SELECT
      sc.id AS solicitacao_id,
      GREATEST(
        COALESCE(sc.updated_at, '1970-01-01 00:00:00'),
        COALESCE(sc.created_at, '1970-01-01 00:00:00'),
        COALESCE(sc.data_solicitacao, '1970-01-01 00:00:00'),
        COALESCE(etapas.ultima_movimentacao, '1970-01-01 00:00:00')
        ${includeEtapaAnexos ? ", COALESCE(etapaAnexos.ultima_movimentacao, '1970-01-01 00:00:00')" : ''}
        ${includeChatMensagens ? ", COALESCE(chatMensagens.ultima_movimentacao, '1970-01-01 00:00:00')" : ''}
        ${includeChatAnexos ? ", COALESCE(chatAnexos.ultima_movimentacao, '1970-01-01 00:00:00')" : ''}
      ) AS data_referencia
    FROM ${tables.solicitacoes} sc
    ${joins.join('\n')}
  `
}

const buildSolicitacoesBaseQuery = (tables, tipoData, options = {}) => {
  if (tipoData === DATA_FILTER_TYPES.ULTIMA_MOVIMENTACAO) {
    return buildUltimaMovimentacaoBaseQuery(tables, options)
  }

  return buildCriacaoBaseQuery(tables)
}

const buildSolicitacoesFiltro = (tables, { tipoData, dataInicio, dataFim }, options = {}) => {
  const baseQuery = buildSolicitacoesBaseQuery(tables, tipoData, options)
  const conditions = []
  const params = []

  if (dataInicio) {
    conditions.push('base.data_referencia >= ?')
    params.push(`${dataInicio} 00:00:00`)
  }

  if (dataFim) {
    conditions.push('base.data_referencia <= ?')
    params.push(`${dataFim} 23:59:59`)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  return {
    hasFilter: conditions.length > 0,
    params,
    subquery: `
      SELECT
        base.solicitacao_id,
        base.data_referencia
      FROM (
        ${baseQuery}
      ) AS base
      ${whereClause}
    `,
  }
}

module.exports = {
  DATA_FILTER_TYPES,
  buildSolicitacoesBaseQuery,
  buildSolicitacoesFiltro,
  normalizeTipoData,
  parseDateFilters,
}
