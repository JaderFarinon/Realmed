const nodemailer = require('nodemailer')

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).trim()
}

const parseOptionalInteger = (value) => {
  if (value === undefined || value === null) {
    return null
  }

  const number = Number(value)
  if (!Number.isFinite(number)) {
    return null
  }

  return Math.trunc(number)
}

const toBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1'

const hasValidEmail = (email) => {
  const normalized = normalizeText(email)
  return Boolean(normalized && normalized.includes('@'))
}

const getSmtpConfig = () => {
  const host = normalizeText(process.env.SMTP_HOST)
  const portValue = parseOptionalInteger(process.env.SMTP_PORT)
  const secure = toBoolean(process.env.SMTP_SECURE)
  const user = normalizeText(process.env.SMTP_USER)
  const pass = process.env.SMTP_PASS !== undefined ? String(process.env.SMTP_PASS) : null
  const fromName = normalizeText(process.env.SMTP_FROM_NAME) || 'ConectaMed'
  const fromEmail = normalizeText(process.env.SMTP_FROM_EMAIL)

  if (!host) {
    throw new Error('SMTP_HOST não configurado')
  }

  if (!fromEmail) {
    throw new Error('SMTP_FROM_EMAIL não configurado')
  }

  if (!user || !pass) {
    throw new Error('Credenciais SMTP ausentes (SMTP_USER/SMTP_PASS)')
  }

  return {
    host,
    port: portValue || 587,
    secure,
    auth: { user, pass },
    fromName,
    fromEmail,
  }
}

let cachedTransporter = null
let cachedFromAddress = null

const buildTransporter = () => {
  if (cachedTransporter && cachedFromAddress) {
    return { transporter: cachedTransporter, fromAddress: cachedFromAddress }
  }

  const smtp = getSmtpConfig()
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  })

  const fromAddress = smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail

  cachedTransporter = transporter
  cachedFromAddress = fromAddress

  return { transporter, fromAddress }
}

module.exports = {
  buildTransporter,
  getSmtpConfig,
  hasValidEmail,
  normalizeText,
  parseOptionalInteger,
  toBoolean,
}
