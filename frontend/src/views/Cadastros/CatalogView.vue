<template>
  <PageShell
    :title="config.title"
    :subtitle="
      isInsurance
        ? 'Convênios do Stenci, procedimentos e códigos substitutos para geração das guias'
        : 'Cadastros auxiliares da Central de Guias'
    "
    list
  >
    
    <DataList
      v-model:selected="selected"
      :items="filteredItems"
      :columns="columns"
      :actions="toolbarActions"
      bounded
      :selection-key="config.fields[0].key"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar<input
              v-model="search"
              class="input"
              placeholder="Nome, código ou registro" /></label
          ><label
            >Situação<select v-model="activeFilter" class="input">
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select></label
          ><button class="btn-secondary" @click="clearListFilters">Limpar</button>
        </div></template
      >
      <template #cell-name="{ item, value }"
        ><div class="flex items-center gap-2">
          <img
            v-if="logoUrls[item.id]"
            :src="logoUrls[item.id]"
            class="logo-thumb"
            alt="Logo do convênio"
          /><span>{{ value }}</span>
        </div></template
      >
    </DataList>
    <ListDetailDialog
      :open="formOpen"
      :title="formDialogTitle"
      wide
      @close="closeForm"
    >
      <nav v-if="isInsurance && editing" class="treatment-tabs mb-4" role="tablist" aria-label="Seções do convênio">
        <button
          v-for="tab in editTabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="treatment-tab"
          :class="{ 'is-active': editTab === tab.id }"
          :aria-selected="editTab === tab.id"
          :disabled="tab.disabled"
          @click="editTab = tab.id"
        >{{ tab.label }}</button>
      </nav>
      <form v-if="!isInsurance || !editing || editTab === 'data'" class="grid gap-4 md:grid-cols-3" @submit.prevent="saveAndClose">
        <label v-for="field in config.fields" :key="field.key"
          ><FieldLabel :required="field.required">{{ field.label }}</FieldLabel
          ><select
            v-if="field.options"
            v-model="form[field.key]"
            class="input"
            :required="field.required"
          >
            <option value="">{{ field.label }}</option>
            <option
              v-for="fieldOption in field.options"
              :key="fieldOption.value"
              :value="fieldOption.value"
            >
              {{ fieldOption.label }}
            </option>
          </select>
          <input
            v-else
            v-model="form[field.key]"
            class="input"
            :placeholder="field.label"
            :required="field.required"
          />
        </label>

        <section
          v-if="isInsurance"
          class="logo-editor md:col-span-3"
          aria-labelledby="insurance-logo-title"
        >
          <div class="logo-preview">
            <img v-if="previewUrl" :src="previewUrl" alt="Prévia da logo do convênio" />
            <span v-else>Sem logo cadastrada</span>
          </div>
          <div class="min-w-0">
            <h2 id="insurance-logo-title" class="font-semibold text-gray-800">Logo do convênio</h2>
            <p class="mt-1 text-sm text-gray-500">
              Utilizada na identificação do convênio e na geração de documentos quando aplicável.
            </p>
            <label v-if="canEditLogo" class="btn-secondary mt-3 inline-block cursor-pointer">
              {{ previewUrl ? 'Substituir imagem' : 'Selecionar imagem' }}
              <input
                class="hidden"
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                @change="selectLogo"
              />
            </label>
            <p class="mt-2 text-xs text-gray-500">PNG, JPG ou JPEG, até 5 MB.</p>
          </div>
        </section>

        
        <button class="btn" :disabled="saving">
          {{ saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar' }}
        </button>
        <button v-if="editing" type="button" class="input" @click="closeForm">Cancelar</button>
      </form>
      <section v-if="isInsurance && editing" v-show="editTab === 'signer'">
        <InsuranceSigner
          :open="formOpen"
          :embedded="true"
          :provider="editingProvider"
          @saved="message = ''"
          @busy-change="signerSaving = $event"
        />
      </section>
      <section v-if="isInsurance && editing" v-show="editTab === 'procedures'">
        <InsuranceProcedures
          v-if="canEditProcedures"
          :open="formOpen"
          :embedded="true"
          :provider="editingProvider"
          @busy-change="proceduresSaving = $event"
        />
        <p v-else class="text-sm text-gray-600">Seu usuário não tem acesso aos procedimentos deste convênio.</p>
      </section>
    </ListDetailDialog>
    <ListDetailDialog
      :open="replicationOpen"
      title="Replicar entre convênios"
      wide
      @close="closeReplication"
    >
      <nav class="treatment-tabs mb-4" role="tablist" aria-label="Tipo de replicação">
        <button
          v-for="tab in replicationTabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="treatment-tab"
          :class="{ 'is-active': replicationTab === tab.id }"
          :aria-selected="replicationTab === tab.id"
          :disabled="tab.disabled"
          @click="replicationTab = tab.id"
        >{{ tab.label }}</button>
      </nav>
      <section v-show="replicationTab === 'procedures'">
        <ReplicateInsuranceProcedures
          v-if="canReplicateProcedures"
          :open="replicationOpen"
          :embedded="true"
          :providers="items"
          :initial-source="replicationTab === 'procedures' ? selected : null"
          :ensure-local="ensureLocal"
          @busy-change="proceduresReplicating = $event"
        />
        <p v-else class="text-sm text-gray-600">Seu usuário não tem permissão para replicar procedimentos.</p>
      </section>
      <section v-show="replicationTab === 'signer'">
        <ReplicateInsuranceSigner
          v-if="canReplicateSigner"
          :open="replicationOpen"
          :embedded="true"
          :providers="items"
          :initial-source="replicationTab === 'signer' ? selected : null"
          :ensure-local="ensureLocal"
          @busy-change="signerReplicating = $event"
        />
        <p v-else class="text-sm text-gray-600">Seu usuário não tem permissão para replicar assinaturas.</p>
      </section>
    </ListDetailDialog>
    <div v-if="isInsurance" class="flex flex-wrap gap-4 text-sm">
      <RouterLink to="/cadastros/convenios/regras" class="link"
        >Regras avançadas e gerais</RouterLink
      ><RouterLink to="/cadastros/convenios/procedimentos-gerais" class="link"
        >Procedimentos gerais anteriores</RouterLink
      >
    </div>
    <input
      ref="assetInput"
      type="file"
      class="hidden"
      :accept="config.asset?.accept || 'image/png,image/jpeg'"
      @change="selected && uploadAsset($event, selected.id)"
    />
  </PageShell>
</template>

<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
/* eslint-disable @typescript-eslint/no-explicit-any */
import ReplicateInsuranceSigner from '@/components/ReplicateInsuranceSigner.vue'
import InsuranceSigner from '@/components/InsuranceSigner.vue'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/plugins/axios'
import InsuranceProcedures from '@/components/InsuranceProcedures.vue'
import ReplicateInsuranceProcedures from '@/components/ReplicateInsuranceProcedures.vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { useAuthUser } from '@/composables/useAuthUser'
import {
  authorizationTypeLabels,
  professionalTypeLabels,
  procedureTypeLabels,
} from '@/utils/guideLabels'

type Item = Record<string, any>
const route = useRoute(),
  { canOperational } = useAuthUser()
const replicationOpen = ref(false)
const editTab = ref('data'),
  replicationTab = ref('procedures'),
  signerSaving = ref(false),
  proceduresSaving = ref(false),
  signerReplicating = ref(false),
  proceduresReplicating = ref(false)
const items = ref<Item[]>([]),
  editing = ref<number | null>(null),
  form = reactive<Item>({})
const selectedLogo = ref<File | null>(null),
  previewUrl = ref(''),
  currentLogoUrl = ref(''),
  saving = ref(false),
  message = ref('')
const logoUrls = reactive<Record<number, string>>({})
const option = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }))
const enumLabels = { ...authorizationTypeLabels, ...professionalTypeLabels, ...procedureTypeLabels }
const configs: Record<string, any> = {
  insurance: {
    title: 'Convênios',
    endpoint: 'insurance-providers',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'internal_code', label: 'Código interno' },
      { key: 'ans_registration', label: 'Registro ANS' },
      {
        key: 'authorization_type',
        label: 'Tipo de liberação',
        required: true,
        options: option(authorizationTypeLabels),
      },
    ],
    asset: { path: 'insurance-providers', name: 'logo' },
  },
  professionals: {
    title: 'Profissionais',
    endpoint: 'professionals',
    fields: [
      { key: 'full_name', label: 'Nome completo', required: true },
      {
        key: 'type',
        label: 'Tipo de profissional',
        required: true,
        options: option(professionalTypeLabels),
      },
      { key: 'council', label: 'Conselho', required: true },
      { key: 'council_number', label: 'Número', required: true },
      { key: 'state', label: 'UF', required: true },
      { key: 'cbo', label: 'CBO' },
    ],
    asset: { path: 'professionals', name: 'signature', label: 'Enviar assinatura', accept: '.png' },
  },
  procedures: {
    title: 'Procedimentos',
    endpoint: 'procedures',
    fields: [
      { key: 'code', label: 'Código', required: true },
      { key: 'description', label: 'Descrição', required: true },
      { key: 'table_name', label: 'Tabela' },
      { key: 'type', label: 'Tipo', required: true, options: option(procedureTypeLabels) },
    ],
  },
}
const config = computed(() => configs[String(route.meta.catalog)])
const isInsurance = computed(() => String(route.meta.catalog) === 'insurance')
const canEditLogo = computed(() =>
  canOperational(config.value.endpoint.replaceAll('-', '_'), 'canEdit'),
)
const enumLabel = (value: string) => enumLabels[value as keyof typeof enumLabels] || value

