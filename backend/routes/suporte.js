const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

const db = require('../db')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

const SUPPORT_REQUESTS_TABLE = 'support_requests'
const SUPPORT_MESSAGES_TABLE = 'support_request_messages'
const SUPPORT_ATTACHMENTS_TABLE = 'support_request_attachments'

const SUPPORT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'support')
const MAX_ATTACHMENT_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_ATTACHMENTS_PER_UPLOAD = 10
const MAX_TITLE_LENGTH = 180
const MAX_DESCRIPTION_LENGTH = 8000
const MAX_MESSAGE_LENGTH = 6000

const ADMIN_ROLES = new Set(['admin', 'masteradmin'])

const ensureDirectoryExists = (dirPath) => {
  if (!dirPath) {
    return
  }

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

ensureDirectoryExists(SUPPORT_UPLOAD_DIR)

const attachmentStorage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDirectoryExists(SUPPORT_UPLOAD_DIR)
    cb(null, SUPPORT_UPLOAD_DIR)
  },
  filename(req, file, cb) {
    const timestamp = Date.now()
    const randomPart = Math.round(Math.random() * 1e9)
    const extension = path.extname(file.originalname || '')
    cb(null, `${timestamp}-${randomPart}${extension}`)
  },
})

const attachmentsUpload = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: MAX_ATTACHMENT_FILE_SIZE,
    files: MAX_ATTACHMENTS_PER_UPLOAD,
  },
})

const sanitizeSingleLineText = (value, maxLength) => {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (typeof maxLength === 'number' && maxLength > 0 && trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength)
  }

  return trimmed
}

const sanitizeMultiLineText = (value, maxLength) => {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return ''
  }

  if (typeof maxLength === 'number' && maxLength > 0 && normalized.length > maxLength) {
    return normalized.slice(0, maxLength)
  }

  return normalized
}

const normalizarNumeroPositivo = (valor) => {
  const numero = Number(valor)
  if (!Number.isFinite(numero) || numero <= 0) {
    return null
  }

  return Math.trunc(numero)
}

const normalizarMotivo = (valor) => {
  if (!valor && valor !== 0) {
    return null
  }

  const texto = String(valor).trim().toLowerCase()
  if (!texto) {
    return null
  }

  if (
    texto === 'melhoria' ||
    texto === 'sugestao de melhoria' ||
    texto === 'sugestão de melhoria' ||
    texto === 'sugestao' ||
    texto === 'sugestão'
  ) {
    return 'melhoria'
  }

  if (
    texto === 'duvida' ||
    texto === 'dúvida' ||
    texto === 'problema' ||
    texto === 'duvida/problema' ||
    texto === 'dúvida/problema' ||
    texto === 'duvida_problema'
  ) {
    return 'duvida_problema'
  }

  return null
}

const isAdminUser = (user) => {
  const role = typeof user?.role === 'string' ? user.role.toLowerCase() : ''
  return ADMIN_ROLES.has(role)
}

const formatDateTime = (value) => {
  if (!value && value !== 0) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  try {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  } catch (error) {
    return null
  }
}

const mapUserReference = (id, nome) => ({
  id: id !== null && id !== undefined ? Number(id) : null,
  nome: typeof nome === 'string' && nome.trim().length ? nome : null,
})

const mapAttachmentRow = (row) => ({
  id: row?.id !== undefined && row.id !== null ? Number(row.id) : null,
  nomeOriginal: typeof row?.nome_original === 'string' ? row.nome_original : null,
  mimeType: typeof row?.mime_type === 'string' ? row.mime_type : null,
  tamanhoBytes:
    row?.tamanho_bytes !== undefined && row.tamanho_bytes !== null
      ? Number(row.tamanho_bytes)
      : null,
  criadoEm: formatDateTime(row?.created_at),
  criadoPor: mapUserReference(row?.created_by, row?.autor_nome),
})

const mapMessageRow = (row, anexosMap) => ({
  id: row?.id !== undefined && row.id !== null ? Number(row.id) : null,
  conteudo:
    typeof row?.conteudo === 'string'
      ? row.conteudo
      : row?.conteudo !== undefined && row?.conteudo !== null
        ? String(row.conteudo)
        : '',
  criadoEm: formatDateTime(row?.created_at),
  criadoPor: mapUserReference(row?.created_by, row?.autor_nome),
  anexos: anexosMap.get(Number(row?.id)) || [],
})

