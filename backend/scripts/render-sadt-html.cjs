// Development preview only. Production PDF generation continues to use pdf-lib.
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

async function render({ playwright, input, output }) {
  const browser = await playwright.chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(pathToFileURL(input).href)
    await page.evaluate(() => window.sadtReady)
    const dimensions = await page.locator('.sheet').evaluate(element => ({ width: Number(element.dataset.widthPt), height: Number(element.dataset.heightPt) }))
    if (errors.length) throw new Error(errors.join('\n'))
    await fs.mkdir(path.dirname(output), { recursive: true })
    await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
    // Chromium rounds paper edges to CSS pixels. Preserve the reference's exact
    // MediaBox without shifting the form relative to the top of the page.
    const { PDFDocument } = require('pdf-lib')
    const pdf = await PDFDocument.load(await fs.readFile(output))
    if (pdf.getPageCount() !== 1) throw new Error('The SADT form must fit a single page')
    const paper = pdf.getPage(0), previousHeight = paper.getHeight()
    paper.setSize(dimensions.width, dimensions.height)
    paper.translateContent(0, dimensions.height - previousHeight)
    const digest = require('node:crypto').createHash('sha256').update(await fs.readFile(input)).digest('hex')
    pdf.setSubject(`Realmed SADT HTML sha256=${digest}`)
    await fs.writeFile(output, await pdf.save())
    console.log(`PDF rendered from native HTML: ${output}`)
  } finally { await browser.close() }
}

if (require.main === module) {
  const runtime = process.env.REALMED_PLAYWRIGHT_ROOT
  let playwright
  try { playwright = require(runtime || 'playwright') } catch {
    console.error('For this development preview, install Playwright or set REALMED_PLAYWRIGHT_ROOT. No production dependency was added.')
    process.exitCode = 1
  }
  if (playwright) render({ playwright,
    input: path.resolve(process.argv[2] || path.join(__dirname, '../templates/sadt/guia-sadt.html')),
    output: path.resolve(process.argv[3] || path.join(__dirname, '../../output/pdf/guia-sadt-reproduzida.pdf')),
  }).catch(error => { console.error(error); process.exitCode = 1 })
}
module.exports = { render }
