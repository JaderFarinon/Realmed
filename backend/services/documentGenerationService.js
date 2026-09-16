const fs = require('fs/promises')
const path = require('path')

const storageRoot = path.resolve(__dirname, '../../storage')
const roots = {
  templates: path.join(storageRoot, 'templates/documents'),
  signatures: path.join(storageRoot, 'assets/signatures'),
  logos: path.join(storageRoot, 'assets/logos'),
}

const FIELD_CATEGORIES = Object.freeze({
  patient: ['PATIENT_NAME', 'PATIENT_BIRTH_DATE', 'PATIENT_CPF', 'PATIENT_GENDER', 'PATIENT_CELLPHONE', 'PATIENT_PHONE', 'PATIENT_CARD_NUMBER', 'PATIENT_CARD_EXPIRATION'],
  insurance: ['INSURANCE_NAME', 'INSURANCE_ANS_REGISTRATION', 'INSURANCE_LOGO'],
  doctor: ['DOCTOR_NAME', 'DOCTOR_COUNCIL', 'DOCTOR_COUNCIL_NUMBER', 'DOCTOR_STATE', 'DOCTOR_CBO', 'DOCTOR_SIGNATURE'],
  physiotherapist: ['PHYSIOTHERAPIST_NAME', 'PHYSIOTHERAPIST_COUNCIL', 'PHYSIOTHERAPIST_COUNCIL_NUMBER', 'PHYSIOTHERAPIST_STATE', 'PHYSIOTHERAPIST_CBO'],
  process: ['ASSESSMENT_DATE', 'EXPECTED_START_DATE', 'REFERRAL_DATE', 'MEDICAL_DIAGNOSIS', 'CID', 'AUTHORIZATION_NUMBER', 'REQUESTED_SESSIONS', 'AUTHORIZED_SESSIONS', 'MONDAY_CHECK', 'MONDAY_TIME', 'TUESDAY_CHECK', 'TUESDAY_TIME', 'WEDNESDAY_CHECK', 'WEDNESDAY_TIME', 'THURSDAY_CHECK', 'THURSDAY_TIME', 'FRIDAY_CHECK', 'FRIDAY_TIME', 'SESSIONS_PER_WEEK', 'TOTAL_SESSIONS'],
})
const PROCEDURE_COLUMNS = ['CODE', 'DESCRIPTION', 'REQUESTED_QUANTITY', 'AUTHORIZED_QUANTITY']
const PROCEDURE_SLOTS = 5
const DATE_FIELDS = new Set(['PATIENT_BIRTH_DATE', 'PATIENT_CARD_EXPIRATION', 'ASSESSMENT_DATE', 'EXPECTED_START_DATE', 'REFERRAL_DATE'])
const fieldKeys = new Set(Object.values(FIELD_CATEGORIES).flat())
for (let line = 1; line <= PROCEDURE_SLOTS; line += 1) for (const column of PROCEDURE_COLUMNS) fieldKeys.add(`PROCEDURE_${line}_${column}`)

function safeFile(root, relativeName) {
  const name = String(relativeName || '')
  if (!name || path.isAbsolute(name) || path.basename(name) !== name) throw Object.assign(new Error('Caminho de arquivo inválido.'), { status: 400 })
  return path.join(root, name)
}

function parseOptions(options) {
  if (!options) return {}
  if (typeof options === 'object') return options
  try { return JSON.parse(options) || {} } catch { return {} }
}

function formatDate(value, pattern = 'DD/MM/YYYY') {
  if (!value) return ''
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return String(value)
  return pattern.replace(/YYYY/g, match[1]).replace(/MM/g, match[2]).replace(/DD/g, match[3])
}

function valuesFor(context) {
  const { process: p, procedures } = context
  let treatmentDays = []
  try { treatmentDays = Array.isArray(p.treatment_days) ? p.treatment_days : JSON.parse(p.treatment_days || '[]') } catch { treatmentDays = [] }
  const schedule = Object.fromEntries(treatmentDays.map((entry) => typeof entry === 'string' ? [entry, { enabled: true, time: p.preferred_period || '' }] : [entry.day, entry]))
  const values = {
    PATIENT_NAME: p.patient_name, PATIENT_BIRTH_DATE: p.birth_date, PATIENT_CPF: p.patient_cpf, PATIENT_GENDER: p.gender,
    PATIENT_CELLPHONE: p.cellphone, PATIENT_PHONE: p.patient_phone,
    PATIENT_CARD_NUMBER: p.card_number, PATIENT_CARD_EXPIRATION: p.card_expiration,
    INSURANCE_NAME: p.insurance_name, INSURANCE_ANS_REGISTRATION: p.ans_registration,
    DOCTOR_NAME: p.doctor_name, DOCTOR_COUNCIL: p.doctor_council, DOCTOR_COUNCIL_NUMBER: p.doctor_council_number,
    DOCTOR_STATE: p.doctor_state, DOCTOR_CBO: p.doctor_cbo,
    PHYSIOTHERAPIST_NAME: p.physiotherapist_name, PHYSIOTHERAPIST_COUNCIL: p.physiotherapist_council,
    PHYSIOTHERAPIST_COUNCIL_NUMBER: p.physiotherapist_council_number, PHYSIOTHERAPIST_STATE: p.physiotherapist_state,
    PHYSIOTHERAPIST_CBO: p.physiotherapist_cbo, ASSESSMENT_DATE: p.assessment_date,
    EXPECTED_START_DATE: p.expected_start_date, REQUESTED_SESSIONS: p.requested_sessions,
    AUTHORIZED_SESSIONS: p.authorized_sessions, REFERRAL_DATE: p.referral_date, MEDICAL_DIAGNOSIS: p.medical_diagnosis,
    CID: p.cid, AUTHORIZATION_NUMBER: p.authorization_number, TOTAL_SESSIONS: p.requested_sessions,
    SESSIONS_PER_WEEK: Object.values(schedule).filter(item => item.enabled !== false).length,
  }
  for (const day of ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']) {
    values[`${day}_CHECK`] = schedule[day]?.enabled !== false && schedule[day] ? 'X' : ''
    values[`${day}_TIME`] = schedule[day]?.time || ''
  }
  procedures.forEach((procedure, index) => {
    const prefix = `PROCEDURE_${index + 1}_`
    values[`${prefix}CODE`] = procedure.code
    values[`${prefix}DESCRIPTION`] = procedure.description
    values[`${prefix}REQUESTED_QUANTITY`] = procedure.requested_quantity
    values[`${prefix}AUTHORIZED_QUANTITY`] = procedure.authorized_quantity
  })
  return values
}

