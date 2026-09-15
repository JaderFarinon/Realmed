const db = require('../db')
const {
  buildTransporter,
  hasValidEmail,
  normalizeText,
  parseOptionalInteger,
} = require('./mailer')

const NOTIFICACOES_TABLE = 'esteira_notificacoes'
const DESTINATARIOS_TABLE = 'esteira_notificacao_destinatarios'
const ESTEIRA_PROCEDIMENTO_TABLE = 'esteira_procedimento'
const SOLICITACAO_ETAPAS_TABLE = 'esteira_procedimento_etapas'
const PROCEDIMENTO_ETAPAS_TABLE = 'esteira_procedimento_etapa'
const CAC_PERFIS_TABLE = 'esteira_perfis_cac'
const PARAMETROS_TABLE = 'parametros_esteira_procedimento'

const NOTIFICATION_TYPES = {
  TASK_STATUS: 'task_status_change',
  TASK_DEADLINE: 'task_deadline_alert',
  SURGERY_DEADLINE: 'surgery_deadline_alert',
  WEEKLY_DASHBOARD: 'weekly_dashboard',
}

const NOTIFICATION_STATUS = {
  PENDING: 'PENDENTE',
  SENDING: 'ENVIANDO',
  SENT: 'ENVIADO',
  FAILED: 'FALHA',
}

const RECIPIENT_STATUS = {
  PENDING: 'PENDENTE',
  SENT: 'ENVIADO',
  FAILED: 'FALHA',
}

const STATUS_LABELS = {
  PENDENTE: 'Pendente',
  ATRIBUIDO: 'Atribuído',
  EM_ANDAMENTO: 'Em andamento',
  PARADO: 'Parado',
  ATRASADO: 'Atrasado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

let tablesAvailabilityCache = {
  notificacoes: null,
  destinatarios: null,
  cacPerfis: null,
  parametros: null,
}

const resetAvailabilityCache = () => {
  tablesAvailabilityCache = {
    notificacoes: null,
    destinatarios: null,
    cacPerfis: null,
    parametros: null,
  }
}

const checkTableExists = async (tableName) => {
  try {
    const [rows] = await db.query('SHOW TABLES LIKE ?', [tableName])
    return Array.isArray(rows) && rows.length > 0
  } catch (error) {
    console.warn('[Notificações] Falha ao verificar tabela', tableName, error?.message || error)
    return false
  }
}

const ensureNotificationsTables = async () => {
  if (tablesAvailabilityCache.notificacoes === null) {
    tablesAvailabilityCache.notificacoes = await checkTableExists(NOTIFICACOES_TABLE)
  }

  if (tablesAvailabilityCache.destinatarios === null) {
    tablesAvailabilityCache.destinatarios = await checkTableExists(DESTINATARIOS_TABLE)
  }

  return tablesAvailabilityCache.notificacoes && tablesAvailabilityCache.destinatarios
}

const ensureParametrosDisponiveis = async () => {
  if (tablesAvailabilityCache.parametros === null) {
    tablesAvailabilityCache.parametros = await checkTableExists(PARAMETROS_TABLE)
  }
  return tablesAvailabilityCache.parametros
}

const ensureCacPerfisDisponiveis = async () => {
  if (tablesAvailabilityCache.cacPerfis === null) {
    tablesAvailabilityCache.cacPerfis = await checkTableExists(CAC_PERFIS_TABLE)
  }
  return tablesAvailabilityCache.cacPerfis
}

const formatStatusLabel = (status) => {
  if (!status) {
    return 'Indefinido'
  }
  const upper = String(status).toUpperCase()
  return STATUS_LABELS[upper] || upper
}

const formatDateTime = (value) => {
  if (!value) {
    return null
  }

  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) {
      return null
    }

    return date.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    return null
  }
}

const parseIntegerOrDefault = (value, defaultValue) => {
  const parsed = parseOptionalInteger(value)
  if (parsed === null) {
    return defaultValue
  }
  return parsed
}

