<template>
  <PageShell title="Permissões" subtitle="Acessos por função, setor e perfil de estoque" list>
    
    <DataList
      v-model:selected="selected"
      :items="filteredUsers"
      :columns="userColumns"
      :actions="toolbarActions"
      bounded
      selection-key="username"
      :row-height="64"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar usuário<input
              v-model="search"
              class="input"
              placeholder="Nome, login ou e-mail" /></label
          ><button class="btn-secondary" @click="search = ''">Limpar</button>
        </div></template
      >
      <template #cell-name="{ item }"
        ><b>{{ item.name || item.username }}</b
        ><small class="block text-gray-500">{{ item.email }}</small></template
      >
    </DataList>
    <ListDetailDialog
      :open="editorOpen"
      title="Editar permissões do usuário selecionado"
      wide
      @close="editorOpen = false"
      ><p v-if="loading">Carregando permissões...</p>
      
      <div v-if="selectedId && !loading && loaded" class="space-y-5">
        <p>
          <b>{{
            users.find((u) => u.id === selectedId)?.name ||
            users.find((u) => u.id === selectedId)?.username
          }}</b>
        </p>
        <div class="grid gap-4 md:grid-cols-3">
          <label
            ><FieldLabel required>Perfil de acesso no Realmed</FieldLabel
            ><select
              v-model="role"
              class="input"
              :disabled="selectedId === authUser?.id || role === 'masteradmin'"
            >
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
              <option v-if="!['user', 'admin', 'masteradmin'].includes(role)" :value="role">
                {{ legacyRoles[role] || role }}
              </option>
              <option v-if="role === 'masteradmin'" value="masteradmin">
                Administrador principal
              </option>
            </select></label
          >
          <label
            >Setor<select v-model="sectorId" aria-label="Setor" class="input" :disabled="saving">
              <option :value="null">Sem setor</option>
              <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
                {{ sector.name }}
              </option>
            </select></label
          >
          <label
            ><FieldLabel required>Perfil no estoque</FieldLabel
            ><select v-model="profile" aria-label="Perfil no estoque" class="input" :disabled="saving">
              <option value="USER">Usuário — solicita para si</option>
              <option value="COORDINATOR">Coordenador — solicita para seu setor</option>
              <option value="MANAGER">Gestor — visualiza saldos de todos os setores</option>
            </select></label
          >
        </div>
        <p class="text-sm text-gray-500">
          <template v-if="['admin', 'masteradmin'].includes(role)">
            O perfil {{ role === 'masteradmin' ? 'Administrador principal' : 'Administrador' }} tem acesso a
            todas as funções e ações. A matriz é aplicada aos usuários com perfil Usuário.
          </template>
          <template v-else>
            Marque as ações permitidas para este usuário. Criar, editar e excluir também exigem
            Visualizar.
          </template>
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label>Pesquisar funções<input v-model="functionSearch" class="input" placeholder="Ex.: estoque, produtos, tratamentos" /></label>
          <label>Módulo<select v-model="selectedModule" aria-label="Módulo" class="input"><option value="">Todos os módulos</option><option v-for="group in moduleNames" :key="group" :value="group">{{ group }}</option></select></label>
        </div>
        <p class="text-sm text-gray-500">Use os atalhos para aplicar permissões às funções exibidas em cada módulo. Sem excluir habilita visualizar, criar e editar.</p>
        <p v-if="sectorRequired && !sectorId" class="rounded-lg border border-warning-300 bg-warning-50 p-3 text-warning-900">Selecione um setor para permitir requisições e retiradas de estoque.</p>
        <section v-for="group in permissionGroups" :key="group.name" class="rounded-xl border p-3" :aria-label="'Permissões de ' + group.name">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h3>{{ group.name }}</h3><p class="text-sm text-gray-500">{{ matrixReadOnly ? group.items.length : group.items.filter(item => item.canView).length }} de {{ group.items.length }} funções com acesso</p></div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-secondary" :disabled="matrixReadOnly || saving" @click="applyGroup(group.items, 'all')">Habilitar tudo</button>
              <button type="button" class="btn-secondary" :disabled="matrixReadOnly || saving" @click="applyGroup(group.items, 'withoutDelete')">Sem excluir</button>
              <button type="button" class="btn-secondary" :disabled="matrixReadOnly || saving" @click="applyGroup(group.items, 'view')">Só visualizar</button>
              <button type="button" class="btn-secondary" :disabled="matrixReadOnly || saving" @click="applyGroup(group.items, 'none')">Limpar</button>
            </div>
          </div>
          <DataList :items="group.items" :columns="permissionColumns" row-key="moduleKey" :selectable="false" :all-rows="true" embedded>
            <template #cell-all="{item}"><input type="checkbox" :checked="matrixReadOnly || actions.every(action => item[action.key])" :indeterminate="!matrixReadOnly && actions.some(action => item[action.key]) && !actions.every(action => item[action.key])" :aria-label="'Todas as ações de ' + item.label" :disabled="matrixReadOnly || saving" @change="applyGroup([item], ($event.target as HTMLInputElement).checked ? 'all' : 'none')" /></template>
            <template v-for="action in actions" :key="action.key" #[`cell-${action.key}`]="{ item }">
              <input :checked="matrixReadOnly || item[action.key]" type="checkbox" :aria-label="action.label + ' ' + item.label" :disabled="matrixReadOnly || saving" @change="changePermission(item, action.key, $event)" />
            </template>
          </DataList>
        </section>
        <p v-if="!permissionGroups.length" class="text-gray-500">Nenhuma função encontrada.</p>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" :disabled="saving" @click="editorOpen = false">Cancelar</button>
        <button type="button" class="btn-primary" :disabled="saving || loading || !loaded" @click="save">{{ saving ? 'Salvando...' : 'Salvar permissões' }}</button>
      </template>
    </ListDetailDialog>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, ref, onMounted } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { useRoute } from 'vue-router'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