function transformText(value, options) {
  let result = value == null ? '' : String(value)
  if (options.dateFormat && result) result = formatDate(result, options.dateFormat)
  if (options.maxLength) result = result.slice(0, Math.max(0, Number(options.maxLength)))
  if (options.uppercase) result = result.toUpperCase()
  return `${options.prefix || ''}${result}${options.suffix || ''}`
}

function color(rgb, hex = '#000000') {
  const match = String(hex).match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  return match ? rgb(parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255) : rgb(0, 0, 0)
}

async function embedImage(pdfDoc, asset, root) {
  const bytes = await fs.readFile(safeFile(root, asset.file_path))
  return asset.mime_type === 'image/png' ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes)
}

function imageSize(image, field) {
  const natural = image.scale(1)
  const width = field.width == null ? null : Number(field.width)
  const height = field.height == null ? null : Number(field.height)
  if (width && height) return { width, height }
  if (width) return image.scale(width / natural.width)
  if (height) return image.scale(height / natural.height)
  return natural
}

/** Coordinates are PDF points: X grows left-to-right and Y grows top-to-bottom. */
async function generateDocument(context) {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')
  const configuredSlots = context.template.fields.map(field => /^PROCEDURE_(\d+)_/.exec(field.field_key)?.[1]).filter(Boolean).map(Number)
  const procedureLimit = configuredSlots.length ? Math.max(...configuredSlots) : PROCEDURE_SLOTS
  if (context.procedures.length > procedureLimit) throw Object.assign(new Error(`O modelo permite até ${procedureLimit} procedimentos e o processo possui ${context.procedures.length}.`), { status: 422 })
  const source = await fs.readFile(safeFile(roots.templates, context.template.template_file_path))
  const pdfDoc = await PDFDocument.load(source)
  const pages = pdfDoc.getPages()
  const values = valuesFor(context)
  const fonts = new Map()
  const fontNames = { HELVETICA: StandardFonts.Helvetica, TIMES_ROMAN: StandardFonts.TimesRoman, COURIER: StandardFonts.Courier }

  for (const field of context.template.fields) {
    const page = pages[Number(field.page) - 1]
    if (!page) throw Object.assign(new Error(`A página ${field.page} não existe no PDF do modelo.`), { status: 422 })
    const options = parseOptions(field.options)
    if (field.field_key === 'DOCTOR_SIGNATURE' || field.field_key === 'INSURANCE_LOGO') {
      const asset = field.field_key === 'DOCTOR_SIGNATURE' ? context.signature : context.logo
      if (!asset) continue
      const image = await embedImage(pdfDoc, asset, field.field_key === 'DOCTOR_SIGNATURE' ? roots.signatures : roots.logos)
      const size = imageSize(image, field)
      page.drawImage(image, { x: Number(field.x), y: page.getHeight() - Number(field.y) - size.height, ...size })
      continue
    }
    const text = transformText(values[field.field_key], DATE_FIELDS.has(field.field_key) && !options.dateFormat ? { ...options, dateFormat: 'DD/MM/YYYY' } : options)
    if (options.required && !text) throw Object.assign(new Error(`O campo obrigatório ${field.field_key} não possui valor.`), { status: 422, missing: [field.field_key] })
    const fontKey = String(options.font || 'HELVETICA').toUpperCase()
    if (!fonts.has(fontKey)) fonts.set(fontKey, await pdfDoc.embedFont(fontNames[fontKey] || StandardFonts.Helvetica))
    const font = fonts.get(fontKey), size = Number(field.font_size) || 10, width = field.width == null ? undefined : Number(field.width)
    let x = Number(field.x)
    if (width && field.alignment === 'CENTER') x += Math.max(0, (width - font.widthOfTextAtSize(text, size)) / 2)
    if (width && field.alignment === 'RIGHT') x += Math.max(0, width - font.widthOfTextAtSize(text, size))
    page.drawText(text, { x, y: page.getHeight() - Number(field.y) - size, size, font, color: color(rgb, options.fontColor), maxWidth: width, lineHeight: options.multiline ? size * 1.2 : undefined })
  }
  return Buffer.from(await pdfDoc.save())
}

module.exports = { FIELD_CATEGORIES, PROCEDURE_SLOTS, fieldKeys, generateDocument, safeFile, roots }
