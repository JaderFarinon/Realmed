<template>
  <main class="physio-access">
    <header class="access-header">
      <div class="access-brand"><strong>REALMED</strong><span class="brand-divider" /><span class="access-label">Fisioterapeuta</span></div>
      <RouterLink to="/login" class="system-login">Login do Realmed <span aria-hidden="true">↗</span></RouterLink>
    </header>
    <section class="access-station" :class="{ 'is-live': cameraOpen, 'is-success': phase === 'success' }" aria-label="Acesso por reconhecimento facial">
      <div ref="cameraStage" class="camera-stage">
        <video ref="video" autoplay muted playsinline class="camera-video" :class="{ 'video-visible': cameraOpen }" aria-label="Prévia da câmera frontal" />
        <div class="camera-topline" aria-hidden="true">
          <span class="camera-badge"><span class="camera-dot" />{{ cameraOpen ? 'Câmera ligada' : 'Acesso facial' }}</span>
          <span class="step-count">{{ step }} / 3</span>
        </div>
        <div v-if="!cameraOpen" class="camera-welcome">
          <svg class="welcome-symbol" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path class="scan-corners" d="M35 10H21a11 11 0 0 0-11 11v14m75-25h14a11 11 0 0 1 11 11v14M10 85v14a11 11 0 0 0 11 11h14m50 0h14a11 11 0 0 0 11-11V85" />
            <path class="scan-face" d="M38 48v10m44-10v10M60 48v20h-6m-12 9c10 10 26 10 36 0" />
          </svg>
          <h1>{{ phase === 'success' ? 'Tudo certo!' : 'Seu próximo atendimento começa aqui.' }}</h1>
          <p>{{ phase === 'success' ? 'Abrindo sua área de atendimento…' : 'Entre com seu rosto, no seu tempo.' }}</p>
        </div>
        <template v-else>
          <div class="face-guide" :style="guideSize" aria-hidden="true"><span /><span /><span /><span /></div>
          <div v-if="phase === 'verifying'" class="camera-processing" aria-hidden="true"><span class="spinner" /></div>
          <div class="camera-caption">{{ phase === 'capturing' ? blinkChallenge ? 'Pisque uma vez' : 'Só um instante, mantenha o rosto visível' : 'Olhe naturalmente para a câmera' }}</div>
        </template>
      </div>
      <div class="access-controls">
        <div class="instruction" role="status" aria-live="polite" aria-atomic="true">
          <span class="instruction-number" aria-hidden="true">{{ phase === 'success' ? '✓' : '0' + step }}</span>
          <div><h2>{{ heading }}</h2><p :class="{ 'instruction-error': phase === 'error' }">{{ description }}</p></div>
        </div>
        <div class="access-actions">
          <button v-if="canCancel" type="button" class="cancel-button" @click="cancel">Cancelar</button>
          <button type="button" class="enter-button" :disabled="busy || cooldownSeconds > 0" @click="cameraOpen ? recognize() : openCamera()">
            <span v-if="busy && phase !== 'success'" class="spinner" aria-hidden="true" />
            <svg v-else-if="phase !== 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
            {{ buttonLabel }}
          </button>
        </div>
      </div>
    </section>
    <footer class="access-footer">
      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg> Suas imagens não são salvas.</span>
      <button v-if="installAvailable" type="button" @click="installApp">Instalar no tablet <span aria-hidden="true">↓</span></button>
      <span v-else class="footer-help">Acesso para profissionais cadastrados</span>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import { notify } from '@/composables/useNotifications'
import { apiCooldownRemaining } from '@/utils/apiCooldown'

