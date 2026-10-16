<template>
  <PageShell title="Permissões" subtitle="Acessos por função, setor e perfil de estoque" list>
    <p v-if="message" role="status" :class="error ? 'text-error-700' : 'text-success-700'">
      {{ message }}
    </p>
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
      <div v-if="selectedId && !loading" class="space-y-5">
        <div class="grid gap-4 md:grid-cols-3">
          <label
            >Perfil no Realmed<select
              v-model="role"
              class="input"
              :disabled="selectedId === authUser?.id || role === 'masteradmin'"
            >
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
              <option v-if="role === 'masteradmin'" value="masteradmin">
                Administrador principal
              </option>
            </select></label
          >
          <label
            >Setor<select v-model="sectorId" class="input">
              <option :value="null">Sem setor</option>
              <option v-for="sector in sectors" :key="sector.id" :value="sector.id">
                {{ sector.name }}
              </option>
            </select></label
          >
          <label
            >Perfil no estoque<select v-model="profile" class="input">
              <option value="USER">Usuário — solicita para si</option>
              <option value="COORDINATOR">Coordenador — solicita para seu setor</option>
              <option value="MANAGER">Gestor — visualiza saldos de todos os setores</option>
            </select></label
          >
        </div>
        <p class="text-sm text-gray-500">
          Administradores acessam todas as funções. Para os demais, habilite as ações abaixo. Criar,
          editar e excluir também exigem visualizar.
        </p>
        <DataList
          :items="matrix"
          :columns="permissionColumns"
          row-key="moduleKey"
          :selectable="false"
          :all-rows="true"
          embedded
          ><template v-for="action in actions" :key="action.key" #[`cell-${action.key}`]="{ item }"
            ><input
              v-model="item[action.key]"
              type="checkbox"
              :aria-label="action.label + ' ' + item.label"
              :disabled="['admin', 'masteradmin'].includes(role)"
              @change="normalize(item, action.key)" /></template
        ></DataList>
        <button class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Salvando...' : 'Salvar permissões' }}
        </button>
      </div></ListDetailDialog
    >
  </PageShell>
</template>
<script setup lang="ts">
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
  saving = ref(false),
  message = ref(''),
  error = ref(false)
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
async function refresh() {
  const data = (await api.get('/permissoes/users')).data
  users.value = data.users
  sectors.value = data.sectors
}
async function selectUser() {
  message.value = ''
  if (!selectedId.value) return
  loading.value = true
  try {
    const user = users.value.find((u) => u.id === Number(selectedId.value))!
    role.value = user.role
    profile.value = user.profile || 'USER'
    sectorId.value = user.sector_id || null
    const data = (await api.get(`/permissoes/${selectedId.value}`)).data
    matrix.value = catalog.value.map((c) => ({
      moduleKey: c.key,
      label: c.label,
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      ...data.permissions.find((p: Permission) => p.moduleKey === c.key),
    }))
  } catch (e) {
    message.value = (e as any).response?.data?.error || 'Não foi possível carregar permissões.'
    error.value = true
  } finally {
    loading.value = false
  }
}
async function save() {
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
const permissionColumns = [
  { key: 'label', label: 'Função' },
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
  if (!selected.value) return
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
</script>
<style scoped>
label {
  display: block;
  min-width: 0;
  font-size: 0.875rem;
}
.input {
  display: block;
  width: 100%;
  min-width: 0;
  margin-top: 0.375rem;
}
</style>
