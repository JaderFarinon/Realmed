<template>
  <section class="face-enrollment">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold">Identificação facial</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          {{ enrolled ? 'Rosto cadastrado. Uma nova captura substituirá o cadastro atual.' : 'Cadastre três imagens para reconhecer este fisioterapeuta.' }}
        </p>
      </div>
      <span class="rounded-full px-3 py-1 text-sm" :class="enrolled ? 'bg-success-50 text-success-700' : 'bg-gray-100 text-gray-700'">
        {{ enrolled ? 'Cadastrado' : 'Pendente' }}
      </span>
    </div>

    <div v-if="cameraOpen" class="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div class="overflow-hidden rounded-xl bg-gray-950">
        <video ref="video" autoplay muted playsinline class="face-camera aspect-video w-full object-cover" />
      </div>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-gray-600 dark:text-gray-300">Capture olhando de frente, depois vire levemente para cada lado.</p>
        <ol class="space-y-2 text-sm">
          <li v-for="(label, index) in prompts" :key="label" class="flex items-center gap-2">
            <span class="grid h-7 w-7 place-items-center rounded-full" :class="captures[index] ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-600'">{{ captures[index] ? '✓' : index + 1 }}</span>
            {{ label }}
          </li>
        </ol>
        <button v-if="captures.length < 3" class="btn-secondary min-h-12" type="button" @click="capture">
          Capturar imagem {{ captures.length + 1 }}
        </button>
        <button v-else class="btn-primary min-h-12" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Validando cadastro…' : 'Salvar identificação facial' }}
        </button>
        <button class="btn-secondary min-h-12" type="button" :disabled="saving" @click="closeCamera">Cancelar</button>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <button v-if="!cameraOpen" class="btn-primary min-h-12" type="button" :disabled="!userId" @click="openCamera">
        {{ enrolled ? 'Atualizar rosto' : 'Abrir câmera do tablet' }}
      </button>
      <button v-if="enrolled && !cameraOpen" class="btn-secondary min-h-12" type="button" :disabled="saving" @click="remove">
        Remover identificação facial
      </button>
    </div>
    
    <p class="mt-3 text-xs text-gray-500">
      As imagens são usadas para gerar o cadastro biométrico cifrado e descartadas após a análise. O Realmed não guarda as capturas.
    </p>
  </section>
</template>

<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { onBeforeUnmount, ref, watch } from 'vue'
import api from '@/plugins/axios'

const props = defineProps<{ userId: number; enrolled: boolean }>()
const emit = defineEmits<{ enrolled: [] ; removed: [] }>()
const video = ref<HTMLVideoElement | null>(null)
const cameraOpen = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref(false)
const captures = ref<string[]>([])
const prompts = ['De frente', 'Levemente à esquerda', 'Levemente à direita']
let stream: MediaStream | null = null

async function openCamera() {
  message.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
    cameraOpen.value = true
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    if (video.value) video.value.srcObject = stream
  } catch {
    error.value = true
    message.value = 'Não foi possível abrir a câmera. Autorize o acesso e tente novamente.'
  }
}

function capture() {
  const element = video.value
  if (!element || element.videoWidth < 320) return
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = Math.round(480 * element.videoHeight / element.videoWidth)
  const context = canvas.getContext('2d')
  if (!context) return
  context.translate(canvas.width, 0)
  context.scale(-1, 1)
  context.drawImage(element, 0, 0, canvas.width, canvas.height)
  captures.value.push(canvas.toDataURL('image/jpeg', 0.78))
  message.value = ''
}

async function save() {
  if (saving.value || captures.value.length !== 3) return
  saving.value = true
  error.value = false
  message.value = ''
  try {
    await api.post(`/usuarios/${props.userId}/face`, { images: captures.value })
    captures.value = []
    message.value = 'Identificação facial cadastrada.'
    closeCamera()
    emit('enrolled')
  } catch (cause) {
    error.value = true
    message.value = (cause as any).response?.data?.error || 'Não foi possível cadastrar o rosto.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('Remover o cadastro facial deste usuário? Ele não poderá entrar pelo modo fisioterapeuta até cadastrar o rosto novamente.')) return
  saving.value = true
  try {
    await api.delete(`/usuarios/${props.userId}/face`)
    message.value = 'Identificação facial removida.'
    error.value = false
    emit('removed')
  } catch (cause) {
    error.value = true
    message.value = (cause as any).response?.data?.error || 'Não foi possível remover a identificação facial.'
  } finally {
    saving.value = false
  }
}

function closeCamera() {
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
  if (video.value) video.value.srcObject = null
  cameraOpen.value = false
  captures.value = []
}

watch(() => props.userId, closeCamera)
onBeforeUnmount(closeCamera)

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(error) ? 'error' : 'success')
</script>

<style scoped>
.face-camera { transform: scaleX(-1); }
</style>