type Phase = 'idle' | 'opening' | 'positioning' | 'preparing' | 'capturing' | 'verifying' | 'success' | 'error'
const phase = ref<Phase>('idle')
const video = ref<HTMLVideoElement | null>(null)
const cameraStage = ref<HTMLElement | null>(null)
const guideSize = ref({ width: '0px', height: '0px' })
const cameraOpen = ref(false)
const problem = ref('')
const blinkChallenge = ref<string | null>(null)
const cooldownSeconds = ref(0)
const installAvailable = ref(false)
const router = useRouter()
let stream: MediaStream | null = null
let operation: AbortController | null = null
let generation = 0
let disposed = false
let cooldownTimer: ReturnType<typeof setTimeout> | undefined
let resizeObserver: ResizeObserver | undefined
const busy = computed(() => ['opening', 'preparing', 'capturing', 'verifying', 'success'].includes(phase.value))
const canCancel = computed(() => phase.value !== 'success' && (cameraOpen.value || phase.value === 'opening'))
const step = computed(() => ['preparing', 'capturing', 'verifying', 'success'].includes(phase.value) ? 3 : cameraOpen.value ? 2 : 1)
const heading = computed(() => ({
  idle: 'Vamos começar?', opening: 'Permitindo o acesso à câmera', positioning: blinkChallenge.value ? 'Confirmação adicional' : 'Posicione seu rosto',
  preparing: 'Preparando a leitura',
  capturing: blinkChallenge.value ? 'Pisque uma vez' : 'Reconhecendo seu rosto', verifying: 'Confirmando sua identidade', success: 'Login realizado', error: 'Vamos tentar de novo?',
}[phase.value]))
const description = computed(() => ({
  idle: 'Ative a câmera frontal para entrar.', opening: 'Toque em Permitir quando o navegador solicitar.',
  positioning: blinkChallenge.value ? 'Não percebemos movimento suficiente. Toque em Confirmar com piscada e pisque uma vez.' : 'Ajuste o tablet e enquadre o rosto. Quando estiver pronto, toque em Entrar.',
  preparing: 'Olhe naturalmente para a câmera.', capturing: blinkChallenge.value ? 'Mantenha o rosto visível e pisque naturalmente.' : 'Mantenha o rosto visível. Não precisa piscar.',
  verifying: 'Só um instante. Estamos verificando seu acesso.', success: 'Sua área de atendimento será aberta em instantes.', error: problem.value,
}[phase.value]))
const buttonLabel = computed(() => {
  if (cooldownSeconds.value) return `Aguarde ${cooldownSeconds.value}s`
  if (phase.value === 'opening') return 'Abrindo câmera…'
  if (phase.value === 'success') return 'Entrando…'
  if (busy.value) return 'Reconhecendo…'
  if (blinkChallenge.value) return 'Confirmar com piscada'
  if (phase.value === 'error') return cameraOpen.value ? 'Tentar novamente' : 'Ativar câmera'
  return cameraOpen.value ? 'Entrar' : 'Ativar câmera'
})