type Action = 'canView' | 'canCreate' | 'canEdit' | 'canDelete'
type Permission = {
  moduleKey: string
  label: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}
const { authUser, loadUser } = useAuthUser()
const users = ref<
  Array<{
    id: number
    name: string
    username: string
    email: string
    role: string
    sector_id: number | null
    profile: string | null
  }>
>([])
const sectors = ref<Array<{ id: number; name: string }>>([]),
  catalog = ref<Array<{ key: string; label: string }>>([])
const selectedId = ref<number | ''>(''),
  matrix = ref<Permission[]>([]),
  role = ref('user'),
  profile = ref('USER'),
  sectorId = ref<number | null>(null)
const loading = ref(false),
  loaded = ref(false),
  saving = ref(false),
  message = ref(''),
  error = ref(false)
const legacyRoles: Record<string, string> = {
  doctor: 'Médico',
  nurse: 'Enfermagem',
  pharmacist: 'Farmacêutico',
  patient: 'Paciente',
}
const actions: Array<{ key: Action; label: string }> = [
  { key: 'canView', label: 'Visualizar' },
  { key: 'canCreate', label: 'Criar' },
  { key: 'canEdit', label: 'Editar / operar' },
  { key: 'canDelete', label: 'Excluir / inativar' },
]
function normalize(item: Permission, key: Action) {
  if (key === 'canView' && !item.canView) {
    item.canCreate = false
    item.canEdit = false
    item.canDelete = false
  } else if (item[key]) item.canView = true
}
function changePermission(item: Permission, key: Action, event: Event) {
  item[key] = (event.target as HTMLInputElement).checked
  normalize(item, key)
}
async function refresh() {
  const data = (await api.get('/permissoes/users')).data
  users.value = data.users
  sectors.value = data.sectors
}
async function selectUser() {
  message.value = ''
  functionSearch.value = ''; selectedModule.value = ''
  loaded.value = false
  matrix.value = []
  if (!selectedId.value) return
  const requestedId = selectedId.value
  loading.value = true
  try {
    const user = users.value.find((u) => u.id === Number(selectedId.value))!
    role.value = user.role
    profile.value = user.profile || 'USER'
    sectorId.value = user.sector_id || null
    const data = (await api.get(`/permissoes/${selectedId.value}`)).data
    if (requestedId !== selectedId.value) return
    matrix.value = catalog.value.map((c) => ({
      moduleKey: c.key,
      label: c.label,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      ...data.permissions.find((p: Permission) => p.moduleKey === c.key),
    }))
    loaded.value = true
  } catch (e) {
    message.value = (e as any).response?.data?.error || 'Não foi possível carregar permissões.'
    error.value = true
  } finally {
    loading.value = false
  }
}
async function save() {
  if (sectorRequired.value && !sectorId.value) { error.value = true; message.value = 'Selecione um setor para permitir requisições e retiradas de estoque.'; return }
  if (saving.value || loading.value || !loaded.value || !selectedId.value) return
  saving.value = true
  message.value = ''
  try {
    await api.post(`/permissoes/${selectedId.value}`, {
      permissions: matrix.value,
      role: role.value,
      inventoryProfile: { sector_id: sectorId.value, profile: profile.value },
    })
    await refresh()
    await loadUser()
    error.value = false
    message.value = 'Permissões salvas.'
  } catch (e) {
    error.value = true
    message.value = (e as any).response?.data?.error || 'Não foi possível salvar.'
  } finally {
    saving.value = false
  }
}
const functionSearch = ref(''), selectedModule = ref('')
const matrixReadOnly = computed(() => ['admin','masteradmin'].includes(role.value))
const sectorRequired = computed(() => !matrixReadOnly.value && matrix.value.some(p => p.canCreate && ['inventory_consumptions','inventory_requests'].includes(p.moduleKey)))
const moduleName = (key: string) => key === 'events' ? 'Eventos' : key.startsWith('inventory_') ? 'Estoque' : key.startsWith('billing_') ? 'Faturamento' : ['guide_processes','guide_billing','authorizations'].includes(key) ? 'Tratamentos' : key === 'patients' ? 'Pacientes' : key === 'integrations' ? 'Integrações' : 'Cadastros'
const moduleNames = computed(() => [...new Set(matrix.value.map(p => moduleName(p.moduleKey)))].sort((a,b)=>a.localeCompare(b,'pt-BR')))
const permissionGroups = computed(() => moduleNames.value.filter(name => !selectedModule.value || selectedModule.value === name).map(name => ({name,items:matrix.value.filter(p => moduleName(p.moduleKey) === name && (p.label + ' ' + name).toLocaleLowerCase('pt-BR').includes(functionSearch.value.toLocaleLowerCase('pt-BR')))})).filter(group => group.items.length))
function applyGroup(items: Permission[], mode: 'all' | 'withoutDelete' | 'view' | 'none') {
  if (matrixReadOnly.value || saving.value) return
  for (const item of items) {
    item.canView = mode !== 'none'
    item.canCreate = item.canEdit = mode === 'all' || mode === 'withoutDelete'
    item.canDelete = mode === 'all'
  }
}
const permissionColumns = [
  { key: 'label', label: 'Função' },
  { key: 'all', label: 'Todas' },
  ...actions.map((a) => ({ key: a.key, label: a.label, width: '15%' })),
]
const route = useRoute(),
  selected = ref<any>(null),
  search = ref(''),
  editorOpen = ref(false)
