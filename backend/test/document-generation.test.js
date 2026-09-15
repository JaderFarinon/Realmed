const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')
Object.assign(process.env, { JWT_SECRET: 'test-only-secret', DB_HOST: 'localhost', DB_USER: 'test', DB_PASS: 'test', DB_NAME: 'test', DB_PORT: '3306' })
const { generateDocument, roots, safeFile } = require('../services/documentGenerationService')
const { documentPath } = require('../routes/guide-operations')

let PDFDocument
try { ({ PDFDocument } = require('pdf-lib')) } catch { /* dependency installation is validated in CI */ }

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

test('generated documents can only resolve inside their explicit storage root', () => {
  assert.equal(documentPath({ source: 'GENERATED', file_path: 'result.pdf' }), path.resolve(__dirname, '../../storage/generated/result.pdf'))
  assert.throws(() => documentPath({ source: 'GENERATED', file_path: '../documents/private.pdf' }), /inválido/)
  assert.throws(() => safeFile(roots.templates, '../secret.pdf'), /inválido/)
})

test('overlays fields and images on the real template while preserving page dimensions', { skip: !PDFDocument && 'pdf-lib is not installed in this environment' }, async () => {
  await Promise.all(Object.values(roots).map(root => fs.mkdir(root, { recursive: true })))
  const id = crypto.randomUUID(), templateName = `${id}.pdf`, signatureName = `${id}-signature.png`, logoName = `${id}-logo.png`
  const source = await PDFDocument.create(), page = source.addPage([420, 297])
  page.drawRectangle({ x: 10, y: 10, width: 400, height: 277, borderWidth: 3 })
  page.drawText('FUNDO ORIGINAL', { x: 20, y: 260 })
  await fs.writeFile(safeFile(roots.templates, templateName), await source.save())
  await fs.writeFile(safeFile(roots.signatures, signatureName), png)
  await fs.writeFile(safeFile(roots.logos, logoName), png)
  const fields = [
    { field_key: 'PATIENT_NAME', page: 1, x: 30, y: 40, font_size: 12, options: { uppercase: true, prefix: 'PACIENTE: ' } },
    { field_key: 'PROCEDURE_1_CODE', page: 1, x: 30, y: 70, font_size: 10 },
    { field_key: 'PROCEDURE_2_DESCRIPTION', page: 1, x: 30, y: 90, font_size: 10 },
    { field_key: 'DOCTOR_SIGNATURE', page: 1, x: 30, y: 120, width: 40 },
    { field_key: 'INSURANCE_LOGO', page: 1, x: 100, y: 120, height: 30 },
  ]
  const context = { template: { template_file_path: templateName, fields }, process: { patient_name: 'Maria Silva' }, procedures: [{ code: '101', description: 'Consulta', requested_quantity: 1 }, { code: '202', description: 'Fisioterapia', requested_quantity: 2 }], signature: { file_path: signatureName, mime_type: 'image/png' }, logo: { file_path: logoName, mime_type: 'image/png' } }
  try {
    const preview = await generateDocument(context), definitiveLayout = await generateDocument(context)
    const result = await PDFDocument.load(preview), definitive = await PDFDocument.load(definitiveLayout)
    assert.deepEqual(result.getPage(0).getSize(), { width: 420, height: 297 })
    assert.equal(result.getPageCount(), 1)
    assert.deepEqual(definitive.getPage(0).getSize(), result.getPage(0).getSize())
    assert.ok(preview.length > (await fs.stat(safeFile(roots.templates, templateName))).size)
    await assert.rejects(() => generateDocument({ ...context, procedures: Array(3).fill(context.procedures[0]) }), /permite até 2 procedimentos/)
  } finally {
    await Promise.all([[roots.templates, templateName], [roots.signatures, signatureName], [roots.logos, logoName]].map(([root, name]) => fs.unlink(safeFile(root, name)).catch(() => {})))
  }
})
