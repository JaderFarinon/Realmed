const fs = require('fs/promises')
const path = require('path')
const os = require('os')
const { execFile } = require('child_process')
const { PDFDocument } = require('pdf-lib')
const privateTesseract = '/qyvia/realmed/shared/ocr/bin/tesseract'
let running = 0
function command(binary, args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const linux = process.platform === 'linux'
    execFile(
      linux ? 'prlimit' : binary,
      linux ? ['--as=1073741824', '--cpu=40', '--', binary, ...args] : args,
      {
        timeout,
        maxBuffer: 256 * 1024,
        env: { ...process.env, OMP_THREAD_LIMIT: '1' },
      },
      (error, stdout) => {
        if (error)
          return reject(
            Object.assign(
              new Error(
                error.code === 'ENOENT' || error.code === 127
                  ? 'OCR indisponível no servidor. Verifique Tesseract e Poppler.'
                  : 'Não foi possível ler esta página. Confira o arquivo, a página e a qualidade da digitalização.',
              ),
              { status: 422 },
            ),
          )
        resolve(stdout)
      },
    )
  })
}
async function extract(file, mime, page = 1) {
  if (!Number.isInteger(page) || page < 1 || page > 20)
    throw Object.assign(new Error('Selecione uma página de 1 a 20.'), {
      status: 422,
    })
  if (running >= 2)
    throw Object.assign(
      new Error('Há duas leituras em andamento. Tente novamente em instantes.'),
      { status: 429 },
    )
  running++
  let directory
  try {
    const stat = await fs.stat(file)
    if (stat.size > 10 * 1024 * 1024)
      throw Object.assign(new Error('A guia excede 10 MB.'), { status: 422 })
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'realmed-ocr-'))
    await fs.chmod(directory, 0o700)
    let image = file,
      native = ''
    if (mime === 'application/pdf') {
      const document = await PDFDocument.load(await fs.readFile(file))
      if (page > document.getPageCount())
        throw Object.assign(
          new Error('A página selecionada não existe no PDF.'),
          { status: 422 },
        )
      native = await command(
        process.env.REALMED_PDFTOTEXT || 'pdftotext',
        ['-f', String(page), '-l', String(page), '-layout', file, '-'],
        5000,
      )
      const prefix = path.join(directory, 'page')
      await command(
        process.env.REALMED_PDFTOPPM || 'pdftoppm',
        [
          '-f',
          String(page),
          '-l',
          String(page),
          '-scale-to',
          '3000',
          '-singlefile',
          '-png',
          file,
          prefix,
        ],
        15000,
      )
      image = prefix + '.png'
    } else if (!['image/png', 'image/jpeg'].includes(mime))
      throw Object.assign(new Error('Use PDF, PNG ou JPEG.'), { status: 422 })
    // OCR also runs when native labels exist over a scanned form.
    const executable =
      process.env.REALMED_TESSERACT ||
      (require('fs').existsSync(privateTesseract)
        ? privateTesseract
        : 'tesseract')
    const scanned = await command(executable, [
      image,
      'stdout',
      '-l',
      'por+eng',
      '--psm',
      '11',
    ])
    return {
      text: [native, scanned].filter(Boolean).join('\n').slice(0, 24000),
      page,
      method: 'LOCAL_OCR',
    }
  } catch (error) {
    if (error.status) throw error
    throw Object.assign(
      new Error(
        'Não foi possível ler a guia. Confira se o arquivo está íntegro e sem senha.',
      ),
      { status: 422 },
    )
  } finally {
    running--
    if (directory) await fs.rm(directory, { recursive: true, force: true })
  }
}
module.exports = { extract }
