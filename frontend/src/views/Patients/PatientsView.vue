<template>
  <PageShell title="Pacientes" subtitle="Dados administrativos e convênios" list>
    <p v-if="message" class="text-error-700" role="alert">{{ message }}</p>
    <DataList
      v-model:selected="selected"
      :items="filtered"
      :columns="columns"
      :actions="actions"
      :loading="loading"
      bounded
      selection-key="full_name"
      :row-height="64"
    >
      <template #filters
        ><form @submit.prevent="load">
          <label class="filter-search"
            >Pesquisar paciente<input
              v-model="search"
              class="input"
              placeholder="Nome, CPF, telefone ou e-mail" /></label
          ><button class="btn-primary" type="submit">Buscar</button
          ><button
            class="btn-secondary"
            type="button"
            @click="clearListFilters"
          >
            Limpar
          </button>
        </form></template
      >
    </DataList>
    <ListDetailDialog
      :open="showForm"
      :title="form.id ? 'Editar paciente' : 'Novo paciente'"
      @close="showForm = false"
    >
      <form id="patient-form" class="grid gap-4 md:grid-cols-2" @submit.prevent="save">
        <label class="md:col-span-2"
          >Nome completo<input v-model="form.full_name" class="input" required /></label
        ><label>CPF<input v-model="form.cpf" class="input" /></label
        ><label>Nascimento<input v-model="form.birth_date" class="input" type="date" /></label
        ><label>Telefone<input v-model="form.phone" class="input" /></label
        ><label>E-mail<input v-model="form.email" class="input" type="email" /></label>
      </form>
      <template #footer
        ><button class="btn-secondary" @click="showForm = false">Cancelar</button
        ><button class="btn-primary" form="patient-form" :disabled="saving">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button></template
      >
    </ListDetailDialog>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { useAuthUser } from '@/composables/useAuthUser'
const router = useRouter(),
  { canOperational } = useAuthUser()
const patients = ref<any[]>([]),
  selected = ref<any>(null),
  search = ref(''),
  showForm = ref(false),
  loading = ref(false),
  saving = ref(false),
  message = ref(''),
  form = reactive<any>({})
const columns = [
  { key: 'full_name', label: 'Nome completo' },
  { key: 'cpf', label: 'CPF' },
  {
    key: 'birth_date',
    label: 'Nascimento',
    format: (v: any) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—'),
  },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
]
const filtered = computed(() =>
  patients.value.filter((p) =>
    [p.full_name, p.cpf, p.phone, p.email].some((v) =>
      String(v || '')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ),
  ),
)
const actions = computed(() => [
  {
    id: 'add',
    icon: 'add',
    label: 'Novo paciente',
    variant: 'primary' as const,
    disabled: !canOperational('patients', 'canCreate'),
    onClick: () => edit(),
  },
  {
    id: 'open',
    icon: 'open',
    label: 'Abrir paciente selecionado',
    disabled: !selected.value,
    onClick: () => router.push('/pacientes/' + selected.value.id),
  },
  {
    id: 'edit',
    icon: 'edit',
    label: 'Editar paciente selecionado',
    disabled: !selected.value || !canOperational('patients', 'canEdit'),
    onClick: () => edit(selected.value),
  },
  { id: 'refresh', icon: 'refresh', label: 'Atualizar', onClick: load },
])
function edit(patient?: any) {
  Object.keys(form).forEach((k) => delete form[k])
  Object.assign(
    form,
    { full_name: '', cpf: '', birth_date: '', phone: '', email: '' },
    patient || {},
  )
  form.birth_date = String(form.birth_date || '').slice(0, 10)
  message.value = ''
  showForm.value = true
}
async function load() {
  loading.value = true
  try {
    patients.value = (await api.get('/patients')).data
  } catch (e) {
    message.value = (e as any).response?.data?.error || 'Não foi possível carregar pacientes.'
  } finally {
    loading.value = false
  }
}
async function save() {
  saving.value = true
  try {
    await api[form.id ? 'put' : 'post'](form.id ? '/patients/' + form.id : '/patients', {
      ...form,
      birth_date: form.birth_date || null,
    })
    showForm.value = false
    await load()
  } catch (e) {
    message.value = (e as any).response?.data?.error || 'Não foi possível salvar paciente.'
  } finally {
    saving.value = false
  }
}
onMounted(load)
function clearListFilters(){search.value='';load()}
</script>