const mapSupportRequestRow = (row) => ({
  id: row?.id !== undefined && row.id !== null ? Number(row.id) : null,
  motivo: typeof row?.motivo === 'string' ? row.motivo : null,
  titulo: typeof row?.titulo === 'string' ? row.titulo : '',
  descricao: typeof row?.descricao === 'string' ? row.descricao : '',
  status: typeof row?.status === 'string' ? row.status : 'aguardando_suporte',
  criadoEm: formatDateTime(row?.created_at),
  atualizadoEm: formatDateTime(row?.updated_at),
  criadoPor: mapUserReference(row?.created_by, row?.autor_nome),
  atualizadoPor: mapUserReference(row?.updated_by, row?.atualizado_por_nome),
  ultimaMensagem: typeof row?.ultima_mensagem === 'string' ? row.ultima_mensagem : null,
  ultimaMensagemEm: formatDateTime(row?.ultima_mensagem_em),
  totalMensagens:
    row?.total_mensagens !== undefined && row.total_mensagens !== null
      ? Number(row.total_mensagens)
      : 0,
})

const removerArquivoSeExistir = async (arquivoCaminho) => {
  if (!arquivoCaminho) {
    return
  }

  try {
    await fs.promises.access(arquivoCaminho, fs.constants.F_OK)
    await fs.promises.unlink(arquivoCaminho)
  } catch (error) {
    // Arquivo já removido ou inacessível
  }
}

const carregarMensagensDaSolicitacao = async (queryable, solicitacaoId) => {
  const [mensagensRows] = await queryable.query(
    `SELECT m.id, m.conteudo, m.created_at, m.created_by, COALESCE(p.full_name, u.username) AS autor_nome
       FROM ${SUPPORT_MESSAGES_TABLE} m
       LEFT JOIN users u ON u.id = m.created_by
       LEFT JOIN people p ON p.id = u.person_id
      WHERE m.solicitacao_id = ?
      ORDER BY m.created_at ASC, m.id ASC`,
    [solicitacaoId],
  )

  const mensagens = Array.isArray(mensagensRows) ? mensagensRows : []
  const mensagemIds = mensagens.map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0)

  let anexosRows = []
  if (mensagemIds.length) {
    const [rows] = await queryable.query(
      `SELECT a.id, a.mensagem_id, a.nome_original, a.arquivo_armazenado, a.mime_type, a.tamanho_bytes, a.created_at, a.created_by,
              COALESCE(p.full_name, u.username) AS autor_nome
         FROM ${SUPPORT_ATTACHMENTS_TABLE} a
         LEFT JOIN users u ON u.id = a.created_by
         LEFT JOIN people p ON p.id = u.person_id
        WHERE a.mensagem_id IN (?)
        ORDER BY a.created_at ASC, a.id ASC`,
      [mensagemIds],
    )

    anexosRows = Array.isArray(rows) ? rows : []
  }

  const anexosMap = new Map()
  anexosRows.forEach((row) => {
    const mensagemId = Number(row.mensagem_id)
    if (!Number.isFinite(mensagemId) || mensagemId <= 0) {
      return
    }

    if (!anexosMap.has(mensagemId)) {
      anexosMap.set(mensagemId, [])
    }

    anexosMap.get(mensagemId).push(mapAttachmentRow(row))
  })

  return mensagens.map((row) => mapMessageRow(row, anexosMap))
}

const carregarSolicitacaoDetalhada = async (queryable, solicitacaoId) => {
  const [rows] = await queryable.query(
    `SELECT sr.id, sr.motivo, sr.titulo, sr.descricao, sr.status, sr.created_at, sr.updated_at, sr.created_by, sr.updated_by,
            COALESCE(p.full_name, u.username) AS autor_nome,
            COALESCE(pu.full_name, uu.username) AS atualizado_por_nome
       FROM ${SUPPORT_REQUESTS_TABLE} sr
       LEFT JOIN users u ON u.id = sr.created_by
       LEFT JOIN people p ON p.id = u.person_id
       LEFT JOIN users uu ON uu.id = sr.updated_by
       LEFT JOIN people pu ON pu.id = uu.person_id
      WHERE sr.id = ?
      LIMIT 1`,
    [solicitacaoId],
  )

  if (!Array.isArray(rows) || !rows.length) {
    return null
  }

  const solicitacao = mapSupportRequestRow(rows[0])
  const mensagens = await carregarMensagensDaSolicitacao(queryable, solicitacaoId)

  return { ...solicitacao, mensagens }
}

