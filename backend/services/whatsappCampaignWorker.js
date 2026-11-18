const crypto = require('crypto')
const { getStenciConfig } = require('../../integrations/stenci/config')

const code = value => String(value || 'WEBHOOK_FAILED').replace(/[^A-Z0-9_-]/gi, '_').slice(0, 80).toUpperCase()

function webhookConfig() {
  const url = process.env.WHATSAPP_CHATBOT_WEBHOOK_URL
  const secret = process.env.WHATSAPP_CHATBOT_WEBHOOK_SECRET
  if (!url || !secret) return null
  let parsed
  try { parsed = new URL(url) } catch { return null }
  if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV === 'test' && parsed.protocol === 'http:')) return null
  return { url: parsed.toString(), secret }
}

async function notifyCampaign(db, eventId, now = new Date(), branchId = getStenciConfig().branchId) {
  const config = webhookConfig()
  if (!config) throw Object.assign(new Error('Webhook do chatbot não configurado.'), { status: 503, code: 'CHATBOT_WEBHOOK_NOT_CONFIGURED' })
  if (typeof branchId !== 'string' || !branchId.trim()) throw Object.assign(new Error('Unidade Stenci não configurada.'), { status: 503, code: 'STENCI_BRANCH_NOT_CONFIGURED' })
  const claimed = await db.transaction(async trx => {
    const event = await trx('whatsapp_events').where({ id: eventId, branch_id: branchId.trim(), type: 'CAMPAIGN', status: 'ACTIVE' }).whereNull('deleted_at').forUpdate().first()
    if (!event) throw Object.assign(new Error('Campanha ativa não encontrada.'), { status: 404, code: 'CAMPAIGN_NOT_FOUND' })
    if (new Date(event.send_at) > now) throw Object.assign(new Error('A campanha ainda não atingiu o início do envio.'), { status: 409, code: 'CAMPAIGN_NOT_DUE' })
    if (new Date(event.send_deadline_at) < now) {
      await trx('whatsapp_events').where({ id: event.id, branch_id: branchId.trim() }).update({ webhook_status: 'EXPIRED', webhook_error_code: 'CAMPAIGN_DEADLINE_EXPIRED', updated_at: trx.fn.now() })
      throw Object.assign(new Error('O prazo final da campanha terminou.'), { status: 409, code: 'CAMPAIGN_DEADLINE_EXPIRED' })
    }
    if (event.webhook_status === 'DELIVERED') return { event, repeated: true }
    if (event.webhook_status === 'SENDING' && event.webhook_retry_at && new Date(event.webhook_retry_at) > now) throw Object.assign(new Error('Outra instância já está avisando o chatbot.'), { status: 409, code: 'CAMPAIGN_DELIVERY_IN_PROGRESS' })
    const attempt = Number(event.webhook_attempts || 0) + 1
    const leaseUntil = new Date(Math.min(new Date(event.send_deadline_at).getTime(), now.getTime() + 120000))
    await trx('whatsapp_events').where({ id: event.id, branch_id: branchId.trim(), revision: event.revision }).update({ webhook_status: 'SENDING', webhook_attempts: attempt, webhook_last_attempt_at: now, webhook_retry_at: leaseUntil, webhook_error_code: null, updated_at: trx.fn.now() })
    return { event, attempt, repeated: false }
  })
  if (claimed.repeated) return { delivered: true, repeated: true }
  const { event, attempt } = claimed
  const payload = JSON.stringify({
    id: `campaign:${event.id}:${event.revision}`,
    type: 'campaign.ready',
    occurredAt: now.toISOString(),
    campaign: {
      id: event.id,
      revision: Number(event.revision),
      name: event.name,
      sendAt: new Date(event.send_at).toISOString(),
      sendDeadlineAt: new Date(event.send_deadline_at).toISOString(),
      recipientsEndpoint: `/api/integrations/whatsapp/v1/campaigns/${event.id}/recipients?revision=${event.revision}`,
    },
  })
  const signature = crypto.createHmac('sha256', config.secret).update(payload).digest('hex')
  try {
    const response = await fetch(config.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Realmed-Signature': `sha256=${signature}`, 'X-Realmed-Event-Id': `campaign:${event.id}:${event.revision}` }, body: payload, signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw Object.assign(new Error(`HTTP_${response.status}`), { webhookCode: `HTTP_${response.status}` })
    await db.transaction(async trx => {
      const updated = await trx('whatsapp_events').where({ id: event.id, branch_id: branchId.trim(), revision: event.revision, webhook_status: 'SENDING', webhook_attempts: attempt }).update({ webhook_status: 'DELIVERED', webhook_retry_at: null, webhook_delivered_at: now, webhook_error_code: null, updated_at: trx.fn.now() })
      if (updated) await trx('whatsapp_automation_audit').insert({ event_type: 'CAMPAIGN_WEBHOOK_DELIVERED', entity_type: 'whatsapp_event', entity_id: String(event.id), metadata: JSON.stringify({ revision: Number(event.revision), attempt }) })
    })
    return { delivered: true, repeated: false }
  } catch (error) {
    const delayMinutes = Math.min(60, 5 * (2 ** Math.min(attempt - 1, 4)))
    const retryAt = new Date(now.getTime() + delayMinutes * 60000)
    const expired = retryAt > new Date(event.send_deadline_at)
    await db.transaction(async trx => {
      const updated = await trx('whatsapp_events').where({ id: event.id, branch_id: branchId.trim(), revision: event.revision, webhook_status: 'SENDING', webhook_attempts: attempt }).update({ webhook_status: expired ? 'EXPIRED' : 'FAILED', webhook_retry_at: expired ? null : retryAt, webhook_error_code: code(error.webhookCode || error.name || error.code), updated_at: trx.fn.now() })
      if (updated) await trx('whatsapp_automation_audit').insert({ event_type: 'CAMPAIGN_WEBHOOK_FAILED', entity_type: 'whatsapp_event', entity_id: String(event.id), metadata: JSON.stringify({ revision: Number(event.revision), attempt, retryScheduled: !expired }) })
    })
    throw Object.assign(new Error('Não foi possível avisar o chatbot sobre a campanha.'), { status: 502, code: 'CHATBOT_WEBHOOK_FAILED' })
  }
}

async function runDueCampaigns(db, now = new Date(), branchId = getStenciConfig().branchId) {
  if (!webhookConfig()) return { configured: false, attempted: 0 }
  if (typeof branchId !== 'string' || !branchId.trim()) return { configured: false, attempted: 0 }
  const events = await db('whatsapp_events').where({ branch_id: branchId.trim(), type: 'CAMPAIGN', status: 'ACTIVE' }).whereNull('deleted_at').whereIn('webhook_status', ['PENDING', 'FAILED', 'SENDING']).where('send_at', '<=', now).where('send_deadline_at', '>=', now).where(function () { this.whereNull('webhook_retry_at').orWhere('webhook_retry_at', '<=', now) }).orderBy('send_at').limit(10).select('id')
  for (const event of events) await notifyCampaign(db, event.id, now, branchId).catch(() => {})
  return { configured: true, attempted: events.length }
}

let timer
function startWorker(db, intervalMs = 30000) {
  if (timer) return timer
  const run = () => void runDueCampaigns(db).catch(error => console.error('[WhatsApp] Falha controlada no agendador de campanhas:', error.code || error.name))
  timer = setInterval(run, intervalMs); timer.unref?.(); run()
  return timer
}

module.exports = { webhookConfig, notifyCampaign, runDueCampaigns, startWorker }
