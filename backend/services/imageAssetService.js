const path = require('path')

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = Object.freeze({
  'image/png': { extension: '.png', extensions: new Set(['.png']) },
  'image/jpeg': { extension: '.jpg', extensions: new Set(['.jpg', '.jpeg']) },
})

function isPng(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return false
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20)
  return width > 0 && height > 0 && buffer.includes(Buffer.from('IEND'), 24)
}

function isJpeg(buffer) {
  if (buffer.length < 12 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer.at(-2) !== 0xff || buffer.at(-1) !== 0xd9) return false
  let offset = 2
  while (offset + 4 <= buffer.length - 2) {
    if (buffer[offset] !== 0xff) return false
    while (buffer[offset] === 0xff) offset += 1
    const marker = buffer[offset++]
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > buffer.length) return false
    const length = buffer.readUInt16BE(offset)
    if (length < 2 || offset + length > buffer.length) return false
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return length >= 7 && buffer.readUInt16BE(offset + 3) > 0 && buffer.readUInt16BE(offset + 5) > 0
    }
    offset += length
  }
  return false
}

function safeOriginalName(value) {
  let decoded
  try { decoded = decodeURIComponent(String(value || 'imagem')) } catch { throw Object.assign(new Error('Nome de arquivo inválido.'), { status: 400 }) }
  return path.basename(decoded).slice(0, 255) || 'imagem'
}

function validateImageUpload({ buffer, mimeType, originalName, allowedMimeTypes = Object.keys(IMAGE_TYPES) }) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw Object.assign(new Error('Selecione uma imagem válida.'), { status: 400 })
  if (buffer.length > MAX_IMAGE_BYTES) throw Object.assign(new Error('A imagem deve ter no máximo 5 MB.'), { status: 413 })
  const type = allowedMimeTypes.includes(mimeType) ? IMAGE_TYPES[mimeType] : null
  const name = safeOriginalName(originalName), extension = path.extname(name).toLowerCase()
  if (!type || !type.extensions.has(extension)) throw Object.assign(new Error('A logo deve ser um arquivo PNG, JPG ou JPEG.'), { status: 400 })
  const valid = mimeType === 'image/png' ? isPng(buffer) : isJpeg(buffer)
  if (!valid) throw Object.assign(new Error('O conteúdo do arquivo não é uma imagem válida do tipo informado.'), { status: 400 })
  return { extension: type.extension, originalName: name }
}

module.exports = { MAX_IMAGE_BYTES, IMAGE_TYPES, isPng, isJpeg, safeOriginalName, validateImageUpload }
