// Synthetic camera and intercepted APIs only: no webcam, biometrics or production sessions.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('C:/Users/jader/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const origin = process.env.REALMED_UI_TEST_URL || 'http://127.0.0.1:5198'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
;(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.REALMED_BROWSER_EXECUTABLE ? { executablePath: process.env.REALMED_BROWSER_EXECUTABLE } : {}) })
  const context = await browser.newContext({ viewport: { width: 1024, height: 600 }, serviceWorkers: 'block' })
  await context.addInitScript(() => {
    window.__camera = { mode: 'normal', requests: 0, streams: [], constraints: [] }
    const makeStream = () => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480
      const ctx = canvas.getContext('2d')
      const paint = () => {
        const bg = ctx.createLinearGradient(0, 0, 640, 480); bg.addColorStop(0, '#405b70'); bg.addColorStop(1, '#8babb1')
        ctx.fillStyle = bg; ctx.fillRect(0, 0, 640, 480)
        ctx.fillStyle = '#c8d7df'; ctx.beginPath(); ctx.ellipse(320, 225, 88, 118, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#233a4d'; ctx.beginPath(); ctx.ellipse(320, 495, 180, 140, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#2c4353'; ctx.font = '14px sans-serif'; ctx.fillText('CAMERA SIMULADA', 15, 25)
      }
      paint()
      const stream = canvas.captureStream(15)
      const timer = setInterval(paint, 60)
      stream.getTracks().forEach(track => { const stop = track.stop.bind(track); track.stop = () => { clearInterval(timer); stop() } })
      window.__camera.streams.push(stream)
      return stream
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async constraints => {
      window.__camera.requests++; window.__camera.constraints.push(constraints)
      if (window.__camera.mode === 'denied') throw new DOMException('Denied', 'NotAllowedError')
      if (window.__camera.mode === 'missing') throw new DOMException('Missing', 'NotFoundError')
      if (window.__camera.mode === 'deferred') return new Promise(resolve => { window.__resolveCamera = () => resolve(makeStream()) })
      return makeStream()
    } })
  })
  let challengeCalls = 0, faceCalls = 0, result = 'error', heldFace, heldChallenge, holdChallenge = false, lastCaptureAt = 0
  const unexpected = [], errors = []
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    const send = (json, status = 200, headers = {}) => route.fulfill({ status, json, headers })
    if (pathname === '/api/physio/auth/challenge') {
      challengeCalls++
      if (holdChallenge) await new Promise(resolve => { heldChallenge = resolve })
      return send({ id: `fake-${challengeCalls}`, expiresInSeconds: 30 })
    }
    if (pathname === '/api/physio/auth/face') {
      faceCalls++
      lastCaptureAt = Date.now()
      const payload = route.request().postDataJSON()
      assert.match(payload.challenge, /^fake-/)
      assert.equal(payload.frames.length, payload.challenge === 'fake-stepup' ? 16 : 6)
      assert.ok(payload.frames.every(frame => /^data:image\/jpeg;base64,/.test(frame)))
      if (result === 'hold') await new Promise(resolve => { heldFace = resolve })
      if (result === 'rate') return send({ error: 'Muitas tentativas.' }, 429, { 'Retry-After': '3', 'Access-Control-Expose-Headers': 'Retry-After' })
      if (result === 'motion') return send({ code: 'FACE_MOTION_REQUIRED', error: 'Confirmação adicional.', challenge: { id: 'fake-stepup', instruction: 'blink', expiresInSeconds: 30 } }, 401)
      if (result === 'error') return send({ error: 'Não foi possível reconhecer o rosto. Ajuste a iluminação.' }, 422)
      return send({ token: 'synthetic-test-session', developmentMode: true })
    }
    if (pathname === '/api/auth/me') return send({ user: { id: 1, name: 'Profissional de teste', role: 'user', username: 'test', permissions: [] } })
    if (pathname === '/api/physio/me') return send({ professionalName: 'Profissional de teste', developmentMode: true })
    unexpected.push(pathname); return send({ error: 'Unexpected mocked request' }, 500)
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(10000)
  const primary = page.locator('.enter-button'), cancel = page.getByRole('button', { name: 'Cancelar', exact: true })
  const expectText = async text => page.getByRole('heading', { name: text, exact: true }).waitFor()
  const stopped = async () => assert.equal(await page.evaluate(() => window.__camera.streams.every(s => s.getTracks().every(t => t.readyState === 'ended'))), true)
  const dismiss = async () => { while (await page.locator('.notification-close').count()) { await page.locator('.notification-close').first().click(); await page.waitForTimeout(200) } }
  const fit = async label => {
    await page.waitForTimeout(160)
    const sizes = await page.evaluate(() => {
      const controls = document.querySelector('.access-controls').getBoundingClientRect()
      const stage = document.querySelector('.camera-stage').getBoundingClientRect()
      const button = document.querySelector('.enter-button').getBoundingClientRect()
      const guide = document.querySelector('.face-guide')?.getBoundingClientRect()
      const video = document.querySelector('video')
      return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, controlsBottom: controls.bottom, stageHeight: stage.height, buttonHeight: button.height, guideHeight: guide?.height, frameHeight: video.videoWidth ? Math.min(stage.height, stage.width * video.videoHeight / video.videoWidth) : 0 }
    })
    assert.ok(sizes.scrollWidth <= sizes.width + 1, `${label}: horizontal overflow`)
    assert.ok(sizes.scrollHeight <= sizes.height + 1, `${label}: vertical overflow ${JSON.stringify(sizes)}`)
    assert.ok(sizes.controlsBottom <= sizes.height, `${label}: hidden controls`)
    assert.ok(sizes.stageHeight >= sizes.height * .43, `${label}: camera too small`)
    assert.ok(sizes.buttonHeight >= 48)
    if (sizes.guideHeight) assert.ok(sizes.guideHeight <= sizes.frameHeight, `${label}: guide outside actual video`)
  }
  try {
    await page.goto(`${origin}/modo-fisio/entrar`)
    await expectText('Vamos começar?'); await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.evaluate(() => window.__camera.requests), 0)
    fs.mkdirSync('.deployment', { recursive: true })
    for (const [width, height] of [[760, 413], [800, 400], [1024, 600], [1280, 800], [1920, 1080], [390, 844], [768, 1024]]) {
      await page.setViewportSize({ width, height }); await fit(`idle ${width}x${height}`)
      if (width === 760) await page.screenshot({ path: '.deployment/physio-login-compact-landscape.png' })
      if (width === 1024) await page.screenshot({ path: '.deployment/physio-login-new-landscape.png' })
      if (width === 390) await page.screenshot({ path: '.deployment/physio-login-new-portrait.png' })
    }
    await primary.click(); await expectText('Posicione seu rosto')
    await page.waitForTimeout(700)
    assert.equal(challengeCalls, 0, 'Opening camera must not start recognition')
    for (const [width, height] of [[760, 413], [800, 400], [1024, 600], [1280, 800], [1920, 1080], [390, 844], [768, 1024]]) {
      await page.setViewportSize({ width, height }); await fit(`camera ${width}x${height}`)
      if (width === 760) await page.screenshot({ path: '.deployment/physio-login-camera-compact.png' })
      if (width === 1024) await page.screenshot({ path: '.deployment/physio-login-camera-landscape.png' })
    }
    await page.setViewportSize({ width: 1024, height: 600 })
    // Cancellation during the short capture sends no facial payload and stops all tracks/timers.
    await primary.click(); await expectText('Reconhecendo seu rosto'); await cancel.click()
    await page.waitForTimeout(800); assert.equal(faceCalls, 0); assert.equal(challengeCalls, 1); await stopped()
    // Late browser permission after cancel is discarded and stopped.
    await page.evaluate(() => window.__camera.mode = 'deferred')
    await primary.click(); await expectText('Permitindo o acesso à câmera'); await cancel.click()
    await page.evaluate(() => window.__resolveCamera()); await page.waitForTimeout(200); await stopped()
    await expectText('Vamos começar?')
    // Permission errors offer an actionable recovery; no auth calls.
    await page.evaluate(() => window.__camera.mode = 'denied'); await primary.click()
    await expectText('Vamos tentar de novo?'); assert.match(await page.locator('.instruction p').innerText(), /Permita a câmera/)
    await fit('permission denied'); await dismiss()
    await page.evaluate(() => window.__camera.mode = 'normal'); await primary.click(); await expectText('Posicione seu rosto')
    // Explicit failure/retry preserves preview and does not loop.
    const startedAt = Date.now()
    await primary.dblclick(); await expectText('Vamos tentar de novo?')
    assert.equal(challengeCalls, 2); assert.equal(faceCalls, 1)
    assert.ok(lastCaptureAt - startedAt < 2500, 'No artificial three-second countdown before capture')
    assert.equal(await page.locator('.countdown').count(), 0)
    assert.equal(await page.locator('.video-visible').count(), 1)
    await page.waitForTimeout(500); assert.equal(faceCalls, 1); await dismiss()
    // Abort an in-flight challenge, then an in-flight identity response.
    holdChallenge = true; await primary.click()
    for (let i = 0; !heldChallenge && i < 50; i++) await sleep(100)
    assert.ok(heldChallenge); await cancel.click(); heldChallenge(); holdChallenge = false
    await page.waitForTimeout(250); assert.equal(faceCalls, 1); await stopped()
    result = 'hold'; await primary.click(); await expectText('Posicione seu rosto'); await primary.click()
    await expectText('Confirmando sua identidade'); await cancel.click(); result = 'success'; heldFace()
    await page.waitForTimeout(800); await stopped()
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null)
    assert.ok(page.url().endsWith('/modo-fisio/entrar'))
    // Rate limit prevents immediate repeated attempts, then permits an explicit retry.
    result = 'rate'; await primary.click(); await expectText('Posicione seu rosto'); await primary.click()
    await expectText('Vamos tentar de novo?'); assert.equal(await primary.isDisabled(), true)
    const rateCalls = faceCalls; await page.waitForTimeout(3200); assert.equal(faceCalls, rateCalls)
    assert.equal(await primary.isEnabled(), true); await dismiss()
    // Losing foreground cancels capture; coming back never restarts on its own.
    await primary.click(); await expectText('Reconhecendo seu rosto')
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden })
    await expectText('Vamos começar?'); await stopped()
    // Successful recognition opens the existing professional area with a valid server result.
    result = 'success'; await primary.click(); await expectText('Posicione seu rosto'); await primary.click()
    await page.waitForURL('**/modo-fisio')
    await expectText('Profissional de teste'); await stopped()
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), ['token'], 'No frames or clinical data persisted')
    // Additional gesture is explicit and uses the server-issued challenge, never an automatic retry.
    await page.evaluate(() => localStorage.clear()); await page.goto(`${origin}/modo-fisio/entrar`)
    result = 'motion'; await primary.click(); await expectText('Posicione seu rosto'); await primary.click()
    await expectText('Confirmação adicional'); await dismiss()
    const motionCalls = faceCalls, challengesBeforeGesture = challengeCalls
    await page.waitForTimeout(300); assert.equal(faceCalls, motionCalls)
    await page.setViewportSize({ width: 760, height: 413 }); await fit('extra gesture compact landscape')
    assert.equal(await primary.innerText(), 'Confirmar com piscada')
    result = 'success'; await primary.click(); await expectText('Pisque uma vez'); await page.waitForURL('**/modo-fisio')
    assert.equal(challengeCalls, challengesBeforeGesture); await stopped()
    // Navigating out during positioning releases media.
    await page.evaluate(() => localStorage.clear()); await page.goto(`${origin}/modo-fisio/entrar`)
    await primary.click(); await expectText('Posicione seu rosto'); await page.getByRole('link', { name: /Login do Realmed/ }).click()
    await page.waitForURL('**/login'); await stopped()
    assert.deepEqual(unexpected, []); assert.deepEqual(errors, [])
    console.log('PASS: layouts, explicit start, six-frame rapid capture, conditional server-bound gesture, cancel/late responses, permission, retry/429, visibility, success, media cleanup, no persisted captures.')
  } finally { heldFace?.(); heldChallenge?.(); await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