const escapeHtml = (value) => {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const fetchParametro = async (parametro, defaultValue = null) => {
  const disponivel = await ensureParametrosDisponiveis()
  if (!disponivel) {
    return defaultValue
  }

  try {
    const [rows] = await db.query(
      `SELECT valor FROM ${PARAMETROS_TABLE} WHERE parametro = ? LIMIT 1`,
      [parametro],
    )

    if (Array.isArray(rows) && rows.length) {
      return rows[0].valor
    }
  } catch (error) {
    console.warn('[Notificações] Falha ao carregar parâmetro', parametro, error?.message || error)
  }

  return defaultValue
}

const fetchUserDetails = async (userIds) => {
  if (!Array.isArray(userIds) || !userIds.length) {
    return new Map()
  }

  const placeholders = userIds.map(() => '?').join(', ')
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.username, p.full_name, p.email\n         FROM users u\n         LEFT JOIN people p ON p.id = u.person_id\n        WHERE u.id IN (${placeholders})`,
      userIds,
    )

    const map = new Map()
    for (const row of rows || []) {
      const id = Number(row.id)
      const nome = normalizeText(row.full_name) || normalizeText(row.username)
      const email = normalizeText(row.email)
      map.set(id, { id, nome: nome || `Usuário #${id}`, email })
    }

    return map
  } catch (error) {
    console.warn('[Notificações] Falha ao buscar usuários', error?.message || error)
    return new Map()
  }
}

const fetchCacCoordenadores = async () => {
  const disponivel = await ensureCacPerfisDisponiveis()
  if (!disponivel) {
    return []
  }

  try {
    const [rows] = await db.query(
      `SELECT perfis.user_id, p.email, COALESCE(p.full_name, u.username) AS nome\n         FROM ${CAC_PERFIS_TABLE} perfis\n         INNER JOIN users u ON u.id = perfis.user_id\n         LEFT JOIN people p ON p.id = u.person_id\n        WHERE perfis.is_coordenacao = 1`,
    )

    return (rows || []).map((row) => ({
      userId: Number(row.user_id) || null,
      email: normalizeText(row.email),
      nome: normalizeText(row.nome) || 'Coordenador CAC',
    }))
  } catch (error) {
    console.warn('[Notificações] Falha ao carregar coordenadores do CAC', error?.message || error)
    return []
  }
}

const buildNotificationMessage = ({
  titulo,
  corpo,
  detalhes = [],
  rodape,
}) => {
  const itens = Array.isArray(detalhes)
    ? detalhes
        .filter((item) => item && item.label)
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.valor ?? '-')}</li>`,
        )
        .join('')
    : ''

  const detalhesHtml = itens ? `<ul>${itens}</ul>` : ''

  const corpoHtml = Array.isArray(corpo)
    ? corpo.map((paragrafo) => `<p>${paragrafo}</p>`).join('')
    : `<p>${corpo}</p>`

  const rodapeHtml = rodape
    ? `<p style="margin-top:16px;font-size:12px;color:#6b7280;">${escapeHtml(rodape)}</p>`
    : ''

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.5;">
      <h2 style="margin-bottom:12px;color:#2563eb;">${escapeHtml(titulo)}</h2>
      ${corpoHtml}
      ${detalhesHtml}
      ${rodapeHtml}
    </div>
  `
}

