const {
  processNotificationQueue,
  queueTaskDeadlineNotifications,
  queueSurgeryDeadlineNotifications,
  queueWeeklyDashboardNotification,
} = require('../utils/esteiraNotificacoes')

const DEFAULT_QUEUE_INTERVAL_MS = 60 * 1000
const DEFAULT_TASK_ALERT_INTERVAL_MS = 15 * 60 * 1000
const DEFAULT_SURGERY_ALERT_INTERVAL_MS = 60 * 60 * 1000
const DEFAULT_WEEKLY_DASHBOARD_INTERVAL_MS = 6 * 60 * 60 * 1000

const locks = {
  queue: false,
  taskAlerts: false,
  surgeryAlerts: false,
  weeklyDashboard: false,
}

const withLock = async (key, fn) => {
  if (locks[key]) {
    return
  }

  locks[key] = true
  try {
    await fn()
  } catch (error) {
    console.error(`[Notificações] Falha durante execução agendada (${key})`, error)
  } finally {
    locks[key] = false
  }
}

let schedulerStarted = false

const startEsteiraNotificationsScheduler = () => {
  if (schedulerStarted) {
    return
  }

  schedulerStarted = true
  console.log('[Notificações] Agendador da esteira cirúrgica iniciado.')

  const executarFila = () =>
    withLock('queue', async () => {
      const processadas = await processNotificationQueue()
      if (processadas > 0) {
        console.log(`[Notificações] ${processadas} notificações processadas.`)
      }
    })

  const executarAlertasTarefas = () =>
    withLock('taskAlerts', async () => {
      const criadas = await queueTaskDeadlineNotifications()
      if (criadas > 0) {
        console.log(`[Notificações] ${criadas} alertas de tarefas gerados.`)
      }
    })

  const executarAlertasCirurgias = () =>
    withLock('surgeryAlerts', async () => {
      const criadas = await queueSurgeryDeadlineNotifications()
      if (criadas > 0) {
        console.log(`[Notificações] ${criadas} alertas de cirurgias gerados.`)
      }
    })

  const executarDashboardSemanal = () =>
    withLock('weeklyDashboard', async () => {
      const gerado = await queueWeeklyDashboardNotification()
      if (gerado) {
        console.log('[Notificações] Resumo semanal enfileirado.')
      }
    })

  executarFila()
  executarAlertasTarefas()
  executarAlertasCirurgias()
  executarDashboardSemanal()

  setInterval(executarFila, DEFAULT_QUEUE_INTERVAL_MS)
  setInterval(executarAlertasTarefas, DEFAULT_TASK_ALERT_INTERVAL_MS)
  setInterval(executarAlertasCirurgias, DEFAULT_SURGERY_ALERT_INTERVAL_MS)
  setInterval(executarDashboardSemanal, DEFAULT_WEEKLY_DASHBOARD_INTERVAL_MS)
}

module.exports = {
  startEsteiraNotificationsScheduler,
}
