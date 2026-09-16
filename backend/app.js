const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const db = require('./db')
const authRoutes = require('./routes/auth')
const usuariosRoutes = require('./routes/usuarios')
const permissoesRoutes = require('./routes/permissoes')
const guideCenterRoutes = require('./routes/guide-center').router
const guideOperationsRoutes = require('./routes/guide-operations')
const documentGenerationRoutes = require('./routes/document-generation')
const physiotherapyEvaluationRoutes = require('./routes/physiotherapy-evaluations')
const { createStenciRouter } = require('./routes/stenci')

const PORT = Number(process.env.PORT || 3005)

function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
  }))

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/api/auth', authRoutes)
  app.use('/api/usuarios', usuariosRoutes)
  app.use('/api/permissoes', permissoesRoutes)
  app.use('/api', guideCenterRoutes)
  app.use('/api', guideOperationsRoutes)
  app.use('/api', documentGenerationRoutes)
  app.use('/api', physiotherapyEvaluationRoutes)
  app.use('/api/integrations/stenci', createStenciRouter())

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }))
  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'O arquivo excede o limite permitido de 5 MB.' })
    console.error('[API] Erro não tratado:', error)
    res.status(500).json({ error: 'Erro interno do servidor.' })
  })

  return app
}

async function start() {
  const connection = await db.getConnection()
  try {
    await connection.query('SELECT 1')
  } finally {
    connection.release()
  }

  return createApp().listen(PORT, () => console.log(`API disponível na porta ${PORT}`))
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[MySQL] Não foi possível iniciar a API:', error.message)
    process.exitCode = 1
  })
}

module.exports = { createApp, start }