const atualizarResumoDaSolicitacao = async (queryable, solicitacaoId) => {
  const [rows] = await queryable.query(
    `SELECT sr.id, sr.motivo, sr.titulo, sr.descricao, sr.status, sr.created_at, sr.updated_at, sr.created_by, sr.updated_by,
            COALESCE(p.full_name, u.username) AS autor_nome,
            COALESCE(pu.full_name, uu.username) AS atualizado_por_nome,
            (SELECT m.conteudo FROM ${SUPPORT_MESSAGES_TABLE} m WHERE m.solicitacao_id = sr.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS ultima_mensagem,
            (SELECT m.created_at FROM ${SUPPORT_MESSAGES_TABLE} m WHERE m.solicitacao_id = sr.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS ultima_mensagem_em,
            (SELECT COUNT(*) FROM ${SUPPORT_MESSAGES_TABLE} m WHERE m.solicitacao_id = sr.id) AS total_mensagens
       FROM ${SUPPORT_REQUESTS_TABLE} sr
       LEFT JOIN users u ON u.id = sr.created_by
       LEFT JOIN people p ON p.id = u.person_id
       LEFT JOIN users uu ON uu.id = sr.updated_by
       LEFT JOIN people pu ON pu.id = uu.person_id
      WHERE sr.id = ?
      LIMIT 1`,
    [solicitacaoId],
  )

  if (!Array.isArray(rows) || !rows.length) {
    return null
  }

  return mapSupportRequestRow(rows[0])
}

router.get('/solicitacoes', authMiddleware, async (req, res) => {
  const usuarioId = normalizarNumeroPositivo(req.user?.id)
  const usuarioEhAdmin = isAdminUser(req.user)

  if (!usuarioEhAdmin && !usuarioId) {
    return res.status(403).json({ error: 'Usuário não autorizado.' })
  }

  const statusFiltro = sanitizeSingleLineText(req.query?.status, 50)

  const parametros = []
  const whereClausulas = []

  if (!usuarioEhAdmin) {
    whereClausulas.push('sr.created_by = ?')
    parametros.push(usuarioId)
  }

  if (statusFiltro) {
    whereClausulas.push('sr.status = ?')
    parametros.push(statusFiltro)
  }

  const whereSql = whereClausulas.length ? `WHERE ${whereClausulas.join(' AND ')}` : ''

  try {
    const [rows] = await db.query(
      `SELECT sr.id, sr.motivo, sr.titulo, sr.descricao, sr.status, sr.created_at, sr.updated_at, sr.created_by, sr.updated_by,
              COALESCE(p.full_name, u.username) AS autor_nome,
              COALESCE(pu.full_name, uu.username) AS atualizado_por_nome,
              (SELECT m.conteudo FROM ${SUPPORT_MESSAGES_TABLE} m WHERE m.solicitacao_id = sr.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS ultima_mensagem,
              (SELECT m.created_at FROM ${SUPPORT_MESSAGES_TABLE} m WHERE m.solicitacao_id = sr.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS ultima_mensagem_em,
              (SELECT COUNT(*) FROM ${SUPPORT_MESSAGES_TABLE} m WHERE m.solicitacao_id = sr.id) AS total_mensagens
         FROM ${SUPPORT_REQUESTS_TABLE} sr
         LEFT JOIN users u ON u.id = sr.created_by
         LEFT JOIN people p ON p.id = u.person_id
         LEFT JOIN users uu ON uu.id = sr.updated_by
         LEFT JOIN people pu ON pu.id = uu.person_id
         ${whereSql}
        ORDER BY sr.updated_at DESC, sr.id DESC`,
      parametros,
    )

    const solicitacoes = Array.isArray(rows) ? rows.map((row) => mapSupportRequestRow(row)) : []
    return res.json(solicitacoes)
  } catch (error) {
    console.error('Erro ao carregar solicitações de suporte', error)
    return res.status(500).json({ error: 'Não foi possível carregar as solicitações de suporte.' })
  }
})