const createNotificationRecord = async ({
  tipo,
  assunto,
  mensagem,
  solicitacaoId = null,
  etapaId = null,
  dados = null,
  destinatarios = [],
  scheduledAt = null,
}) => {
  const tablesDisponiveis = await ensureNotificationsTables()
  if (!tablesDisponiveis) {
    console.warn('[Notificações] Tabelas de notificações indisponíveis, registro não será criado.')
    return null
  }

  const destinatariosValidos = destinatarios.filter((dest) => hasValidEmail(dest.email))
  if (!destinatariosValidos.length) {
    console.warn('[Notificações] Nenhum destinatário válido para a notificação', tipo)
    return null
  }

  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()

    const [resultado] = await conn.query(
      `INSERT INTO ${NOTIFICACOES_TABLE} (tipo, status, solicitacao_id, etapa_id, assunto, mensagem, dados_json, scheduled_at, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        tipo,
        NOTIFICATION_STATUS.PENDING,
        solicitacaoId || null,
        etapaId || null,
        assunto,
        mensagem,
        dados ? JSON.stringify(dados) : null,
        scheduledAt ? new Date(scheduledAt) : new Date(),
      ],
    )

    const notificacaoId = resultado?.insertId ? Number(resultado.insertId) : null
    if (!notificacaoId) {
      throw new Error('Falha ao criar registro de notificação')
    }

  const valoresDestinatarios = destinatariosValidos.map((dest) => [
    notificacaoId,
    dest.userId || null,
    normalizeText(dest.email),
    RECIPIENT_STATUS.PENDING,
    new Date(),
    new Date(),
  ])

  await conn.query(
    `INSERT INTO ${DESTINATARIOS_TABLE} (notificacao_id, user_id, email, status, created_at, updated_at) VALUES ?`,
    [valoresDestinatarios],
    )

    await conn.commit()
    return notificacaoId
  } catch (error) {
    await conn.rollback()
    console.error('[Notificações] Erro ao criar registro de notificação', error)
    return null
  } finally {
    conn.release()
  }
}

const queueTaskStatusChangeNotification = async ({
  solicitacaoId,
  solicitacao = {},
  etapa = {},
  statusAnterior = null,
  statusNovo = null,
  responsavelAnterior = null,
  responsavelNovo = null,
}) => {
  try {
    const solicitanteId = parseOptionalInteger(solicitacao.created_by)
    const responsavelId = parseOptionalInteger(responsavelNovo || etapa?.responsavel_id)

    const usuarioIds = [solicitanteId, responsavelId].filter((id) => Number.isFinite(id))
    const usuariosMap = await fetchUserDetails(usuarioIds)
    const cacCoordenadores = await fetchCacCoordenadores()

    const destinatarios = []

    if (solicitanteId && usuariosMap.has(solicitanteId)) {
      const solicitante = usuariosMap.get(solicitanteId)
      destinatarios.push({ userId: solicitanteId, email: solicitante.email, nome: solicitante.nome })
    }

    if (responsavelId && usuariosMap.has(responsavelId)) {
      const responsavel = usuariosMap.get(responsavelId)
      destinatarios.push({ userId: responsavelId, email: responsavel.email, nome: responsavel.nome })
    }

    destinatarios.push(
      ...cacCoordenadores.map((coordenador) => ({
        userId: coordenador.userId,
        email: coordenador.email,
        nome: coordenador.nome,
      })),
    )

    const destinatariosUnicos = []
    const emailsRegistrados = new Set()

    for (const destinatario of destinatarios) {
      const emailNormalizado = normalizeText(destinatario.email)
      if (!emailNormalizado || emailsRegistrados.has(emailNormalizado)) {
        continue
      }
      emailsRegistrados.add(emailNormalizado)
      destinatariosUnicos.push({ ...destinatario, email: emailNormalizado })
    }

    if (!destinatariosUnicos.length) {
      console.warn('[Notificações] Nenhum destinatário encontrado para notificação de status de tarefa')
      return null
    }

    const etapaId = parseOptionalInteger(etapa?.id)
    let etapaNome = null

    if (parseOptionalInteger(etapa?.procedimento_etapa_id)) {
      try {
        const [rows] = await db.query(
          `SELECT nome FROM ${PROCEDIMENTO_ETAPAS_TABLE} WHERE id = ? LIMIT 1`,
          [parseOptionalInteger(etapa.procedimento_etapa_id)],
        )
        if (Array.isArray(rows) && rows.length) {
          etapaNome = normalizeText(rows[0].nome)
        }
      } catch (error) {
        console.warn('[Notificações] Falha ao buscar nome da etapa', error?.message || error)
      }
    }

    const pacienteNome = normalizeText(solicitacao.nome_paciente) || 'Paciente não informado'
    const numeroSolicitacao = parseOptionalInteger(solicitacao.id)

    const assunto = `[Esteira] Tarefa ${etapaNome || etapaId || ''} atualizada para ${formatStatusLabel(statusNovo)}`
    const mensagem = buildNotificationMessage({
      titulo: 'Atualização de status de tarefa',
      corpo: [
        'Uma tarefa da esteira cirúrgica teve o status atualizado.',
        `Status atual: <strong>${escapeHtml(formatStatusLabel(statusNovo))}</strong>.`,
      ],
      detalhes: [
        { label: 'Solicitação', valor: numeroSolicitacao ? `#${numeroSolicitacao}` : '-' },
        { label: 'Paciente', valor: pacienteNome },
        { label: 'Etapa', valor: etapaNome || `ID ${etapaId || '-'}` },
        { label: 'Status anterior', valor: formatStatusLabel(statusAnterior) },
        { label: 'Status atual', valor: formatStatusLabel(statusNovo) },
      ],
      rodape: 'Esta é uma mensagem automática. Não responda este e-mail.',
    })

    return createNotificationRecord({
      tipo: NOTIFICATION_TYPES.TASK_STATUS,
      assunto,
      mensagem,
      solicitacaoId: numeroSolicitacao,
      etapaId,
      dados: {
        statusAnterior,
        statusNovo,
        solicitacaoId: numeroSolicitacao,
        etapaId,
      },
      destinatarios: destinatariosUnicos,
    })
  } catch (error) {
    console.error('[Notificações] Erro ao enfileirar notificação de status de tarefa', error)
    return null
  }
}

