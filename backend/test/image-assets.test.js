const test = require('node:test')
const assert = require('node:assert/strict')
const { MAX_IMAGE_BYTES, safeOriginalName, validateImageUpload } = require('../services/imageAssetService')

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

test('accepts a structurally valid PNG and normalizes its metadata', () => {
  assert.deepEqual(validateImageUpload({ buffer: png, mimeType: 'image/png', originalName: encodeURIComponent('../marca.png') }), { extension: '.png', originalName: 'marca.png' })
  assert.equal(safeOriginalName('pasta%2Flogo.jpeg'), 'logo.jpeg')
})

test('rejects extension, MIME and content mismatches', () => {
  assert.throws(() => validateImageUpload({ buffer: png, mimeType: 'image/png', originalName: 'logo.pdf' }), /PNG, JPG ou JPEG/)
  assert.throws(() => validateImageUpload({ buffer: png, mimeType: 'image/jpeg', originalName: 'logo.jpg' }), /conteúdo/)
  assert.throws(() => validateImageUpload({ buffer: Buffer.from('not an image'), mimeType: 'image/png', originalName: 'logo.png' }), /conteúdo/)
})

test('rejects images over the configured 5 MB limit', () => {
  assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024)
  assert.throws(() => validateImageUpload({ buffer: Buffer.alloc(MAX_IMAGE_BYTES + 1), mimeType: 'image/png', originalName: 'logo.png' }), /5 MB/)
})
