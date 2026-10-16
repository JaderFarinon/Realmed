<template>
  <PageShell title="Usuários" subtitle="Gerencie os acessos administrativos" list>
    <p v-if="message" class="text-error-700" role="alert">{{ message }}</p>
    <DataList
      v-model:selected="selected"
      :items="filteredUsers"
      :columns="columns"
      :actions="toolbarActions"
      :loading="loading"
      bounded
      selection-key="nome"
      :row-height="64"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar<input
              v-model="search"
              class="input"
              placeholder="Nome, login ou e-mail" /></label
          ><label
            >Status<select v-model="statusFilter" class="input">
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="blocked">Bloqueados</option>
            </select></label
          ><button class="btn-secondary" @click="clearListFilters">Limpar</button>
        </div></template
      >
      <template #cell-nome="{ item }"
        ><b>{{ item.nome }}</b
        ><small class="block text-gray-500">{{ item.email }}</small></template
      >
    </DataList>
    <ListDetailDialog
      :open="show"
      :title="form.id ? 'Editar usuário' : 'Novo usuário'"
      @close="show = false"
    >
      <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="save">
        <p v-if="message" class="text-error-700 sm:col-span-2" role="alert">{{ message }}</p>
        <label v-for="field in fields" :key="field.key" class="text-sm dark:text-gray-200"
          >{{ field.label
          }}<input
            v-model="form[field.key]"
            :type="field.type || 'text'"
            :required="field.required"
            class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" /></label
        ><label class="text-sm dark:text-gray-200"
          >Perfil<select
            v-model="form.role"
            class="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-gray-950"
          >
            <option v-for="role in roles" :key="role">{{ role }}</option>
          </select></label
        ><label class="text-sm dark:text-gray-200"
          >Status<select
            v-model="form.status"
            class="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-gray-950"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="blocked">Bloqueado</option>
          </select></label
        >
        <div class="flex justify-end gap-3 sm:col-span-2">
          <button type="button" class="rounded-lg border px-4 py-2" @click="show = false">
            Cancelar</button
          ><button class="rounded-lg bg-brand-500 px-4 py-2 text-white">Salvar</button>
        </div>
      </form></ListDetailDialog
    >
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import { useRouter } from 'vue-router'
import {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  removerUsuario,
  type Usuario,
  type UsuarioPayload,
  type UsuarioRole,
} from '@/services/usuarios'
const users = ref<Usuario[]>([]),
  loading = ref(false),
  show = ref(false),
  message = ref('')
const roles: UsuarioRole[] = ['admin', 'user', 'doctor', 'nurse', 'pharmacist', 'patient']
type Form = UsuarioPayload & { id?: number }
const blank = (): Form => ({
  nome: '',
  email: '',
  telefone: '',
  documento: '',
  login: '',
  senha: '',
  role: 'user',
  status: 'active',
})
const form = reactive<Form>(blank())
const fields: Array<{
  key: 'nome' | 'email' | 'telefone' | 'documento' | 'login' | 'senha'
  label: string
  type?: string
  required?: boolean
}> = [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'email', label: 'E-mail', type: 'email', required: true },
  { key: 'telefone', label: 'Telefone' },
  { key: 'documento', label: 'Documento', required: true },
  { key: 'login', label: 'Login', required: true },
  { key: 'senha', label: 'Senha (mínimo 8 caracteres)', type: 'password' },
]
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
const load = async () => {
  loading.value = true
  try {
    users.value = await listarUsuarios()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao carregar usuários.')
  } finally {
    loading.value = false
  }
}
const edit = (u?: Usuario) => {
  Object.assign(form, u ? { ...u, senha: '' } : blank())
  show.value = true
}
const save = async () => {
  try {
    if (form.id) await atualizarUsuario(form.id, form)
    else await criarUsuario(form)
    show.value = false
    await load()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao salvar usuário.')
  }
}
const remove = async (u: Usuario) => {
  if (!confirm(`Excluir ${u.nome}?`)) return
  try {
    await removerUsuario(u.id)
    await load()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao excluir usuário.')
  }
}
const router = useRouter(),
  selected = ref<Usuario | null>(null),
  search = ref(''),
  statusFilter = ref('')
const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  masteradmin: 'Administrador principal',
  user: 'Usuário',
  doctor: 'Médico',
  nurse: 'Enfermagem',
  pharmacist: 'Farmacêutico',
  patient: 'Paciente',
}
const statusLabels: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  blocked: 'Bloqueado',
}
const columns = [
  { key: 'nome', label: 'Nome' },
  { key: 'login', label: 'Login' },
  { key: 'role', label: 'Perfil', format: (v: string) => roleLabels[v] || v },
  { key: 'status', label: 'Status', format: (v: string) => statusLabels[v] || v },
]
const filteredUsers = computed(() =>
  users.value.filter(
    (u) =>
      (!statusFilter.value || u.status === statusFilter.value) &&
      [u.nome, u.login, u.email].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      ),
  ),
)
const toolbarActions = computed(() => [
  { icon: 'add', label: 'Novo usuário', variant: 'primary' as const, onClick: () => edit() },
  {
    icon: 'edit',
    label: 'Editar usuário selecionado',
    disabled: !selected.value,
    onClick: () => selected.value && edit(selected.value),
  },
  {
    icon: 'delete',
    label: 'Excluir usuário selecionado',
    variant: 'danger' as const,
    disabled: !selected.value,
    onClick: () => selected.value && remove(selected.value),
  },
  {
    icon: 'open',
    label: 'Gerenciar permissões',
    disabled: !selected.value,
    onClick: () =>
      router.push({ path: '/configuracoes/permissoes', query: { userId: selected.value!.id } }),
  },
  { icon: 'refresh', label: 'Atualizar', onClick: load },
])
onMounted(load)
function clearListFilters() {
  search.value = ''
  statusFilter.value = ''
}
</script>