const userColumns = [
  { key: 'name', label: 'Nome' },
  { key: 'username', label: 'Login' },
  {
    key: 'role',
    label: 'Perfil',
    format: (v: string) =>
      (
        ({
          admin: 'Administrador',
          masteradmin: 'Administrador principal',
          user: 'Usuário',
        }) as Record<string, string>
      )[v] || v,
  },
  {
    key: 'sector_id',
    label: 'Setor',
    format: (v: number) => sectors.value.find((s) => s.id === v)?.name || 'Sem setor',
  },
  {
    key: 'status',
    label: 'Status',
    format: (v: string) => (v === 'active' ? 'Ativo' : v === 'blocked' ? 'Bloqueado' : 'Inativo'),
  },
]
const filteredUsers = computed(() =>
  users.value.filter((u) =>
    [u.name, u.username, u.email].some((v) =>
      String(v || '')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ),
  ),
)
async function openEditor() {
  if (!selected.value || loading.value || saving.value) return
  selectedId.value = selected.value.id
  editorOpen.value = true
  await selectUser()
}
const toolbarActions = computed(() => [
  {
    icon: 'edit',
    label: 'Editar permissões do usuário selecionado',
    disabled: !selected.value,
    onClick: openEditor,
  },
  { icon: 'refresh', label: 'Atualizar', onClick: refresh },
])
onMounted(async () => {
  try {
    catalog.value = (await api.get('/permissoes/catalog')).data
    await refresh()
    if (route.query.userId) {
      selected.value = users.value.find((u) => u.id === Number(route.query.userId)) || null
      if (selected.value) await openEditor()
    }
  } catch (e) {
    error.value = true
    message.value = (e as any).response?.data?.error || 'Não foi possível carregar usuários.'
  }
})

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(error) ? 'error' : 'success')
</script>
<style scoped>
label {
  display: block;
  min-width: 0;
}
.input {
  display: block;
  width: 100%;
  min-width: 0;
  margin-top: 0.375rem;
}
</style>