router.get('/solicitacoes/:id', authMiddleware, async (req, res) => {
  const solicitacaoId = normalizarNumeroPositivo(req.params.id)
  if (!solicitacaoId) {
    return res.status(400).json({ error: 'Identificador da solicitação inválido.' })
  }

  const usuarioId = normalizarNumeroPositivo(req.user?.id)
  const usuarioEhAdmin = isAdminUser(req.user)

  if (!usuarioEhAdmin && !usuarioId) {
    return res.status(403).json({ error: 'Usuário não autorizado.' })
  }

  try {
    const solicitacao = await carregarSolicitacaoDetalhada(db, solicitacaoId)
    if (!solicitacao || !solicitacao.id) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' })
    }

    if (!usuarioEhAdmin && solicitacao.criadoPor.id !== usuarioId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar esta solicitação.' })
    }

    return res.json(solicitacao)
  } catch (error) {
    console.error('Erro ao carregar detalhes da solicitação de suporte', error)
    return res.status(500).json({ error: 'Não foi possível carregar a solicitação de suporte.' })
  }
})

router.post('/solicitacoes', authMiddleware, attachmentsUpload.array('anexos', MAX_ATTACHMENTS_PER_UPLOAD), async (req, res) => {
  const usuarioId = normalizarNumeroPositivo(req.user?.id)
  if (!usuarioId) {
    await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))
    return res.status(403).json({ error: 'Usuário não autorizado.' })
  }

  const motivo = normalizarMotivo(req.body?.motivo)
  const titulo = sanitizeSingleLineText(req.body?.titulo, MAX_TITLE_LENGTH)
  const descricao = sanitizeMultiLineText(req.body?.descricao, MAX_DESCRIPTION_LENGTH)

  if (!motivo) {
    await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))
    return res.status(400).json({ error: 'Motivo da solicitação é obrigatório.' })
  }

  if (!titulo) {
    await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))
    return res.status(400).json({ error: 'Título da solicitação é obrigatório.' })
  }

  if (!descricao) {
    await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))
    return res.status(400).json({ error: 'Descrição da solicitação é obrigatória.' })
  }

  let conn
  try {
    conn = await db.getConnection()
    await conn.beginTransaction()

    const [solicitacaoResultado] = await conn.query(
      `INSERT INTO ${SUPPORT_REQUESTS_TABLE} (motivo, titulo, descricao, status, created_by, updated_by, created_at, updated_at)
        VALUES (?, ?, ?, 'aguardando_suporte', ?, ?, NOW(), NOW())`,
      [motivo, titulo, descricao, usuarioId, usuarioId],
    )

    const solicitacaoId = solicitacaoResultado?.insertId ? Number(solicitacaoResultado.insertId) : null
    if (!solicitacaoId) {
      throw new Error('Falha ao registrar a solicitação de suporte')
    }

    const [mensagemResultado] = await conn.query(
      `INSERT INTO ${SUPPORT_MESSAGES_TABLE} (solicitacao_id, conteudo, created_by, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())`,
      [solicitacaoId, descricao, usuarioId],
    )

    const mensagemId = mensagemResultado?.insertId ? Number(mensagemResultado.insertId) : null
    if (!mensagemId) {
      throw new Error('Falha ao registrar mensagem inicial da solicitação de suporte')
    }

    const arquivos = Array.isArray(req.files) ? req.files : []
    for (const arquivo of arquivos) {
      const nomeOriginal = sanitizeSingleLineText(arquivo?.originalname || 'arquivo', 255) || 'arquivo'
      const mimeType = sanitizeSingleLineText(arquivo?.mimetype || '', 150) || null
      const tamanhoBytes = Number.isFinite(Number(arquivo?.size)) ? Number(arquivo.size) : null
      const arquivoArmazenado = sanitizeSingleLineText(path.basename(arquivo?.filename || arquivo?.path || ''), 255)

      if (!arquivoArmazenado) {
        throw new Error('Falha ao processar o anexo enviado')
      }

      await conn.query(
        `INSERT INTO ${SUPPORT_ATTACHMENTS_TABLE} (mensagem_id, nome_original, arquivo_armazenado, mime_type, tamanho_bytes, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [mensagemId, nomeOriginal, arquivoArmazenado, mimeType, tamanhoBytes, usuarioId],
      )
    }

    await conn.commit()

    const solicitacao = await carregarSolicitacaoDetalhada(db, solicitacaoId)
    return res.status(201).json(solicitacao)
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback()
      } catch (rollbackError) {
        console.warn('Falha ao desfazer transação de criação de solicitação de suporte', rollbackError)
      }
    }

    await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))

    console.error('Erro ao criar solicitação de suporte', error)
    return res.status(500).json({ error: 'Não foi possível criar a solicitação de suporte.' })
  } finally {
    if (conn) {
      conn.release()
    }
  }
})

router.post('/solicitacoes/:id/mensagens', authMiddleware, async (req, res) => {
  const solicitacaoId = normalizarNumeroPositivo(req.params.id)
  if (!solicitacaoId) {
    return res.status(400).json({ error: 'Identificador da solicitação inválido.' })
  }

  const usuarioId = normalizarNumeroPositivo(req.user?.id)
  if (!usuarioId) {
    return res.status(403).json({ error: 'Usuário não autorizado.' })
  }

  const usuarioEhAdmin = isAdminUser(req.user)
  const conteudo = sanitizeMultiLineText(req.body?.conteudo, MAX_MESSAGE_LENGTH)

  if (!conteudo) {
    return res.status(400).json({ error: 'Mensagem do suporte não pode estar vazia.' })
  }

  let conn
  try {
    conn = await db.getConnection()
    await conn.beginTransaction()

    const [solicitacaoRows] = await conn.query(
      `SELECT created_by, status FROM ${SUPPORT_REQUESTS_TABLE} WHERE id = ? LIMIT 1`,
      [solicitacaoId],
    )

    if (!Array.isArray(solicitacaoRows) || !solicitacaoRows.length) {
      await conn.rollback()
      return res.status(404).json({ error: 'Solicitação de suporte não encontrada.' })
    }

    const registro = solicitacaoRows[0]
    const criadorId = normalizarNumeroPositivo(registro?.created_by)

    if (!usuarioEhAdmin && criadorId !== usuarioId) {
      await conn.rollback()
      return res.status(403).json({ error: 'Você não tem permissão para interagir com esta solicitação.' })
    }

    const [mensagemResultado] = await conn.query(
      `INSERT INTO ${SUPPORT_MESSAGES_TABLE} (solicitacao_id, conteudo, created_by, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())`,
      [solicitacaoId, conteudo, usuarioId],
    )

    const mensagemId = mensagemResultado?.insertId ? Number(mensagemResultado.insertId) : null
    if (!mensagemId) {
      throw new Error('Falha ao registrar mensagem do suporte')
    }

    const novoStatus = usuarioEhAdmin ? 'aguardando_usuario' : 'aguardando_suporte'

    await conn.query(
      `UPDATE ${SUPPORT_REQUESTS_TABLE}
          SET status = ?, updated_at = NOW(), updated_by = ?
        WHERE id = ?`,
      [novoStatus, usuarioId, solicitacaoId],
    )

    await conn.commit()

    const [mensagemRows] = await db.query(
      `SELECT m.id, m.conteudo, m.created_at, m.created_by, COALESCE(p.full_name, u.username) AS autor_nome
         FROM ${SUPPORT_MESSAGES_TABLE} m
         LEFT JOIN users u ON u.id = m.created_by
         LEFT JOIN people p ON p.id = u.person_id
        WHERE m.id = ?
        LIMIT 1`,
      [mensagemId],
    )

    const mensagem =
      Array.isArray(mensagemRows) && mensagemRows.length
        ? mapMessageRow(mensagemRows[0], new Map())
        : null

    const resumoAtualizado = await atualizarResumoDaSolicitacao(db, solicitacaoId)

    return res.status(201).json({ mensagem, resumo: resumoAtualizado })
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback()
      } catch (rollbackError) {
        console.warn('Falha ao desfazer transação de mensagem do suporte', rollbackError)
      }
    }

    console.error('Erro ao registrar mensagem de suporte', error)
    return res.status(500).json({ error: 'Não foi possível registrar a mensagem.' })
  } finally {
    if (conn) {
      conn.release()
    }
  }
})

router.post(
  '/solicitacoes/:id/mensagens/anexos',
  authMiddleware,
  attachmentsUpload.array('anexos', MAX_ATTACHMENTS_PER_UPLOAD),
  async (req, res) => {
    const solicitacaoId = normalizarNumeroPositivo(req.params.id)
    if (!solicitacaoId) {
      await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))
      return res.status(400).json({ error: 'Identificador da solicitação inválido.' })
    }

    const usuarioId = normalizarNumeroPositivo(req.user?.id)
    if (!usuarioId) {
      await Promise.all((req.files || []).map((file) => removerArquivoSeExistir(file?.path)))
      return res.status(403).json({ error: 'Usuário não autorizado.' })
    }

    const usuarioEhAdmin = isAdminUser(req.user)
    const arquivos = Array.isArray(req.files) ? req.files : []

    if (!arquivos.length) {
      return res.status(400).json({ error: 'Ao menos um arquivo deve ser enviado.' })
    }

    let conn
    try {
      conn = await db.getConnection()
      await conn.beginTransaction()

      const [solicitacaoRows] = await conn.query(
        `SELECT created_by FROM ${SUPPORT_REQUESTS_TABLE} WHERE id = ? LIMIT 1`,
        [solicitacaoId],
      )

      if (!Array.isArray(solicitacaoRows) || !solicitacaoRows.length) {
        await conn.rollback()
        await Promise.all(arquivos.map((file) => removerArquivoSeExistir(file?.path)))
        return res.status(404).json({ error: 'Solicitação de suporte não encontrada.' })
      }

      const criadorId = normalizarNumeroPositivo(solicitacaoRows[0]?.created_by)
      if (!usuarioEhAdmin && criadorId !== usuarioId) {
        await conn.rollback()
        await Promise.all(arquivos.map((file) => removerArquivoSeExistir(file?.path)))
        return res.status(403).json({ error: 'Você não tem permissão para enviar anexos nesta solicitação.' })
      }

      const [mensagemResultado] = await conn.query(
        `INSERT INTO ${SUPPORT_MESSAGES_TABLE} (solicitacao_id, conteudo, created_by, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())`,
        [solicitacaoId, '', usuarioId],
      )

      const mensagemId = mensagemResultado?.insertId ? Number(mensagemResultado.insertId) : null
      if (!mensagemId) {
        throw new Error('Falha ao registrar mensagem para o anexo de suporte')
      }

      for (const arquivo of arquivos) {
        const nomeOriginal = sanitizeSingleLineText(arquivo?.originalname || 'arquivo', 255) || 'arquivo'
        const mimeType = sanitizeSingleLineText(arquivo?.mimetype || '', 150) || null
        const tamanhoBytes = Number.isFinite(Number(arquivo?.size)) ? Number(arquivo.size) : null
        const arquivoArmazenado = sanitizeSingleLineText(path.basename(arquivo?.filename || arquivo?.path || ''), 255)

        if (!arquivoArmazenado) {
          throw new Error('Falha ao processar o arquivo do anexo de suporte')
        }

        await conn.query(
          `INSERT INTO ${SUPPORT_ATTACHMENTS_TABLE} (mensagem_id, nome_original, arquivo_armazenado, mime_type, tamanho_bytes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [mensagemId, nomeOriginal, arquivoArmazenado, mimeType, tamanhoBytes, usuarioId],
        )
      }

      const novoStatus = usuarioEhAdmin ? 'aguardando_usuario' : 'aguardando_suporte'

      await conn.query(
        `UPDATE ${SUPPORT_REQUESTS_TABLE}
            SET status = ?, updated_at = NOW(), updated_by = ?
          WHERE id = ?`,
        [novoStatus, usuarioId, solicitacaoId],
      )

      await conn.commit()

      const [mensagemRows] = await db.query(
        `SELECT m.id, m.conteudo, m.created_at, m.created_by, COALESCE(p.full_name, u.username) AS autor_nome
           FROM ${SUPPORT_MESSAGES_TABLE} m
           LEFT JOIN users u ON u.id = m.created_by
           LEFT JOIN people p ON p.id = u.person_id
          WHERE m.id = ?
          LIMIT 1`,
        [mensagemId],
      )

      let mensagem = null
      if (Array.isArray(mensagemRows) && mensagemRows.length) {
        const [anexosRows] = await db.query(
          `SELECT a.id, a.mensagem_id, a.nome_original, a.arquivo_armazenado, a.mime_type, a.tamanho_bytes, a.created_at, a.created_by,
                  COALESCE(p.full_name, u.username) AS autor_nome
             FROM ${SUPPORT_ATTACHMENTS_TABLE} a
             LEFT JOIN users u ON u.id = a.created_by
             LEFT JOIN people p ON p.id = u.person_id
            WHERE a.mensagem_id = ?
            ORDER BY a.created_at ASC, a.id ASC`,
          [mensagemId],
        )

        const anexosMap = new Map()
        anexosMap.set(mensagemId, Array.isArray(anexosRows) ? anexosRows.map((row) => mapAttachmentRow(row)) : [])
        mensagem = mapMessageRow(mensagemRows[0], anexosMap)
      }
      const resumoAtualizado = await atualizarResumoDaSolicitacao(db, solicitacaoId)

      return res.status(201).json({ mensagem, resumo: resumoAtualizado })
    } catch (error) {
      if (conn) {
        try {
          await conn.rollback()
        } catch (rollbackError) {
          console.warn('Falha ao desfazer transação de envio de anexo de suporte', rollbackError)
        }
      }

      await Promise.all(arquivos.map((file) => removerArquivoSeExistir(file?.path)))

      console.error('Erro ao enviar anexo para solicitação de suporte', error)
      return res.status(500).json({ error: 'Não foi possível enviar o anexo.' })
    } finally {
      if (conn) {
        conn.release()
      }
    }
  },
)

