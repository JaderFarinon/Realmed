<template>
  <section class="patient-access" aria-label="App do paciente">
    <div><h3>App do paciente</h3><p>O paciente pode escanear este QR code para acompanhar seu tratamento no celular, sem login.</p><p class="text-xs text-gray-500">Este é o mesmo link aberto pela equipe. Ele permanece vinculado ao paciente nas próximas guias.</p>
      <div v-if="url" class="patient-access-actions"><a :href="url" target="_blank" rel="noopener noreferrer" class="btn-secondary">Abrir app do paciente ↗</a><button class="btn-secondary" type="button" @click="copy">Copiar link</button></div>
      <p v-if="loading" role="status">Preparando acesso do paciente…</p><button v-else-if="!url" class="btn-secondary" type="button" @click="load">{{ error ? 'Tentar novamente' : 'Mostrar QR code' }}</button>
    </div>
    <img v-if="qr" :src="qr" alt="QR code para abrir o app deste paciente" width="184" height="184" />
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import qrcode from 'qrcode-generator'
import { patientPortalUrl } from '@/utils/patientPortal'
import { notify } from '@/composables/useNotifications'
const props = defineProps<{ processId: number | string; active: boolean }>()
const url = ref(''), loading = ref(false), error = ref(false)
let version = 0
const qr = computed(() => {
  if (!url.value) return ''
  const value = qrcode(0, 'M'); value.addData(url.value, 'Byte'); value.make()
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(value.createSvgTag({ cellSize: 4, margin: 16, scalable: true }))
})
async function load() {
  if (loading.value || url.value) return
  const current = ++version; loading.value = true; error.value = false
  try { const result = await patientPortalUrl(props.processId); if (current === version) url.value = result }
  catch (e: any) { if (current === version) { error.value = true; notify(e.response?.data?.error || 'Não foi possível preparar o acesso do paciente.', 'error') } }
  finally { if (current === version) loading.value = false }
}
async function copy() { try { await navigator.clipboard.writeText(url.value); notify('Link do paciente copiado.', 'success') } catch { notify('Não foi possível copiar. Use Abrir app do paciente e copie o endereço.', 'warning') } }
watch(() => props.processId, () => { version++; url.value = ''; loading.value = false; error.value = false; if (props.active) void load() })
watch(() => props.active, active => { if (active) void load() }, { immediate: true })
onBeforeUnmount(() => { version++; url.value = '' })
</script>
<style scoped>
.patient-access{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px;margin-bottom:18px;border:1px solid #dfe3ee;border-radius:12px;background:#f8faff}.patient-access h3{font-weight:650;font-size:16px}.patient-access p{margin:8px 0;line-height:1.6;font-size:13px}.patient-access img{width:184px;height:184px;background:white;flex-shrink:0}.patient-access-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}@media(max-width:600px){.patient-access{flex-direction:column;align-items:stretch}.patient-access img{align-self:center}}
</style>