function releaseCamera() {
  stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
  stream = null
  if (video.value) video.value.srcObject = null
  cameraOpen.value = false
}
function cancel() {
  generation += 1
  operation?.abort()
  operation = null
  releaseCamera()
  problem.value = ''
  blinkChallenge.value = null
  phase.value = 'idle'
}
const isCurrent = (run: number) => !disposed && generation === run
function fail(message: string) {
  problem.value = message
  phase.value = 'error'
  notify(message, 'error')
}
function cameraError(cause: unknown) {
  const name = (cause as Error)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Permita a câmera nas configurações deste site no navegador e tente novamente.'
  if (name === 'NotFoundError') return 'Nenhuma câmera foi encontrada. Confira a câmera do dispositivo e tente novamente.'
  if (name === 'NotReadableError' || name === 'AbortError') return 'A câmera não está disponível. Feche outros aplicativos que usam a câmera e tente novamente.'
  return 'Não foi possível abrir a câmera. Confira a permissão no navegador e tente novamente.'
}
function fitGuide() {
  if (!video.value?.videoWidth || !cameraStage.value) return
  const ratio = video.value.videoWidth / video.value.videoHeight
  const height = Math.min(cameraStage.value.clientHeight, cameraStage.value.clientWidth / ratio) * .76
  guideSize.value = { width: `${height * .76}px`, height: `${height}px` }
}
async function openCamera() {
  if (busy.value || cooldownSeconds.value) return
  cancel()
  const run = generation
  phase.value = 'opening'
  if (!navigator.mediaDevices?.getUserMedia) {
    fail('Abra o Realmed pelo endereço HTTPS em um navegador com acesso à câmera, como o Chrome.')
    return
  }
  try {
    const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
    // Permission may resolve after cancellation/navigation. Never leave that camera running.
    if (!isCurrent(run)) { acquired.getTracks().forEach(track => track.stop()); return }
    stream = acquired
    acquired.getVideoTracks().forEach(track => {
      track.onended = () => {
        if (stream !== acquired) return
        cancel()
        fail('A câmera foi desconectada. Ative-a novamente para continuar.')
      }
    })
    await nextTick()
    if (!isCurrent(run) || !video.value) return
    video.value.srcObject = acquired
    await video.value.play()
    if (!isCurrent(run)) return
    if (!video.value.videoWidth || !video.value.videoHeight) throw new Error('Empty camera frame')
    cameraOpen.value = true
    phase.value = 'positioning'
    await nextTick()
    fitGuide()
  } catch (cause) {
    if (!isCurrent(run)) return
    releaseCamera()
    fail(cameraError(cause))
  }
}
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Canceled', 'AbortError')); return }
    const finish = () => { signal.removeEventListener('abort', abort); resolve() }
    const timer = setTimeout(finish, ms)
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new DOMException('Canceled', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
  })
}
function updateCooldown() {
  clearTimeout(cooldownTimer)
  cooldownSeconds.value = Math.ceil(apiCooldownRemaining() / 1000)
  if (cooldownSeconds.value && !disposed) cooldownTimer = setTimeout(updateCooldown, 1000)
}
async function recognize() {
  if (!cameraOpen.value || !video.value || busy.value) return
  updateCooldown()
  if (cooldownSeconds.value) return
  operation?.abort()
  const controller = new AbortController()
  operation = controller
  const run = ++generation
  const images: string[] = []
  let canvas: HTMLCanvasElement | undefined
  problem.value = ''
  phase.value = 'preparing'
  try {
    const challenge = blinkChallenge.value ? { id: blinkChallenge.value } : (await api.post('/physio/auth/challenge', {}, { signal: controller.signal })).data
    if (!isCurrent(run)) return
    const element = video.value
    if (!element?.videoWidth || !element.videoHeight) throw new Error('Camera stopped')
    canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = Math.round(480 * element.videoHeight / element.videoWidth)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    phase.value = 'capturing'
    await nextTick()
    const frameCount = blinkChallenge.value ? 16 : 6
    for (let index = 0; index < frameCount; index += 1) {
      if (!isCurrent(run)) return
      context.drawImage(element, 0, 0, canvas.width, canvas.height)
      images.push(canvas.toDataURL('image/jpeg', 0.82))
      if (index < frameCount - 1) await pause(120, controller.signal)
    }
    phase.value = 'verifying'
    const { data } = await api.post('/physio/auth/face', { challenge: challenge.id, frames: images }, { signal: controller.signal })
    if (!isCurrent(run)) return
    if (!data.token) throw new Error('Session unavailable')
    images.fill('')
    releaseCamera()
    phase.value = 'success'
    await pause(150, controller.signal)
    if (!isCurrent(run)) return
    localStorage.setItem('token', data.token)
    await router.replace('/modo-fisio')
  } catch (cause) {
    if (!isCurrent(run) || controller.signal.aborted) return
    const error = cause as { response?: { status?: number; data?: { error?: string; code?: string; challenge?: { id?: string } } } }
    if (error.response?.data?.code === 'FACE_MOTION_REQUIRED' && typeof error.response.data.challenge?.id === 'string') {
      blinkChallenge.value = error.response.data.challenge.id
      phase.value = 'positioning'
      notify('Precisamos de uma confirmação adicional. Toque em Confirmar com piscada para continuar.', 'info')
      return
    }
    blinkChallenge.value = null
    updateCooldown()
    fail(error.response?.status === 429
      ? 'Muitas tentativas. Aguarde o tempo indicado antes de tentar novamente.'
      : error.response?.data?.error || 'Não foi possível confirmar seu acesso. Confira a iluminação, mantenha o rosto de frente e tente novamente.')
  } finally {
    images.fill('')
    if (canvas) { canvas.width = 0; canvas.height = 0 }
    if (operation === controller) operation = null
  }
}
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}
let installPrompt: InstallPromptEvent | null = null
function captureInstallPrompt(event: Event) {
  event.preventDefault()
  installPrompt = event as InstallPromptEvent
  installAvailable.value = true
}
function appInstalled() { installPrompt = null; installAvailable.value = false }
async function installApp() {
  const prompt = installPrompt
  if (!prompt) return
  appInstalled()
  try { await prompt.prompt(); await prompt.userChoice } catch { notify('Para instalar, use a opção Instalar app no menu do navegador.', 'info') }
}
function handleVisibility() { if (document.hidden) cancel() }
onMounted(() => {
  updateCooldown()
  resizeObserver = new ResizeObserver(fitGuide)
  if (cameraStage.value) resizeObserver.observe(cameraStage.value)
  window.addEventListener('beforeinstallprompt', captureInstallPrompt)
  window.addEventListener('appinstalled', appInstalled)
  window.addEventListener('pagehide', cancel)
  document.addEventListener('visibilitychange', handleVisibility)
})
onBeforeUnmount(() => {
  disposed = true
  cancel()
  clearTimeout(cooldownTimer)
  resizeObserver?.disconnect()
  window.removeEventListener('beforeinstallprompt', captureInstallPrompt)
  window.removeEventListener('appinstalled', appInstalled)
  window.removeEventListener('pagehide', cancel)
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<style scoped>
.physio-access { --access-accent: #79e1cb; box-sizing: border-box; display: grid; grid-template-rows: auto minmax(190px, 1fr) auto; gap: clamp(12px, 2.2vh, 24px); height: 100vh; height: 100dvh; min-height: 360px; padding: max(12px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left)); color: #f5f8ff; background: radial-gradient(ellipse at 50% 10%, #203b4b 0, #10212f 45%, #0a1623 100%); }
.access-header, .access-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; max-width: 1120px; margin-inline: auto; }
.access-brand { display: flex; align-items: center; gap: 10px; }
.access-brand strong { font-size: 18px; letter-spacing: .055em; }
.brand-divider { height: 20px; width: 1px; margin-inline: 4px; background: #ffffff26; }
.access-label { color: #c3d5e2; font-size: 13px; }
.system-login { display: inline-flex; align-items: center; gap: 16px; min-height: 44px; padding: 8px 12px; border-radius: 10px; color: #d9e7f0; font-size: 13px; }
.system-login:hover { background: #ffffff0d; }
.system-login span { font-size: 19px; color: var(--access-accent); }
.access-station { display: grid; grid-template-rows: minmax(130px, 1fr) auto; width: 100%; max-width: 1120px; min-height: 0; margin-inline: auto; border: 1px solid #ffffff26; border-radius: 24px; overflow: hidden; background: #0c1825; box-shadow: 0 18px 60px #00000035; }
.camera-stage { position: relative; min-height: 0; overflow: hidden; background: radial-gradient(ellipse at center, #213e4e, #122636 65%, #10202f); }
.camera-stage::before { content: ''; position: absolute; inset: 0; opacity: .28; background-image: linear-gradient(#a6d0df15 1px, transparent 1px), linear-gradient(90deg, #a6d0df15 1px, transparent 1px); background-size: 54px 54px; pointer-events: none; }
.camera-video { position: absolute; width: 100%; height: 100%; inset: 0; object-fit: contain; transform: scaleX(-1); opacity: 0; background: #08121d; }
.camera-video.video-visible { opacity: 1; }
.camera-topline { position: absolute; top: 18px; left: 20px; right: 20px; display: flex; align-items: center; justify-content: space-between; z-index: 1; pointer-events: none; }
.camera-badge, .step-count { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; background: #0a192dc9; border: 1px solid #ffffff1f; border-radius: 20px; font-size: 11px; color: #d8e6ef; }
.camera-dot { width: 6px; height: 6px; border-radius: 50%; background: #9bb0c2; }
.is-live .camera-dot { background: var(--access-accent); box-shadow: 0 0 0 3px #79e1cb20; }
.step-count { font-variant-numeric: tabular-nums; letter-spacing: .16em; }
.camera-welcome { position: absolute; inset: 46px 24px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.welcome-symbol { flex-shrink: 1; min-height: 36px; width: clamp(58px, 14vh, 120px); max-height: 27%; margin-bottom: clamp(12px, 3vh, 28px); stroke: var(--access-accent); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.8; }
.scan-face { stroke: #d3eee8; stroke-width: 3; }
.camera-welcome h1 { max-width: 600px; margin: 0; font-size: clamp(24px, 3vw, 38px); font-weight: 600; line-height: 1.22; letter-spacing: -.035em; text-wrap: balance; }
.camera-welcome p { margin-top: 12px; color: #b5cedb; font-size: 15px; }
.face-guide { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); height: 76%; max-width: 72%; aspect-ratio: .76; border: 1px solid #ffffff59; border-radius: 46%; pointer-events: none; }
.face-guide span { position: absolute; width: 28px; height: 28px; border-color: var(--access-accent); border-style: solid; }
.face-guide span:nth-child(1) { top: 3%; left: 3%; border-width: 3px 0 0 3px; border-radius: 14px 0 0; }
.face-guide span:nth-child(2) { top: 3%; right: 3%; border-width: 3px 3px 0 0; border-radius: 0 14px 0 0; }
.face-guide span:nth-child(3) { bottom: 3%; left: 3%; border-width: 0 0 3px 3px; border-radius: 0 0 0 14px; }
.face-guide span:nth-child(4) { bottom: 3%; right: 3%; border-width: 0 3px 3px 0; border-radius: 0 0 14px; }
.camera-caption { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); max-width: calc(100% - 24px); width: max-content; border: 1px solid #ffffff26; border-radius: 30px; background: #081727dd; padding: 7px 14px; font-size: 12px; text-align: center; }
.camera-processing { position: absolute; inset: 0; display: grid; place-content: center; background: #07152338; color: #fff; }
.camera-processing .spinner { width: 44px; height: 44px; border-width: 3px; }
.access-controls { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 24px; border-top: 1px solid #ffffff1f; background: #122536; }
.instruction { display: flex; align-items: center; gap: 14px; min-width: 0; }
.instruction-number { flex: none; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; background: #79e1cb14; border: 1px solid #79e1cb40; color: var(--access-accent); font-size: 14px; font-weight: 600; }
.instruction h2 { margin: 0; font-size: 17px; font-weight: 600; line-height: 1.3; }
.instruction p { max-width: 540px; margin-top: 5px; font-size: 13px; color: #b8cbd8; line-height: 1.5; }
.instruction p.instruction-error { color: #ffc3b5; }
.access-actions { flex-shrink: 0; display: flex; align-items: center; gap: 10px; }
.enter-button, .cancel-button { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 50px; border-radius: 12px; padding: 10px 20px; font-size: 14px; font-weight: 600; white-space: nowrap; }
.enter-button { min-width: 172px; background: var(--access-accent); color: #092c29; box-shadow: 0 4px 16px #0002; }
.enter-button:not(:disabled):hover { background: #a1f1df; }
.enter-button:disabled { background: #234c50; color: #d5f3ea; cursor: default; box-shadow: none; }
.cancel-button { border: 1px solid #90aeb84f; color: #dae6ec; }
.cancel-button:hover { background: #ffffff0d; }
.spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: access-spin .8s linear infinite; }
.access-footer { min-height: 24px; color: #a3bccb; font-size: 11px; }
.access-footer > span:first-child, .access-footer button { display: flex; align-items: center; gap: 6px; }
.access-footer button { min-height: 32px; color: var(--access-accent); }
.physio-access button:focus-visible, .physio-access a:focus-visible { outline: 3px solid #a1f1df; outline-offset: 4px; }
.is-success { border-color: #79e1cb80; }
@keyframes access-spin { to { transform: rotate(360deg); } }
@media (max-width: 860px) {
  .access-controls { padding: 16px; gap: 14px; }
  .instruction { gap: 10px; }
  .instruction-number { display: none; }
  .instruction h2 { font-size: 16px; }
  .instruction p { font-size: 12px; }
  .enter-button { min-width: 150px; }
  .enter-button, .cancel-button { padding-inline: 14px; }
}
@media (max-height: 550px) and (orientation: landscape) {
  .physio-access { gap: 10px; padding-block: 8px; }
  .access-station { border-radius: 18px; }
  .access-header { min-height: 36px; }
  .system-login { min-height: 40px; }
  .camera-topline { top: 10px; left: 14px; right: 14px; }
  .camera-welcome { inset-block: 34px 12px; }
  .welcome-symbol { margin-bottom: 10px; }
  .camera-welcome h1 { max-width: 600px; font-size: 24px; }
  .camera-welcome p { margin-top: 6px; font-size: 13px; }
  .access-controls { padding: 12px 16px; }
  .access-footer { min-height: 16px; }
  .camera-caption { bottom: 8px; padding-block: 4px; }
}
@media (max-width: 600px) and (orientation: portrait) {
  .physio-access { min-height: 600px; padding-inline: 14px; gap: 14px; }
  .brand-divider, .access-label { display: none; }
  .access-station { border-radius: 20px; }
  .access-controls { flex-direction: column; align-items: stretch; gap: 18px; padding: 20px; }
  .instruction { min-height: 66px; }
  .instruction h2 { font-size: 18px; }
  .instruction p { font-size: 13px; }
  .access-actions { width: 100%; }
  .enter-button { flex: 1; }
  .camera-welcome { inset-inline: 22px; }
  .camera-welcome h1 { font-size: 29px; }
  .camera-welcome p { font-size: 14px; }
  .camera-topline { left: 14px; right: 14px; }
  .access-footer { justify-content: center; flex-wrap: wrap; gap: 4px; }
  .footer-help { display: none; }
}
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
