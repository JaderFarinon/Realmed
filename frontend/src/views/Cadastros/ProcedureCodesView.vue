<template>
  <PageShell
    title="Códigos e de/para"
    subtitle="Alternativas por convênio. Menor prioridade numérica tem preferência."
    list
  >
    
    <DataList
      v-model:selected="selected"
      :items="filtered"
      :columns="columns"
      :actions="actions"
      bounded
      selection-key="source_code"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar<input
              v-model="search"
              class="input"
              placeholder="Código de origem, destino ou descrição"
          /></label>
          <label
            >Convênio<select v-model="insurer" class="input">
              <option value="">Todos</option>
              <option value="general">Regra geral</option>
              <option v-for="item in insurers" :key="item.id" :value="String(item.id)">
                {{ item.name }}
              </option>
            </select></label
          >
          <label
            >Situação<select v-model="status" class="input">
              <option value="">Todas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select></label
          >
          <button class="btn-secondary" @click="clearFilters">Limpar</button>
        </div></template
      >
    </DataList>
    <ListDetailDialog
      :open="open"
      :title="editing ? 'Editar de/para' : 'Novo de/para'"
      wide
      @close="!saving && (open = false)"
    >
      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
        <p class="md:col-span-2 text-sm text-gray-600">
          Cadastre os procedimentos no convênio. Os cadastros gerais anteriores permanecem
          acessíveis em Convênios. O de/para define alternativas aprovadas pela clínica; não deduz
          equivalência clínica nem valores de remuneração.
        </p>
        <label
          >Convênio<select v-model="form.insurance_provider_id" class="input">
            <option value="">Todos — regra geral</option>
            <option v-for="item in insurers" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select></label
        >
        <label
          ><FieldLabel :required="true">Código de origem</FieldLabel
          ><input
            v-model="form.source_code"
            required
            maxlength="50"
            class="input"
            list="source-codes"
        /></label>
        <datalist id="source-codes">
          <option v-for="item in procedures" :key="item.id" :value="item.code">
            {{ item.description }}
          </option>
        </datalist>
        <label
          >Descrição de origem / expressão para leitura<input
            v-model="form.source_description"
            maxlength="255"
            class="input"
        /></label>
        <label
          >Tabela de origem (opcional)<input
            v-model="form.source_table"
            maxlength="80"
            class="input"
        /></label>
        <label
          ><FieldLabel :required="true">Procedimento / código de destino</FieldLabel
          ><select v-model="form.target_procedure_id" required class="input">
            <option value="">Selecionar</option>
            <option
              v-for="item in procedures.filter((p) => p.active)"
              :key="item.id"
              :value="item.id"
            >
              {{ item.code }} — {{ item.description }}
            </option>
          </select></label
        >
        <label
          ><FieldLabel :required="true">Prioridade (1 = preferida)</FieldLabel
          ><input
            v-model.number="form.priority"
            type="number"
            min="1"
            max="9999"
            required
            class="input"
        /></label>
        <label
          >Válido a partir de<input v-model="form.valid_from" type="date" class="input"
        /></label>
        <label>Válido até<input v-model="form.valid_until" type="date" class="input" /></label>
        <label class="md:col-span-2"
          >Observações<textarea v-model="form.notes" maxlength="5000" class="input" />
        </label>
        <label><input v-model="form.active" type="checkbox" /> Regra ativa</label>
        
        <div class="md:col-span-2 flex gap-3">
          <button class="btn" :disabled="saving">{{ saving ? 'Salvando…' : 'Salvar' }}</button
          ><button type="button" class="btn-secondary" :disabled="saving" @click="open = false">
            Cancelar
          </button>
        </div>
      </form>
    </ListDetailDialog>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onMounted, reactive, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
const { canOperational } = useAuthUser()
function clearFilters() {
  search.value = ''
  insurer.value = ''
  status.value = ''
}
const items = ref<any[]>([]),
  procedures = ref<any[]>([]),
  insurers = ref<any[]>([]),
  selected = ref<any>(null),
  search = ref(''),
  insurer = ref(''),
  status = ref(''),
  message = ref(''),
  formError = ref(''),
  open = ref(false),
  saving = ref(false),
  editing = ref<number | null>(null),
  form = reactive<any>({})
const columns = [
  { key: 'source_code', label: 'Origem' },
  { key: 'source_description', label: 'Descrição de origem' },
  { key: 'insurer_name', label: 'Convênio' },
  { key: 'target_code', label: 'Destino' },
  { key: 'target_description', label: 'Procedimento' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'validity', label: 'Vigência' },
  { key: 'situation', label: 'Situação' },
]
const filtered = computed(() =>
  items.value
    .map((item) => ({
      ...item,
      insurer_name:
        insurers.value.find((i) => i.id === item.insurance_provider_id)?.name || 'Regra geral',
      validity: `${item.valid_from?.slice(0, 10) || 'Sem início'} / ${item.valid_until?.slice(0, 10) || 'Sem fim'}`,
      situation: item.active ? 'Ativa' : 'Inativa',
    }))
    .filter(
      (item) =>
        (!search.value ||
          [item.source_code, item.source_description, item.target_code, item.target_description]
            .join(' ')
            .toLocaleLowerCase()
            .includes(search.value.toLocaleLowerCase())) &&
        (!insurer.value ||
          (insurer.value === 'general'
            ? !item.insurance_provider_id
            : String(item.insurance_provider_id) === insurer.value)) &&
        (!status.value || Boolean(item.active) === (status.value === 'active')),
    ),
)
const actions = computed(() => [
  {
    icon: 'add',
    label: 'Novo de/para',
    variant: 'primary' as const,
    disabled: !canOperational('procedures', 'canCreate'),
    onClick: () => edit(),
  },
  {
    icon: 'edit',
    label: 'Editar de/para selecionado',
    disabled: !selected.value || !canOperational('procedures', 'canEdit'),
    onClick: () => edit(selected.value),
  },
  { icon: 'refresh', label: 'Atualizar', onClick: load },
])
function edit(item?: any) {
  editing.value = item?.id || null
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(
    form,
    item
      ? {
          ...item,
          active: Boolean(item.active),
          insurance_provider_id: item.insurance_provider_id || '',
          valid_from: item.valid_from?.slice(0, 10) || '',
          valid_until: item.valid_until?.slice(0, 10) || '',
        }
      : {
          insurance_provider_id: '',
          source_code: '',
          source_description: '',
          source_table: '',
          target_procedure_id: '',
          priority: 1,
          valid_from: '',
          valid_until: '',
          active: true,
          notes: '',
        },
  )
  formError.value = ''
  open.value = true
}
async function load() {
  try {
    const [rules, lookup] = await Promise.all([
      api.get('/procedure-code-rules'),
      api.get('/procedure-code-rules/lookups'),
    ])
    items.value = rules.data
    procedures.value = lookup.data.procedures
    insurers.value = lookup.data.insurers
    message.value = ''
  } catch (e: any) {
    message.value = e.response?.data?.error || 'Não foi possível carregar os códigos.'
  }
}
async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) await api.put(`/procedure-code-rules/${editing.value}`, form)
    else await api.post('/procedure-code-rules', form)
    open.value = false
    await load()
  } catch (e: any) {
    formError.value = e.response?.data?.error || 'Não foi possível salvar.'
  } finally {
    saving.value = false
  }
}
onMounted(load)

useFeedback(() => unwrapNoticeValue(message), () => 'error')
useFeedback(() => unwrapNoticeValue(formError), () => 'error')
</script>
