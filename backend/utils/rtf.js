const removeDiacritics = (value = '') =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '')

const decodeHexSequence = (match, hex) => {
  try {
    const buffer = Buffer.from(hex, 'hex')
    return buffer.toString('latin1')
  } catch (error) {
    return ''
  }
}

const decodeUnicodeSequence = (match, codePointRaw) => {
  const parsed = Number.parseInt(codePointRaw, 10)
  if (Number.isNaN(parsed)) {
    return ''
  }

  let codePoint = parsed
  if (codePoint < 0) {
    codePoint = 0x10000 + codePoint
  }

  if (codePoint < 0 || codePoint > 0x10ffff) {
    return ''
  }

  try {
    return String.fromCodePoint(codePoint)
  } catch (error) {
    return ''
  }
}

const cleanupControlWords = (value) =>
  value
    .replace(/\\'([0-9a-fA-F]{2})/g, decodeHexSequence)
    .replace(/\\u(-?\d+)\??/g, decodeUnicodeSequence)
    .replace(/\\par[d]?/gi, '\n')
    .replace(/\\line/gi, '\n')
    .replace(/\\tab/gi, '\t')
    .replace(/\\~|\\_/g, ' ')

const stripRtfControls = (value) =>
  value
    .replace(/\{\\\*[^{}]*\}/g, '')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/\\[^a-zA-Z]/g, '')
    .replace(/[{}]/g, '')

const normalizeWhitespace = (value) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

const rtfParaTexto = (input) => {
  if (input === null || input === undefined) {
    return ''
  }

  const texto = String(input)
  if (texto.trim() === '') {
    return ''
  }

  const semQuebrasIndesejadas = cleanupControlWords(texto)
  const semControles = stripRtfControls(semQuebrasIndesejadas)
  const semDiacriticosEspurios = removeDiacritics(semControles).length
    ? semControles
    : semQuebrasIndesejadas
  const normalizado = normalizeWhitespace(semDiacriticosEspurios)

  return normalizado
}

module.exports = {
  rtfParaTexto,
  removeDiacritics,
}
