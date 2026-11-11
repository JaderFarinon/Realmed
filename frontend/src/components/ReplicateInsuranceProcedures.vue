<template>
  <ListDetailDialog
    :open="open"
    :embedded="embedded"
    title="Replicar procedimentos entre convênios"
    wide
    @close="!busy && emit('close')"
  >
    <form class="grid gap-4" @submit.prevent="replicate">
      <p>
        Copiar procedimentos, descrições, situação e regras de substituição. Os procedimentos já
        cadastrados nos destinos serão preservados. Conflitos cancelam toda a operação.
      </p>
      <label
        ><FieldLabel :required="true">Convênio de origem</FieldLabel
        ><select v-model="source" class="input" required :disabled="busy">
          <option value="">Selecione o convênio</option>
          <option v-for="item in providers" :key="key(item)" :value="key(item)">
            {{ item.name }}
          </option>
        </select>
      </label>
      <fieldset :disabled="busy || loading" class="grid gap-3">
        <legend>
          <FieldLabel required reason="Selecione ao menos um procedimento para copiar."
            >Procedimentos para copiar ({{ selectedProcedures.length }} selecionados)</FieldLabel
          >
        </legend>
        <p v-if="loading" role="status">Carregando procedimentos…</p>
        <template v-else-if="procedures.length">
          <label class="replication-choice">
            <input
              type="checkbox"
              :checked="allProcedures"
              :indeterminate="selectedProcedures.length > 0 && !allProcedures"
              @change="toggleAllProcedures"
            />Selecionar todos os procedimentos
          </label>
          <div class="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
            <label v-for="item in procedures" :key="item.procedure_id" class="replication-choice">
              <input v-model="selectedProcedures" type="checkbox" :value="item.procedure_id" />
              <span
                >{{ item.code }} — {{ item.description }}{{ item.active ? '' : ' (Inativo)' }}</span
              >
            </label>
          </div>
        </template>
        <p v-else>
          {{
            source
              ? 'O convênio de origem não possui procedimentos cadastrados.'
              : 'Selecione o convênio de origem para listar os procedimentos.'
          }}
        </p>
      </fieldset>
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
      
      <div v-if="result" role="status" class="grid gap-2 rounded-lg border border-gray-200 p-3">
        <p>Replicação concluída.</p>
        <p v-for="item in result.results" :key="item.insurance_provider_id">
          {{ item.name }}: {{ item.copied }} copiados; {{ item.skipped }} já cadastrados e
          preservados.
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
            !selectedProcedures.length ||
            !destinations.length ||
            Boolean(result)
          "
        >
          {{ busy ? 'Replicando…' : 'Replicar procedimentos' }}
        </button>
      </div>
    </form>
  </ListDetailDialog>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, ref, watch } from 'vue'
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
const procedures = ref<any[]>([]),
  selectedProcedures = ref<number[]>([]),
  loading = ref(false),
  localSourceId = ref<number | null>(null)
let loadVersion = 0
watch(busy, (value) => emit('busy-change', value))
const allProcedures = computed(
  () => procedures.value.length > 0 && selectedProcedures.value.length === procedures.value.length,
)
function toggleAllProcedures() {
  selectedProcedures.value = allProcedures.value
    ? []
    : procedures.value.map((item) => item.procedure_id)
}
watch(selectedProcedures, () => {
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
    }
  },
)
watch([() => props.open, source], async ([open, value]) => {
  const version = ++loadVersion
  procedures.value = []
  selectedProcedures.value = []
  localSourceId.value = null
  loading.value = false
  if (!open || !value) return
  loading.value = true
  try {
    const original = props.providers.find((item) => key(item) === value)
    if (!original) throw new Error('Selecione o convênio de origem.')
    const local = await props.ensureLocal(original)
    if (version !== loadVersion) return
    const rows = (await api.get(`/insurance-providers/${local.id}/procedures`)).data
    if (version !== loadVersion) return
    procedures.value = rows
    localSourceId.value = local.id
  } catch (e: any) {
    if (version === loadVersion)
      error.value =
        e.response?.data?.error || e.message || 'Não foi possível carregar os procedimentos.'
  } finally {
    if (version === loadVersion) loading.value = false
  }
})
async function replicate() {
  busy.value = true
  error.value = ''
  result.value = null
  try {
    if (destinations.value.length > 100) throw new Error('Selecione até 100 convênios de destino.')
    if (loading.value || !localSourceId.value || !selectedProcedures.value.length)
      throw new Error('Selecione ao menos um procedimento para copiar.')
    const ids: number[] = []
    for (const value of destinations.value) {
      const item = props.providers.find((item) => key(item) === value)
      if (!item) throw new Error('Convênio não encontrado. Atualize a lista.')
      ids.push((await props.ensureLocal(item)).id)
    }
    result.value = (
      await api.post('/insurance-providers/replicate-procedures', {
        source_id: localSourceId.value,
        destination_ids: ids,
        procedure_ids: selectedProcedures.value,
      })
    ).data
    emit('replicated')
  } catch (e: any) {
    error.value =
      e.response?.data?.error || e.message || 'Não foi possível replicar os procedimentos.'
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