const obterTransporterSeguro = () => {
  try {
    return buildTransporter()
  } catch (error) {
    console.warn('[Notificações] Configuração SMTP indisponível:', error?.message || error)
    return null
  }
}

const processNotificationQueue = async (limit = 10) => {
  const tablesDisponiveis = await ensureNotificationsTables()
  if (!tablesDisponiveis) {
    return 0
  }

  const transporterInfo = obterTransporterSeguro()
  if (!transporterInfo) {
    return 0
  }

  const { transporter, fromAddress } = transporterInfo
  let processadas = 0

  try {
    const [rows] = await db.query(
      `SELECT * FROM ${NOTIFICACOES_TABLE}\n        WHERE status = ?\n          AND (scheduled_at IS NULL OR scheduled_at <= NOW())\n        ORDER BY created_at ASC\n        LIMIT ?`,
      [NOTIFICATION_STATUS.PENDING, limit],
    )

    for (const notificacao of rows || []) {
      const notificacaoId = Number(notificacao.id)
      if (!notificacaoId) {
        continue
      }

      try {
        const [resultadoAtualizacao] = await db.query(
          `UPDATE ${NOTIFICACOES_TABLE}\n              SET status = ?, updated_at = NOW()\n            WHERE id = ? AND status = ?`,
          [NOTIFICATION_STATUS.SENDING, notificacaoId, NOTIFICATION_STATUS.PENDING],
        )

        if (!resultadoAtualizacao || resultadoAtualizacao.affectedRows === 0) {
          continue
        }

        const [destinatariosRows] = await db.query(
          `SELECT d.*, COALESCE(p.full_name, u.username) AS nome\n             FROM ${DESTINATARIOS_TABLE} d\n             LEFT JOIN users u ON u.id = d.user_id\n             LEFT JOIN people p ON p.id = u.person_id\n            WHERE d.notificacao_id = ?`,
          [notificacaoId],
        )

        let houveErro = false
        let sucesso = false

        for (const destinatario of destinatariosRows || []) {
          const destinatarioId = Number(destinatario.id)
          const email = normalizeText(destinatario.email)

          if (!hasValidEmail(email)) {
            houveErro = true
            await db.query(
              `UPDATE ${DESTINATARIOS_TABLE}\n                  SET status = ?, erro_envio = ?, updated_at = NOW()\n                WHERE id = ?`,
              [RECIPIENT_STATUS.FAILED, 'E-mail inválido', destinatarioId],
            )
            continue
          }

          try {
            await transporter.sendMail({
              from: fromAddress,
              to: email,
              subject: notificacao.assunto,
              html: notificacao.mensagem,
            })

            sucesso = true
            await db.query(
              `UPDATE ${DESTINATARIOS_TABLE}\n                  SET status = ?, enviado_em = NOW(), erro_envio = NULL, updated_at = NOW()\n                WHERE id = ?`,
              [RECIPIENT_STATUS.SENT, destinatarioId],
            )
          } catch (errorEnvio) {
            houveErro = true
            await db.query(
              `UPDATE ${DESTINATARIOS_TABLE}\n                  SET status = ?, erro_envio = ?, updated_at = NOW()\n                WHERE id = ?`,
              [
                RECIPIENT_STATUS.FAILED,
                normalizeText(errorEnvio?.message).slice(0, 500) || 'Falha ao enviar e-mail',
                destinatarioId,
              ],
            )
          }
        }

        if (houveErro && !sucesso) {
          await db.query(
            `UPDATE ${NOTIFICACOES_TABLE}\n                SET status = ?, erro_envio = ?, updated_at = NOW()\n              WHERE id = ?`,
            [
              NOTIFICATION_STATUS.FAILED,
              'Nenhum destinatário recebeu o e-mail com sucesso.',
              notificacaoId,
            ],
          )
        } else if (houveErro && sucesso) {
          await db.query(
            `UPDATE ${NOTIFICACOES_TABLE}\n                SET status = ?, enviado_em = NOW(), erro_envio = ?, updated_at = NOW()\n              WHERE id = ?`,
            [
              NOTIFICATION_STATUS.FAILED,
              'Alguns destinatários não receberam o e-mail. Verifique a fila para detalhes.',
              notificacaoId,
            ],
          )
        } else {
          await db.query(
            `UPDATE ${NOTIFICACOES_TABLE}\n                SET status = ?, enviado_em = NOW(), erro_envio = NULL, updated_at = NOW()\n              WHERE id = ?`,
            [NOTIFICATION_STATUS.SENT, notificacaoId],
          )
        }

        processadas += 1
      } catch (errorNotificacao) {
        console.error('[Notificações] Falha ao processar notificação', notificacaoId, errorNotificacao)
        await db.query(
          `UPDATE ${NOTIFICACOES_TABLE}\n              SET status = ?, erro_envio = ?, updated_at = NOW()\n            WHERE id = ?`,
          [
            NOTIFICATION_STATUS.FAILED,
            normalizeText(errorNotificacao?.message).slice(0, 500) || 'Falha inesperada ao processar notificação',
            notificacaoId,
          ],
        )
      }
    }
  } catch (error) {
    console.error('[Notificações] Erro ao ler fila de notificações', error)
  }

  return processadas
}

