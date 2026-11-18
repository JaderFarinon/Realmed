const crypto = require('crypto')

function equalSecret(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string' || !expected) return false
  const left = Buffer.from(received)
  const right = Buffer.from(expected)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function serviceAuth(expectedToken = process.env.WHATSAPP_CHATBOT_API_TOKEN) {
  return (req, res, next) => {
    if (!expectedToken) return res.status(503).json({ error: 'Integração do chatbot não configurada.', code: 'CHATBOT_NOT_CONFIGURED' })
    const authorization = String(req.get('Authorization') || '')
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!equalSecret(token, expectedToken)) return res.status(401).json({ error: 'Credencial da integração inválida.', code: 'CHATBOT_UNAUTHORIZED' })
    req.service = { name: 'whatsapp-chatbot' }
    next()
  }
}

module.exports = { serviceAuth, equalSecret }