function revoke(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}
function clearPreview() {
  revoke(previewUrl.value)
  if (previewUrl.value !== currentLogoUrl.value) revoke(currentLogoUrl.value)
  previewUrl.value = ''
  currentLogoUrl.value = ''
  selectedLogo.value = null
}
async function fetchLogo(id: number) {
  const response = await api.get(`/insurance-providers/${id}/logo`, { responseType: 'blob' })
  return URL.createObjectURL(response.data)
}
async function load() {
  message.value = ''
  Object.values(logoUrls).forEach(revoke)
  Object.keys(logoUrls).forEach((key) => delete logoUrls[Number(key)])
  items.value = (await api.get(`/${config.value.endpoint}`)).data
  if (isInsurance.value) {
    try {
      const source = (await api.get('/integrations/stenci/insurances')).data.items || []
      const locals = items.value
      const ids = new Set(source.map((item: any) => String(item.externalId)))
      items.value = [
        ...source.map((item: any) => {
          const local = locals.find(
            (row) =>
              row.external_source === 'STENCI' &&
              String(row.external_id) === String(item.externalId),
          )
          return {
            ...local,
            id: local?.id || `stenci:${item.externalId}`,
            external_id: item.externalId,
            external_source: 'STENCI',
            name: item.name,
            active: local?.active ?? true,
            authorization_type: local?.authorization_type || 'PRE_AUTHORIZATION',
          }
        }),
        ...locals.filter(
          (row) => row.external_source !== 'STENCI' || !ids.has(String(row.external_id)),
        ),
      ]
    } catch (e: any) {
      message.value =
        e.response?.data?.error ||
        'Não foi possível atualizar o Stenci. Exibindo os convênios já configurados.'
    }
  }
  if (isInsurance.value)
    await Promise.all(
      items.value
        .filter((item) => Boolean(item.has_logo))
        .map(async (item) => {
          logoUrls[item.id] = await fetchLogo(item.id)
        }),
    )
}
function reset() {
  editing.value = null
  Object.keys(form).forEach((key) => delete form[key])
  form.active = true
  message.value = ''
  clearPreview()
}
async function save() {
  saving.value = true
  message.value = ''
  try {
    let id = editing.value
    if (id) {
      const data = { ...form }
      delete data.active
      await api.put(`/${config.value.endpoint}/${id}`, data)
    }
    else id = (await api.post(`/${config.value.endpoint}`, form)).data.id
    if (selectedLogo.value && id) await sendAsset(selectedLogo.value, id)
    reset()
    await load()
  } catch (error: any) {
    message.value = error.response?.data?.error || 'Não foi possível salvar o cadastro.'
  } finally {
    saving.value = false
  }
}
async function edit(item: Item) {
  item = await ensureLocal(item)
  reset()
  editing.value = item.id
  editTab.value = 'data'
  Object.assign(form, item)
  if (isInsurance.value && item.has_logo) {
    currentLogoUrl.value = await fetchLogo(item.id)
    previewUrl.value = currentLogoUrl.value
  }
  formOpen.value = true
}
async function ensureLocal(item: Item) {
  if (isInsurance.value && String(item.id).startsWith('stenci:')) {
    const local = (
      await api.post('/insurance-providers/from-stenci', { external_id: item.external_id })
    ).data
    items.value = items.value.map((row) =>
      row.id === item.id ? { ...local, has_logo: item.has_logo } : row,
    )
    selected.value = items.value.find((row) => row.id === local.id) || local
    return selected.value!
  }
  return item
}
async function toggle(item: Item) {
  item = await ensureLocal(item)
  await api.patch(`/${config.value.endpoint}/${item.id}/active`, { active: !item.active })
  await load()
}
function selectLogo(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0]
  if (!file) return
  message.value = ''
  if (!['image/png', 'image/jpeg'].includes(file.type) || !/^.+\.(png|jpe?g)$/i.test(file.name)) {
    message.value = 'Selecione uma imagem PNG, JPG ou JPEG.'
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    message.value = 'A imagem deve ter no máximo 5 MB.'
    input.value = ''
    return
  }
  if (previewUrl.value !== currentLogoUrl.value) revoke(previewUrl.value)
  selectedLogo.value = file
  previewUrl.value = URL.createObjectURL(file)
  input.value = ''
}
async function sendAsset(file: File, id: number) {
  await api.post(`/${config.value.asset.path}/${id}/${config.value.asset.name}`, file, {
    headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
  })
}
async function uploadAsset(event: Event, id: number) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0]
  if (file) await sendAsset(file, id)
  input.value = ''
}
async function viewAsset(id: number) {
  const response = await api.get(`/${config.value.asset.path}/${id}/${config.value.asset.name}`, {
    responseType: 'blob',
  })
  window.open(URL.createObjectURL(response.data), '_blank')
}
watch(
  () => route.path,
  async () => {
    reset()
    await load()
  },
)
const selected = ref<Item | null>(null),
  search = ref(''),
  activeFilter = ref(''),
  formOpen = ref(false),
  assetInput = ref<HTMLInputElement | null>(null)
