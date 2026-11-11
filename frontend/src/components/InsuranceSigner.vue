<template>
  <ListDetailDialog
    :open="open"
    :embedded="embedded"
    title="Médico Assinante do Convênio"
    wide
    @close="close"
  >
    <form class="space-y-4" @submit.prevent="save">
      <p>{{ provider?.name }}</p>
      <p class="text-gray-500">
        Cadastre o médico e a imagem da assinatura para identificação e configuração das guias deste
        convênio.
      </p>
      
      
      <label class="block"
        ><FieldLabel :required="true">Nome do médico</FieldLabel
        ><input
          v-model="name"
          class="input w-full"
          maxlength="150"
          required
          :disabled="loading || busy || !canEdit"
      /></label>
      <label class="block"
        ><FieldLabel
          required
          reason="É necessária uma assinatura cadastrada ou um novo PNG para salvar."
          >Assinatura PNG</FieldLabel
        ><input
          type="file"
          class="input w-full"
          accept="image/png,.png"
          :disabled="loading || busy || !canEdit"
          @change="select"
      /></label>
      <p class="text-gray-500">PNG, até 5 MB. A imagem pode incluir assinatura e carimbo.</p>
      <img
        v-if="preview"
        :src="preview"
        alt="Prévia da assinatura do médico"
        class="max-h-48 max-w-full object-contain border rounded p-3"
      />
      <label v-if="preview" class="block"
        ><input v-model="applyPlacement" type="checkbox" :disabled="busy || loading || !canEdit" />
        Aplicar assinatura nas guias SADT padrão deste convênio</label
      >
      <SignaturePlacementEditor
        v-if="preview && applyPlacement"
        v-model="placement"
        :image="preview"
        :disabled="busy || loading || !canEdit"
      />
      <div class="flex justify-end gap-3">
        <button v-if="!embedded" type="button" class="btn-secondary" :disabled="busy" @click="close">Fechar</button
        ><button
          v-if="canEdit"
          class="btn-primary"
          :disabled="busy || loading || !image || !name.trim()"
        >
          {{ busy ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </form>
  </ListDetailDialog>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import api from '@/plugins/axios'
import SignaturePlacementEditor from '@/components/SignaturePlacementEditor.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { useAuthUser } from '@/composables/useAuthUser'
const props = defineProps<{ open: boolean; provider: any; embedded?: boolean }>()
const emit = defineEmits<{ close: []; saved: []; 'busy-change': [busy: boolean] }>()
const { canOperational } = useAuthUser()
const canEdit = computed(() => canOperational('insurance_providers', 'canEdit'))
const name = ref(''),
  image = ref<Blob | null>(null),
  preview = ref(''),
  error = ref(''),
  success = ref(''),
  busy = ref(false),
  loading = ref(false)
const defaultPlacement = () => ({
  templateKey: 'SADT_STANDARD_V1',
  page: 1,
  x: 620,
  y: 530,
  width: 140,
  height: 40,
})
const placement = ref(defaultPlacement()),
  applyPlacement = ref(false)
let version = 0
watch(busy, (value) => emit('busy-change', value))
function clear() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
  image.value = null
}
function setImage(file: Blob) {
  clear()
  image.value = file
  preview.value = URL.createObjectURL(file)
}
function close() {
  if (!busy.value) emit('close')
}
watch(
  () => [props.open, props.provider?.id],
  async () => {
    const current = ++version
    clear()
    name.value = ''
    placement.value = defaultPlacement()
    applyPlacement.value = false
    error.value = ''
    success.value = ''
    loading.value = false
    if (!props.open || !props.provider?.id) return
    loading.value = true
    try {
      const data = (await api.get(`/insurance-providers/${props.provider.id}/signer`)).data
      if (current !== version) return
      if (data) {
        name.value = data.doctor_name
        if (data.placement) {
          placement.value = data.placement
          applyPlacement.value = true
        }
        const file = (
          await api.get(`/insurance-providers/${props.provider.id}/signer/image`, {
            responseType: 'blob',
          })
        ).data
        if (current === version) setImage(file)
      }
    } catch (e: any) {
      if (current === version)
        error.value = e.response?.data?.error || 'Não foi possível carregar o médico assinante.'
    } finally {
      if (current === version) loading.value = false
    }
  },
  { immediate: true },
)
function select(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0]
  if (!file) return
  error.value = ''
  success.value = ''
  if (file.type !== 'image/png' || !file.name.toLowerCase().endsWith('.png'))
    error.value = 'Selecione uma imagem PNG.'
  else if (file.size > 5 * 1024 * 1024) error.value = 'A imagem deve ter no máximo 5 MB.'
  else setImage(file)
  input.value = ''
}
async function save() {
  if (!image.value || busy.value || loading.value || !canEdit.value) return
  busy.value = true
  error.value = ''
  try {
    await api.post(`/insurance-providers/${props.provider.id}/signer`, image.value, {
      headers: {
        'Content-Type': 'image/png',
        'X-File-Name': encodeURIComponent('assinatura.png'),
        'X-Doctor-Name': encodeURIComponent(name.value.trim()),
        'X-Signature-Placement': encodeURIComponent(
          JSON.stringify(applyPlacement.value ? placement.value : null),
        ),
      },
    })
    success.value = 'Assinatura do médico salva.'
    emit('saved')
    if (!props.embedded) emit('close')
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Não foi possível salvar o médico assinante.'
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(() => {
  version++
  clear()
})

useFeedback(() => unwrapNoticeValue(error), () => 'error')
useFeedback(() => unwrapNoticeValue(success), () => 'success')
</script>