const queueTaskDeadlineNotifications = async () => {
  const tablesDisponiveis = await ensureNotificationsTables()
  if (!tablesDisponiveis) {
    return 0
  }

  const diasParam = await fetchParametro(
    'intervalo_envio_notificacoes_alertas_tarefas',
    '2',
  )
  const diasAntecedencia = parseIntegerOrDefault(diasParam, 2)

  try {
    const [rows] = await db.query(
      `SELECT se.id AS etapa_id, se.solicitacao_id, se.dt_prevista, se.status, se.responsavel_id,\n              sp.nome_paciente, sp.id AS solicitacao_registro_id, sp.created_by,\n              pe.nome AS etapa_nome\n         FROM ${SOLICITACAO_ETAPAS_TABLE} se\n         INNER JOIN ${ESTEIRA_PROCEDIMENTO_TABLE} sp ON sp.id = se.solicitacao_id\n         LEFT JOIN ${PROCEDIMENTO_ETAPAS_TABLE} pe ON pe.id = se.procedimento_etapa_id\n        WHERE se.dt_prevista IS NOT NULL\n          AND se.status NOT IN ('CONCLUIDO', 'CANCELADO')\n          AND se.dt_prevista <= DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
      [diasAntecedencia > 0 ? diasAntecedencia : 0],
    )

    let criadas = 0

    for (const row of rows || []) {
      const etapaId = parseOptionalInteger(row.etapa_id)
      const solicitacaoId = parseOptionalInteger(row.solicitacao_id)

      const [existentes] = await db.query(
        `SELECT id FROM ${NOTIFICACOES_TABLE}\n          WHERE tipo = ?\n            AND solicitacao_id = ?\n            AND etapa_id = ?\n            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)\n          LIMIT 1`,
        [
          NOTIFICATION_TYPES.TASK_DEADLINE,
          solicitacaoId || null,
          etapaId || null,
          Math.max(diasAntecedencia, 1),
        ],
      )

      if (Array.isArray(existentes) && existentes.length) {
        continue
      }

      const solicitanteId = parseOptionalInteger(row.created_by)
      const responsavelId = parseOptionalInteger(row.responsavel_id)
      const usuariosMap = await fetchUserDetails(
        [solicitanteId, responsavelId].filter((id) => Number.isFinite(id)),
      )
      const cacCoordenadores = await fetchCacCoordenadores()

      const destinatarios = []

      if (responsavelId && usuariosMap.has(responsavelId)) {
        destinatarios.push({
          userId: responsavelId,
          email: usuariosMap.get(responsavelId).email,
          nome: usuariosMap.get(responsavelId).nome,
        })
      }

      destinatarios.push(
        ...cacCoordenadores.map((coord) => ({ userId: coord.userId, email: coord.email, nome: coord.nome })),
      )

      const destinatariosUnicos = []
      const emailsRegistrados = new Set()
      for (const destinatario of destinatarios) {
        const emailNormalizado = normalizeText(destinatario.email)
        if (!emailNormalizado || emailsRegistrados.has(emailNormalizado)) {
          continue
        }
        emailsRegistrados.add(emailNormalizado)
        destinatariosUnicos.push({ ...destinatario, email: emailNormalizado })
      }

      if (!destinatariosUnicos.length) {
        continue
      }

      const dataPrevista = row.dt_prevista ? new Date(row.dt_prevista) : null
      const mensagem = buildNotificationMessage({
        titulo: 'Prazo da tarefa da esteira se aproxima',
        corpo: [
          'Identificamos uma tarefa da esteira que atingiu ou está próxima do prazo limite.',
          'Revise o andamento para evitar atrasos no fluxo cirúrgico.',
        ],
        detalhes: [
          { label: 'Solicitação', valor: solicitacaoId ? `#${solicitacaoId}` : '-' },
          { label: 'Paciente', valor: normalizeText(row.nome_paciente) || '-' },
          { label: 'Etapa', valor: normalizeText(row.etapa_nome) || `ID ${etapaId || '-'}` },
          { label: 'Data limite', valor: dataPrevista ? formatDateTime(dataPrevista) : '-' },
          { label: 'Status atual', valor: formatStatusLabel(row.status) },
        ],
        rodape: 'Esta mensagem foi gerada automaticamente com base no prazo configurado para a etapa.',
      })

      const assunto = `[Esteira] Alerta de prazo - ${normalizeText(row.etapa_nome) || `Tarefa #${etapaId || '-'}`}`

      const created = await createNotificationRecord({
        tipo: NOTIFICATION_TYPES.TASK_DEADLINE,
        assunto,
        mensagem,
        solicitacaoId,
        etapaId,
        dados: {
          dt_prevista: row.dt_prevista,
          status: row.status,
        },
        destinatarios: destinatariosUnicos,
      })

      if (created) {
        criadas += 1
      }
    }

    return criadas
  } catch (error) {
    console.error('[Notificações] Erro ao avaliar prazos de tarefas', error)
    return 0
  }
}