const columns = computed(() => [
  ...config.value.fields.map((f: any) => ({
    key: f.key,
    label: f.label,
    format: (v: any) => enumLabel(v),
  })),
  { key: 'active', label: 'Status', format: (v: any) => (v ? 'Ativo' : 'Inativo') },
])
const filteredItems = computed(() =>
  items.value.filter(
    (item) =>
      (!activeFilter.value || Boolean(item.active) === (activeFilter.value === 'active')) &&
      config.value.fields.some((f: any) =>
        String(item[f.key] || '')
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      ),
  ),
)
const moduleKey = computed(() => config.value.endpoint.replaceAll('-', '_'))
const editingProvider = computed(
  () => items.value.find((item) => Number(item.id) === Number(editing.value)) || null,
)
const canEditProcedures = computed(() => canOperational('procedures', 'canView'))
const canReplicateProcedures = computed(
  () => canOperational('procedures', 'canView') && canOperational('procedures', 'canCreate'),
)
const canReplicateSigner = computed(() => canOperational('insurance_providers', 'canEdit'))
const formBusy = computed(() => saving.value || signerSaving.value || proceduresSaving.value)
const replicationBusy = computed(() => signerReplicating.value || proceduresReplicating.value)
async function openReplication() {
  replicationTab.value = canReplicateProcedures.value ? 'procedures' : 'signer'
  replicationOpen.value = true
}
const formDialogTitle = computed(() =>
  isInsurance.value
    ? editing.value
      ? 'Editar convênio'
      : 'Novo convênio'
    : editing.value
      ? 'Editar ' + config.value.title.toLowerCase()
      : 'Novo cadastro',
)
const editTabs = computed(() => [
  { id: 'data', label: 'Dados do convênio', disabled: false },
  { id: 'signer', label: 'Médico assinante', disabled: false },
  { id: 'procedures', label: 'Procedimentos', disabled: !canEditProcedures.value },
])
const replicationTabs = computed(() => [
  { id: 'procedures', label: 'Procedimentos', disabled: !canReplicateProcedures.value },
  { id: 'signer', label: 'Assinatura médica', disabled: !canReplicateSigner.value },
])
const toolbarActions = computed(() => {
  const actions: any[] = [
    {
      icon: 'add',
      label: isInsurance.value ? 'Adicionar convênio' : 'Adicionar',
      variant: 'primary' as const,
      disabled: !canOperational(moduleKey.value, 'canCreate'),
      onClick: () => {
        reset()
        editTab.value = 'data'
        formOpen.value = true
      },
    },
  ]
  if (isInsurance.value) {
    actions.push({
      icon: 'edit',
      label: 'Editar convênio selecionado',
        disabled: !selected.value || !canOperational(moduleKey.value, 'canEdit'),
      onClick: async () => {
        if (!selected.value) return
        try {
          await edit(selected.value)
        } catch (error: any) {
          message.value = error.response?.data?.error || 'Não foi possível abrir o convênio.'
        }
      },
    })
    actions.push({
      icon: 'copy',
      label: 'Replicar entre convênios',
      disabled: !canReplicateProcedures.value && !canReplicateSigner.value,
      onClick: openReplication,
    })
  } else {
    actions.push({
      icon: 'edit',
      label: 'Editar selecionado',
        disabled: !selected.value || !canOperational(moduleKey.value, 'canEdit'),
      onClick: async () => {
        if (selected.value) await edit(selected.value)
      },
    })
  }
  actions.push(
    {
      icon: 'toggle',
      label: selected.value?.active ? 'Inativar selecionado' : 'Ativar selecionado',
      disabled: !selected.value || !canOperational(moduleKey.value, 'canDelete'),
      onClick: () => selected.value && toggle(selected.value),
    },
  )
  if (config.value.asset && !isInsurance.value) {
    actions.push(
      {
        icon: 'upload',
        label: config.value.asset.label || 'Enviar imagem',
        disabled: !selected.value || !canOperational(moduleKey.value, 'canEdit'),
        onClick: () => assetInput.value?.click(),
      },
      {
        icon: 'photo',
        label: 'Visualizar imagem',
        disabled: !selected.value,
        onClick: () => selected.value && viewAsset(selected.value.id),
      },
    )
  }
  actions.push({ icon: 'refresh', label: 'Atualizar', onClick: load })
  return actions
})
function closeReplication() {
  if (!replicationBusy.value) replicationOpen.value = false
}
function closeForm() {
  if (formBusy.value) return
  formOpen.value = false
  reset()
}
async function saveAndClose() {
  await save()
  if (!message.value) formOpen.value = false
}
onMounted(async () => {
  reset()
  try {
    await load()
  } catch (error: any) {
    message.value = error.response?.data?.error || 'Não foi possível carregar o cadastro.'
  }
})
onBeforeUnmount(() => {
  clearPreview()
  Object.values(logoUrls).forEach(revoke)
})
function clearListFilters() {
  search.value = ''
  activeFilter.value = ''
}

useFeedback(() => unwrapNoticeValue(message), () => 'error')
</script>

<style scoped>
.logo-editor {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f9fafb;
}
.logo-preview {
  display: flex;
  width: 8rem;
  height: 6rem;
  flex: 0 0 8rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px dashed #d1d5db;
  border-radius: 0.5rem;
  background: white;
  color: #6b7280;

  text-align: center;
  padding: 0.5rem;
}
.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.logo-thumb {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  border-radius: 0.25rem;
  border: 1px solid #e5e7eb;
}
.logo-empty {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
}
@media (max-width: 640px) {
  .logo-editor {
    align-items: flex-start;
    flex-direction: column;
  }
  .logo-preview {
    width: 100%;
    height: 7rem;
    flex-basis: auto;
  }
}
</style>