router.get('/anexos/:anexoId/download', authMiddleware, async (req, res) => {
  const anexoId = normalizarNumeroPositivo(req.params.anexoId)
  if (!anexoId) {
    return res.status(400).json({ error: 'Identificador do anexo inválido.' })
  }

  const usuarioId = normalizarNumeroPositivo(req.user?.id)
  const usuarioEhAdmin = isAdminUser(req.user)

  if (!usuarioEhAdmin && !usuarioId) {
    return res.status(403).json({ error: 'Usuário não autorizado.' })
  }

  try {
    const [rows] = await db.query(
      `SELECT a.id, a.nome_original, a.arquivo_armazenado, a.mime_type, m.solicitacao_id, m.created_by AS mensagem_autor_id,
              sr.created_by AS solicitacao_autor_id
         FROM ${SUPPORT_ATTACHMENTS_TABLE} a
         INNER JOIN ${SUPPORT_MESSAGES_TABLE} m ON m.id = a.mensagem_id
         INNER JOIN ${SUPPORT_REQUESTS_TABLE} sr ON sr.id = m.solicitacao_id
        WHERE a.id = ?
        LIMIT 1`,
      [anexoId],
    )

    if (!Array.isArray(rows) || !rows.length) {
      return res.status(404).json({ error: 'Anexo não encontrado.' })
    }

    const registro = rows[0]
    const solicitacaoAutorId = normalizarNumeroPositivo(registro?.solicitacao_autor_id)

    if (!usuarioEhAdmin && solicitacaoAutorId !== usuarioId) {
      return res.status(403).json({ error: 'Você não tem permissão para baixar este anexo.' })
    }

    const arquivoArmazenado = sanitizeSingleLineText(registro?.arquivo_armazenado || '', 255)
    if (!arquivoArmazenado) {
      return res.status(404).json({ error: 'Arquivo do anexo não encontrado.' })
    }

    const caminhoArquivo = path.join(SUPPORT_UPLOAD_DIR, arquivoArmazenado)
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({ error: 'Arquivo do anexo não foi localizado no servidor.' })
    }

    const nomeDownload = sanitizeSingleLineText(registro?.nome_original || '', 255) || `anexo-suporte-${anexoId}`
    const mimeType = sanitizeSingleLineText(registro?.mime_type || '', 150) || 'application/octet-stream'

    res.setHeader('Content-Type', mimeType)

    return res.download(caminhoArquivo, nomeDownload, (err) => {
      if (err) {
        console.error('Erro ao realizar download do anexo de suporte', err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Não foi possível baixar o anexo solicitado.' })
        }
      }
    })
  } catch (error) {
    console.error('Erro ao buscar anexo de suporte para download', error)
    return res.status(500).json({ error: 'Não foi possível baixar o anexo solicitado.' })
  }
})

module.exports = router
