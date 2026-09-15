const express = require('express')
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const knexFactory = require('knex')
const knexConfig = require('../knexfile')
const authMiddleware = require('../middleware/auth')

const environment = process.env.NODE_ENV || 'development'
const config = knexConfig[environment] || knexConfig.development
const knex = knexFactory(config)

const router = express.Router()
router.use(authMiddleware)

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'internal-chat')

const ensureUploadDirExists = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

ensureUploadDirExists()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirExists()
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const uniqueId = Math.round(Math.random() * 1e9)
    const sanitizedName = (file.originalname || 'anexo').replace(/[\s]+/g, '_')
    const extension = path.extname(sanitizedName)
    const baseName = path.basename(sanitizedName, extension)
    cb(null, `${timestamp}-${uniqueId}-${baseName}${extension}`)
  },
})

const upload = multer({ storage })

const mapUserRow = (row, currentUserId) => ({
  id: row.id,
  nome: row.full_name || row.username || `Usuário ${row.id}`,
  email: row.email || null,
  status: row.status || null,
  isOnline: row.id === currentUserId || row.status === 'active',
})

const mapMessageRow = (row) => ({
  id: row.id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  content: row.content || '',
  createdAt: row.created_at,
  attachment: row.attachment_stored_name
    ? {
        nomeOriginal: row.attachment_original_name || row.attachment_stored_name,
        mimeType: row.attachment_mime_type || 'application/octet-stream',
        tamanhoBytes: Number(row.attachment_size) || 0,
        downloadUrl: `/api/internal-chat/messages/${row.id}/attachment`,
      }
    : null,
})

const sanitizePositiveNumber = (value) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

router.get('/users', async (req, res) => {
  try {
    const currentUserId = sanitizePositiveNumber(req.user?.id)

    const rows = await knex('users as u')
      .leftJoin('people as p', 'u.person_id', 'p.id')
      .select(
        'u.id',
        'u.username',
        'u.status',
        'p.full_name',
        'p.email'
      )
      .orderBy('p.full_name', 'asc')
      .orderBy('u.username', 'asc')

    const users = rows
      .filter((row) => row && typeof row.id === 'number')
      .map((row) => mapUserRow(row, currentUserId))

    res.json(users)
  } catch (error) {
    console.error('[InternalChat] Erro ao listar usuários do chat', error)
    res.status(500).json({ error: 'Não foi possível carregar a lista de usuários.' })
  }
})

router.get('/conversations/:userId/messages', async (req, res) => {
  const currentUserId = sanitizePositiveNumber(req.user?.id)
  const targetUserId = sanitizePositiveNumber(req.params.userId)

  if (!currentUserId) {
    return res.status(401).json({ error: 'Usuário não autenticado.' })
  }

  if (!targetUserId) {
    return res.status(400).json({ error: 'Identificador de usuário inválido.' })
  }

  if (currentUserId === targetUserId) {
    return res.json([])
  }

  try {
    const targetExists = await knex('users').where({ id: targetUserId }).first()
    if (!targetExists) {
      return res.status(404).json({ error: 'Usuário não encontrado.' })
    }

    const rows = await knex('internal_chat_messages')
      .select('*')
      .where(function () {
        this.where({ sender_id: currentUserId, recipient_id: targetUserId })
        this.orWhere({ sender_id: targetUserId, recipient_id: currentUserId })
      })
      .orderBy('created_at', 'asc')

    res.json(rows.map(mapMessageRow))
  } catch (error) {
    console.error('[InternalChat] Erro ao carregar mensagens', error)
    res.status(500).json({ error: 'Não foi possível carregar as mensagens do chat.' })
  }
})

router.post('/conversations/:userId/messages', upload.single('attachment'), async (req, res) => {
  const currentUserId = sanitizePositiveNumber(req.user?.id)
  const targetUserId = sanitizePositiveNumber(req.params.userId)

  if (!currentUserId) {
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    return res.status(401).json({ error: 'Usuário não autenticado.' })
  }

  if (!targetUserId) {
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    return res.status(400).json({ error: 'Identificador de usuário inválido.' })
  }

  if (currentUserId === targetUserId) {
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    return res.status(400).json({ error: 'Não é possível enviar mensagens para si mesmo.' })
  }

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  const hasAttachment = Boolean(req.file)

  if (!content && !hasAttachment) {
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    return res.status(400).json({ error: 'Informe uma mensagem ou adicione um anexo.' })
  }

  try {
    const targetExists = await knex('users').where({ id: targetUserId }).first()
    if (!targetExists) {
      if (req.file) {
        fs.unlink(req.file.path, () => {})
      }
      return res.status(404).json({ error: 'Usuário não encontrado.' })
    }

    const insertPayload = {
      sender_id: currentUserId,
      recipient_id: targetUserId,
      content: content || null,
      attachment_original_name: req.file?.originalname || null,
      attachment_stored_name: req.file?.filename || null,
      attachment_mime_type: req.file?.mimetype || null,
      attachment_size: req.file?.size || null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    }

    const [messageId] = await knex('internal_chat_messages').insert(insertPayload)
    const message = await knex('internal_chat_messages').where({ id: messageId }).first()

    res.status(201).json(mapMessageRow(message))
  } catch (error) {
    console.error('[InternalChat] Erro ao enviar mensagem', error)
    if (req.file) {
      fs.unlink(req.file.path, () => {})
    }
    res.status(500).json({ error: 'Não foi possível enviar a mensagem.' })
  }
})

router.get('/messages/:messageId/attachment', async (req, res) => {
  const currentUserId = sanitizePositiveNumber(req.user?.id)
  const messageId = sanitizePositiveNumber(req.params.messageId)

  if (!currentUserId) {
    return res.status(401).json({ error: 'Usuário não autenticado.' })
  }

  if (!messageId) {
    return res.status(400).json({ error: 'Identificador da mensagem inválido.' })
  }

  try {
    const message = await knex('internal_chat_messages').where({ id: messageId }).first()

    if (!message) {
      return res.status(404).json({ error: 'Mensagem não encontrada.' })
    }

    if (message.sender_id !== currentUserId && message.recipient_id !== currentUserId) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este anexo.' })
    }

    if (!message.attachment_stored_name) {
      return res.status(404).json({ error: 'Esta mensagem não possui anexo.' })
    }

    const absolutePath = path.join(UPLOAD_DIR, message.attachment_stored_name)

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' })
    }

    const filename = message.attachment_original_name || message.attachment_stored_name
    const mimeType = message.attachment_mime_type || 'application/octet-stream'

    res.setHeader('Content-Type', mimeType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    )

    const stream = fs.createReadStream(absolutePath)
    stream.on('error', (streamError) => {
      console.error('[InternalChat] Erro ao enviar anexo', streamError)
      if (!res.headersSent) {
        res.status(500).end('Não foi possível baixar o anexo.')
      }
    })

    stream.pipe(res)
  } catch (error) {
    console.error('[InternalChat] Erro ao realizar download do anexo', error)
    res.status(500).json({ error: 'Não foi possível baixar o anexo do chat.' })
  }
})

module.exports = router
