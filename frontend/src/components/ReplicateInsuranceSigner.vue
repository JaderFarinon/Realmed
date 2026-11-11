<template>
  <ListDetailDialog
    :open="open"
    :embedded="embedded"
    title="Replicar assinatura do médico entre convênios"
    wide
    @close="!busy && emit('close')"
  >
    <form class="grid gap-4" @submit.prevent="replicate">
      <p>
        Copiar nome do médico, imagem PNG e posicionamento nas guias. Cada destino recebe uma versão
        independente; documentos já emitidos não são alterados.
      </p>
      <label
        ><FieldLabel :required="true">Convênio de origem</FieldLabel
        ><select
          aria-label="Convênio de origem"
          v-model="source"
          class="input"
          required
          :disabled="busy"
        >
          <option value="">Selecione o convênio</option>
          <option v-for="item in providers" :key="key(item)" :value="key(item)">
            {{ item.name }}
          </option>
        </select>
      </label>
      <p v-if="loading" role="status">Carregando assinatura…</p>
      <div v-else-if="signer" class="rounded-lg border p-3 grid gap-2">
        <p><b>Médico:</b> {{ signer.doctor_name }}</p>
        <img
          v-if="preview"
          :src="preview"
          alt="Assinatura a copiar"
          class="max-h-40 max-w-full object-contain"
        />
        <p>
          {{
            signer.placement
              ? 'O posicionamento e a aplicação nas guias SADT também serão copiados.'
              : 'A origem não possui aplicação automática configurada para a guia.'
          }}
        </p>
      </div>
      <p v-else-if="source">O convênio de origem não possui assinatura cadastrada.</p>
      <fieldset :disabled="busy" class="grid gap-3">
        <legend>
          <FieldLabel required reason="Selecione ao menos um convênio de destino."
            >Convênios de destino ({{ destinations.length }} selecionados)</FieldLabel
          >
        </legend>
        <label
          >Pesquisar destinos<input v-model="search" class="input" placeholder="Nome do convênio"
        /></label>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="btn-secondary" @click="selectVisible">
            Selecionar resultados
          </button>
          <button type="button" class="btn-secondary" @click="destinations = []">
            Limpar seleção
          </button>
        </div>
        <div class="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
          <label v-for="item in filtered" :key="key(item)" class="replication-choice">
            <input v-model="destinations" type="checkbox" :value="key(item)" />{{ item.name }}
          </label>
          <p v-if="!filtered.length">Nenhum convênio de destino encontrado.</p>
        </div>
      </fieldset>
      <label class="replication-choice"
        ><input v-model="overwrite" type="checkbox" :disabled="busy" />Substituir assinaturas já
        cadastradas nos destinos (preservar versões anteriores)</label
      >
      
      <div v-if="result" role="status" class="grid gap-2 rounded-lg border border-gray-200 p-3">
        <p>Replicação concluída.</p>
        <p v-for="item in result.results" :key="item.insurance_provider_id">
          {{ item.name }}:
          {{
            item.status === 'copied' ? 'Assinatura copiada.' : 'Assinatura existente preservada.'
          }}
        </p>
      </div>
      <div class="flex flex-wrap justify-end gap-3">
        <button v-if="!embedded" type="button" class="btn-secondary" :disabled="busy" @click="emit('close')">
          Fechar
        </button>
        <button
          class="btn"
          :disabled="
            busy ||
            loading ||
            !source ||
            !signer ||
            !preview ||
            !destinations.length ||
            Boolean(result)
          "
        >
          {{ busy ? 'Replicando…' : 'Replicar assinatura' }}
        </button>
      </div>
    </form>
  </ListDetailDialog>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import api from '@/plugins/axios'
import ListDetailDialog from './ListDetailDialog.vue'
const props = defineProps<{
  open: boolean
  embedded?: boolean
  providers: any[]
  initialSource: any
  ensureLocal: (item: any) => Promise<any>
}>()
const emit = defineEmits(['close', 'replicated', 'busy-change'])
const source = ref(''),
  destinations = ref<string[]>([]),
  search = ref(''),
  busy = ref(false),
  error = ref(''),
  result = ref<any>(null)
const signer = ref<any>(null),
  preview = ref(''),
  overwrite = ref(false),
  loading = ref(false),
  localSourceId = ref<number | null>(null)
let loadVersion = 0
watch(busy, (value) => emit('busy-change', value))
function clearPreview() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
}
onBeforeUnmount(() => {
  loadVersion++
  clearPreview()
})
watch(overwrite, () => {
  result.value = null
})
const key = (item: any) =>
  item.external_source === 'STENCI' && item.external_id
    ? `stenci:${item.external_id}`
    : String(item.id)
watch(
  () => props.initialSource,
  (item) => {
    if (props.open && item) source.value = key(item)
  },
)
const filtered = computed(() =>
  props.providers.filter(
    (item) =>
      key(item) !== source.value && item.name.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
function selectVisible() {
  destinations.value = [...new Set([...destinations.value, ...filtered.value.map(key)])]
}
watch(source, () => {
  destinations.value = destinations.value.filter((value) => value !== source.value)
  result.value = null
  error.value = ''
})
watch(destinations, () => {
  result.value = null
})
watch(
  () => props.open,
  (value) => {
    if (value) {
      source.value = props.initialSource ? key(props.initialSource) : ''
      destinations.value = []
      search.value = ''
      error.value = ''
      result.value = null
      overwrite.value = false
    }
  },
)
watch([() => props.open, source], async ([open, value]) => {
  const version = ++loadVersion
  clearPreview()
  signer.value = null
  localSourceId.value = null
  loading.value = false
  if (!open || !value) return
  loading.value = true
  try {
    const original = props.providers.find((item) => key(item) === value)
    if (!original) throw new Error('Selecione o convênio de origem.')
    const local = await props.ensureLocal(original)
    if (version !== loadVersion) return
    const data = (await api.get(`/insurance-providers/${local.id}/signer`)).data
    if (version !== loadVersion || !data) return
    const image = (
      await api.get(`/insurance-providers/${local.id}/signer/image`, { responseType: 'blob' })
    ).data
    if (version !== loadVersion) return
    signer.value = data
    preview.value = URL.createObjectURL(image)
    localSourceId.value = local.id
  } catch (e: any) {
    if (version === loadVersion)
      error.value =
        e.response?.data?.error || e.message || 'Não foi possível carregar a assinatura.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
})
async function replicate() {
  if (busy.value || result.value) return
  busy.value = true
  error.value = ''
  result.value = null
  try {
    if (destinations.value.length > 100) throw new Error('Selecione até 100 convênios de destino.')
    if (loading.value || !localSourceId.value || !signer.value || !preview.value)
      throw new Error('Selecione um convênio de origem com assinatura cadastrada.')
    const ids: number[] = []
    for (const value of destinations.value) {
      const item = props.providers.find((item) => key(item) === value)
      if (!item) throw new Error('Convênio não encontrado. Atualize a lista.')
      ids.push((await props.ensureLocal(item)).id)
    }
    result.value = (
      await api.post(
        '/insurance-providers/replicate-signer',
        {
          source_id: localSourceId.value,
          destination_ids: ids,
          source_signer_id: signer.value.id,
          overwrite_existing: overwrite.value,
        },
        { timeout: 120000 },
      )
    ).data
    emit('replicated')
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || 'Não foi possível copiar a assinatura.'
  } finally {
    busy.value = false
  }
}

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
<style scoped>
.list-detail-dialog label.replication-choice {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.75rem;
}
.replication-choice input {
  flex: 0 0 1rem;
  width: 1rem;
  height: 1rem;
}
</style>