const queueSurgeryDeadlineNotifications = async () => {
  const tablesDisponiveis = await ensureNotificationsTables()
  if (!tablesDisponiveis) {
    return 0
  }

  const diasParam = await fetchParametro(
    'intervalo_envio_notificacoes_alertas_solicitacoes',
    '5',
  )
  const diasAntecedencia = parseIntegerOrDefault(diasParam, 5)

  try {
    const [rows] = await db.query(
      `SELECT id, nome_paciente, data_cirurgia, status\n         FROM ${ESTEIRA_PROCEDIMENTO_TABLE}\n        WHERE data_cirurgia IS NOT NULL\n          AND status NOT IN ('CANCELADA', 'CONCLUIDO')\n          AND data_cirurgia <= DATE_ADD(NOW(), INTERVAL ? DAY)`,
      [diasAntecedencia > 0 ? diasAntecedencia : 0],
    )

    let criadas = 0

    const cacCoordenadores = await fetchCacCoordenadores()
    const destinatariosBase = cacCoordenadores
      .filter((coord) => hasValidEmail(coord.email))
      .map((coord) => ({ userId: coord.userId, email: coord.email, nome: coord.nome }))

    if (!destinatariosBase.length) {
      return 0
    }

    for (const row of rows || []) {
      const solicitacaoId = parseOptionalInteger(row.id)

      const [existentes] = await db.query(
        `SELECT id FROM ${NOTIFICACOES_TABLE}\n          WHERE tipo = ?\n            AND solicitacao_id = ?\n            AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)\n          LIMIT 1`,
        [
          NOTIFICATION_TYPES.SURGERY_DEADLINE,
          solicitacaoId || null,
          Math.max(diasAntecedencia, 1),
        ],
      )

      if (Array.isArray(existentes) && existentes.length) {
        continue
      }

      const dataCirurgia = row.data_cirurgia ? new Date(row.data_cirurgia) : null

      const mensagem = buildNotificationMessage({
        titulo: 'Prazo para cirurgia se aproxima',
        corpo: [
          'Uma solicitação com cirurgia agendada está se aproximando do prazo limite.',
          'Verifique as pendências para garantir que todas as etapas estejam concluídas.',
        ],
        detalhes: [
          { label: 'Solicitação', valor: solicitacaoId ? `#${solicitacaoId}` : '-' },
          { label: 'Paciente', valor: normalizeText(row.nome_paciente) || '-' },
          { label: 'Data da cirurgia', valor: dataCirurgia ? formatDateTime(dataCirurgia) : '-' },
          { label: 'Status atual', valor: formatStatusLabel(row.status) },
        ],
        rodape: 'Mensagem automática enviada aos coordenadores do CAC.',
      })

      const assunto = `[Esteira] Alerta para cirurgia #${solicitacaoId || '-'}`

      const created = await createNotificationRecord({
        tipo: NOTIFICATION_TYPES.SURGERY_DEADLINE,
        assunto,
        mensagem,
        solicitacaoId,
        destinatarios: destinatariosBase,
        dados: {
          data_cirurgia: row.data_cirurgia,
          status: row.status,
        },
      })

      if (created) {
        criadas += 1
      }
    }

    return criadas
  } catch (error) {
    console.error('[Notificações] Erro ao avaliar prazos de cirurgias', error)
    return 0
  }
}

