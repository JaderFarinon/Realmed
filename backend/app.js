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
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY)
  app.use(helmet())
  app.use(cors({ exposedHeaders: ['Retry-After'] }))
  app.use(express.json({ limit: '5mb' }))
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
  }))

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  const live = require('./services/treatmentLiveUpdates').createTreatmentLiveUpdates()
  app.use(live.observe)
  const config = require('./knexfile')[process.env.NODE_ENV || 'development'] || require('./knexfile').development
  const guardDb = require('knex')({ ...config, pool: {min:0,max:4} })
  const editing = require('./routes/treatment-edit-locks').createEditLocks(require('./routes/guide-center').knex, guardDb)
  app.locals.editLockDb = guardDb
  app.use(editing.guard)
  app.use('/api', editing.router)
  app.get('/api/treatment-updates', require('./middleware/auth'), require('./middleware/permission').modulePermission('guide_processes'), live.stream)
  app.use('/api/auth', authRoutes)
  app.use('/api/physio', require('./routes/physiotherapist-mode'))
  app.use('/api/usuarios', usuariosRoutes)
  app.use('/api/permissoes', permissoesRoutes)
  app.use('/api', guideCenterRoutes)
  app.use('/api', require('./routes/guide-billing'))
  app.use('/api', require('./routes/physiotherapy-rotation').createRouter())
  app.use('/api', guideOperationsRoutes)
  app.use('/api', documentGenerationRoutes)
  app.use('/api', require('./routes/procedure-codes'))
  app.use('/api', require('./routes/insurance-procedures'))
  app.use('/api', physiotherapyEvaluationRoutes)
  app.use('/api/inventory', require('./routes/inventory'))
  app.use('/api/billing', require('./routes/billing'))
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
  require('./services/billingCollectorWorker').startWorker(require('./routes/guide-center').knex)

  return createApp().listen(PORT, process.env.HOST || '0.0.0.0', () => {
    console.log(`API disponível na porta ${PORT}`)
    // Preload models using the library's bundled sample, never a person's camera image.
    void require('./services/physiotherapistFaceRecognition').prepare().catch(error => {
      console.error('[Modo Fisioterapeuta] pré-carregamento indisponível', error.code || error.name)
    })
  })
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[MySQL] Não foi possível iniciar a API:', error.message)
    process.exitCode = 1
  })
}

module.exports = { createApp, start }