const buildDashboardSummary = async () => {
  try {
    const [rows] = await db.query(
      'SELECT COALESCE(SUM(etapas_pendentes), 0) AS pendentes, COALESCE(SUM(etapas_em_andamento), 0) AS andamento, COALESCE(SUM(etapas_concluidas), 0) AS concluidas FROM vw_solicitacoes_resumo_etapas',
    )

    const resumo = rows?.[0] || {}
    const pendentes = Number(resumo.pendentes) || 0
    const andamento = Number(resumo.andamento) || 0
    const concluidas = Number(resumo.concluidas) || 0
    const total = pendentes + andamento + concluidas

    const percentual = (valor) => (total > 0 ? ((valor / total) * 100).toFixed(1) : '0.0')

    return {
      pendentes,
      andamento,
      concluidas,
      total,
      percentuais: {
        pendentes: percentual(pendentes),
        andamento: percentual(andamento),
        concluidas: percentual(concluidas),
      },
    }
  } catch (error) {
    console.warn('[Notificações] Falha ao montar resumo do dashboard', error?.message || error)
    return null
  }
}

const queueWeeklyDashboardNotification = async () => {
  const tablesDisponiveis = await ensureNotificationsTables()
  if (!tablesDisponiveis) {
    return false
  }

  const hoje = new Date()
  const diaSemana = hoje.getUTCDay()

  if (diaSemana !== 1) {
    return false
  }

  const [recentes] = await db.query(
    `SELECT id FROM ${NOTIFICACOES_TABLE}\n      WHERE tipo = ?\n        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 DAY)\n      LIMIT 1`,
    [NOTIFICATION_TYPES.WEEKLY_DASHBOARD],
  )

  if (Array.isArray(recentes) && recentes.length) {
    return false
  }

  const resumo = await buildDashboardSummary()
  if (!resumo) {
    return false
  }

  const cacCoordenadores = await fetchCacCoordenadores()
  const destinatarios = cacCoordenadores
    .filter((coord) => hasValidEmail(coord.email))
    .map((coord) => ({ userId: coord.userId, email: coord.email, nome: coord.nome }))

  if (!destinatarios.length) {
    return false
  }

  const mensagem = buildNotificationMessage({
    titulo: 'Resumo semanal da esteira cirúrgica',
    corpo: [
      'Confira abaixo os principais indicadores consolidados da esteira cirúrgica na última semana.',
    ],
    detalhes: [
      { label: 'Solicitações monitoradas', valor: resumo.total },
      {
        label: 'Etapas pendentes',
        valor: `${resumo.pendentes} (${resumo.percentuais.pendentes}%)`,
      },
      {
        label: 'Etapas em andamento',
        valor: `${resumo.andamento} (${resumo.percentuais.andamento}%)`,
      },
      {
        label: 'Etapas concluídas',
        valor: `${resumo.concluidas} (${resumo.percentuais.concluidas}%)`,
      },
    ],
    rodape: 'Dashboard gerado automaticamente. Para mais detalhes, acesse a área de relatórios da esteira.',
  })

  const assunto = '[Esteira] Resumo semanal do CAC'

  const created = await createNotificationRecord({
    tipo: NOTIFICATION_TYPES.WEEKLY_DASHBOARD,
    assunto,
    mensagem,
    destinatarios,
    dados: resumo,
  })

  return Boolean(created)
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUS,
  queueTaskStatusChangeNotification,
  queueTaskDeadlineNotifications,
  queueSurgeryDeadlineNotifications,
  queueWeeklyDashboardNotification,
  processNotificationQueue,
  resetAvailabilityCache,
}
