<template>
  <PageShell
    title="Usuários"
    subtitle="Cadastre contas vinculadas ao Stenci ou contas locais do Realmed"
    list
  >
    
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
        <label v-if="!form.id" class="text-sm dark:text-gray-200 sm:col-span-2"
          ><FieldLabel :required="true">Tipo de conta</FieldLabel
          ><select v-model="form.authProvider" class="input mt-1 w-full">
            <option value="STENCI">Conta do Stenci</option>
            <option value="LOCAL">Conta local do Realmed</option>
          </select></label
        >
        <p v-if="form.authProvider === 'STENCI'" class="sm:col-span-2">
          O acesso usa o login e a senha do Stenci. Informe o mesmo login para vincular o cadastro
          no primeiro acesso. As consultas Stenci usam esse vínculo.
        </p>
        <p v-else class="sm:col-span-2 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950">
          Esta conta usa usuário e senha do Realmed. Para fisioterapeutas, selecione o profissional abaixo e cadastre o rosto. A área do fisio consulta a agenda vinculada usando a conexão compartilhada da clínica.
        </p>
        
        <label v-for="field in fields" :key="field.key" class="text-sm dark:text-gray-200"
          ><FieldLabel :required="field.required">{{ field.label }}</FieldLabel
          ><input
            v-model="form[field.key]"
            :type="field.type || 'text'"
            :required="field.required"
            :readonly="linked && ['login', 'documento'].includes(field.key)"
            class="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" /></label
        ><template v-if="form.authProvider === 'LOCAL'">
          <label class="text-sm dark:text-gray-200 sm:col-span-2">
            <FieldLabel :required="!form.id">{{ form.id ? 'Nova senha (opcional)' : 'Senha' }}</FieldLabel>
            <input v-model="form.senha" type="password" autocomplete="new-password" :required="!form.id" minlength="12" maxlength="72" class="input mt-1 w-full" />
            <small class="text-gray-500">Use pelo menos 12 caracteres. Ao editar, deixe em branco para manter a senha atual.</small>
          </label>
          <label class="text-sm dark:text-gray-200 sm:col-span-2">
            <FieldLabel :required="!form.id || Boolean(form.senha)">Confirmar senha</FieldLabel>
            <input v-model="form.confirmarSenha" type="password" autocomplete="new-password" :required="!form.id || Boolean(form.senha)" minlength="12" maxlength="72" class="input mt-1 w-full" />
          </label>
        </template>
        <label class="text-sm dark:text-gray-200"
          ><FieldLabel :required="true">Perfil</FieldLabel
          ><select
            v-model="form.role"
            class="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-gray-950"
          >
            <option v-for="role in availableRoles" :key="role" :value="role">
              {{ roleLabels[role] }}
            </option>
          </select></label
        ><label class="text-sm dark:text-gray-200"
          ><FieldLabel :required="true">Status</FieldLabel
          ><select
            v-model="form.status"
            class="mt-1 h-10 w-full rounded-lg border px-3 dark:bg-gray-950"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="blocked">Bloqueado</option>
          </select></label
        >
        <label v-if="form.role === 'user'" class="text-sm dark:text-gray-200 sm:col-span-2">
          <FieldLabel>Profissional vinculado</FieldLabel>
          <select v-model="form.professionalId" class="input mt-1 w-full">
            <option :value="null">Sem vínculo de fisioterapeuta</option>
            <option v-for="professional in physiotherapists" :key="professional.id" :value="professional.id">
              {{ professional.full_name }} · CREFITO {{ professional.council_number }}/{{ professional.state }}
            </option>
          </select>
          <small class="block pt-1 text-gray-500">A agenda será localizada pelo vínculo explícito com o profissional no Realmed.</small>
        </label>
        <PhysiotherapistFaceEnrollment
          v-if="form.role === 'user' && form.id && form.professionalId"
          class="sm:col-span-2"
          :user-id="form.id"
          :enrolled="Boolean(form.faceEnrolled)"
          @enrolled="refreshFaceStatus(true)"
          @removed="refreshFaceStatus(false)"
        />
        <div class="flex justify-end gap-3 sm:col-span-2">
          <button type="button" class="rounded-lg border px-4 py-2" @click="show = false">
            Cancelar</button
          ><button :disabled="saving" class="rounded-lg bg-brand-500 px-4 py-2 text-white">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </form></ListDetailDialog
    >
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import PhysiotherapistFaceEnrollment from '@/components/PhysiotherapistFaceEnrollment.vue'
import { useRouter } from 'vue-router'
import {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  listarFisioterapeutas,
  associarFisioterapeuta,
  removerUsuario,
  type Usuario,
  type UsuarioPayload,
  type UsuarioRole,
  type FisioterapeutaOption,
} from '@/services/usuarios'
const users = ref<Usuario[]>([]),
  loading = ref(false),
  show = ref(false),
  message = ref(''),
  messageKind = ref<'error' | 'success'>('error'),
  saving = ref(false),
  linked = ref(false)
const physiotherapists = ref<FisioterapeutaOption[]>([])
const roles: UsuarioRole[] = ['admin', 'user']
type Form = UsuarioPayload & {
  id?: number
  professionalId: number | null
  faceEnrolled: boolean
  senha: string
  confirmarSenha: string
}
const blank = (): Form => ({
  nome: '',
  email: '',
  telefone: '',
  documento: '',
  login: '',
  authProvider: 'STENCI',
  senha: '',
  confirmarSenha: '',
  role: 'user',
  status: 'active',
  professionalId: null,
  faceEnrolled: false,
})
const form = reactive<Form>(blank())
const fields = computed<Array<{
  key: 'nome' | 'email' | 'telefone' | 'documento' | 'login'
  label: string
  type?: string
  required?: boolean
}>>(() => [
  { key: 'nome', label: 'Nome', required: true },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'documento', label: 'CPF' },
  { key: 'login', label: form.authProvider === 'STENCI' ? 'Login no Stenci' : 'Login', required: true },
])
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
const load = async () => {
  loading.value = true
  message.value = ''
  messageKind.value = 'error'
  try {
    users.value = await listarUsuarios()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao carregar usuários.')
    messageKind.value = 'error'
  } finally {
    loading.value = false
  }
}
const loadPhysiotherapists = async () => {
  try {
    physiotherapists.value = await listarFisioterapeutas()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao carregar fisioterapeutas.')
    messageKind.value = 'error'
  }
}
const edit = (u?: Usuario) => {
  message.value = ''
  messageKind.value = 'error'
  linked.value = Boolean(u?.stenciLinked)
  Object.assign(form, blank(), { id: undefined }, u || {})
  show.value = true
}
const save = async () => {
  if (saving.value) return
  saving.value = true
  message.value = ''
  messageKind.value = 'error'
  try {
    const wasNew = !form.id
    const saved = form.id ? await atualizarUsuario(form.id, form) : await criarUsuario(form)
    // Keep the created identity even if saving the professional link needs a retry.
    form.id = saved.id
    form.senha = ''
    form.confirmarSenha = ''
    const linkedUser = saved.professionalId === (form.professionalId || null)
      ? saved
      : await associarFisioterapeuta(saved.id, form.professionalId || null)
    form.senha = ''
    form.confirmarSenha = ''
    Object.assign(form, linkedUser, { id: saved.id, professionalId: linkedUser.professionalId || null })
    form.faceEnrolled = linkedUser.faceEnrolled
    show.value = wasNew && Boolean(form.professionalId)
    await load()
    if (wasNew && form.professionalId) message.value = 'Usuário salvo. Cadastre o rosto abaixo para o acesso facial. A entrada por senha já abre a área do fisioterapeuta e avisa os administradores.'
    else if (wasNew) message.value = form.authProvider === 'LOCAL' ? 'Conta local criada. Ela entra no Realmed com usuário e senha próprios.' : 'Conta criada. O vínculo Stenci será confirmado no primeiro acesso.'
    if (wasNew) messageKind.value = 'success'
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao salvar usuário.')
    messageKind.value = 'error'
  } finally {
    saving.value = false
  }
}
const remove = async (u: Usuario) => {
  if (!confirm(`Bloquear o acesso de ${u.nome} ao Realmed? O histórico será preservado.`)) return
  try {
    await removerUsuario(u.id)
    await load()
  } catch (error) {
    message.value = errorMessage(error, 'Erro ao bloquear usuário.')
    messageKind.value = 'error'
  }
}
const router = useRouter(),
  selected = ref<Usuario | null>(null),
  search = ref(''),
  statusFilter = ref('')
const roleLabels: Record<string, string> = {
  admin: 'Admin',
  masteradmin: 'Administrador principal',
  user: 'User',
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
const availableRoles = computed(() => roles)
const columns = [
  { key: 'nome', label: 'Nome' },
  { key: 'login', label: 'Login' },
  {
    key: 'stenciLinked',
    label: 'Vínculo Stenci',
    format: (v: boolean, row: Usuario) =>
      row.authProvider === 'LOCAL' ? 'Não se aplica' : v ? 'Vinculada' : 'Aguardando primeiro acesso',
  },
  { key: 'authProvider', label: 'Autenticação', format: (v: string) => v === 'LOCAL' ? 'Realmed' : 'Stenci' },
  {
    key: 'professionalName',
    label: 'Profissional',
    format: (v: string | null) => v || 'Sem vínculo',
  },
  {
    key: 'faceEnrolled',
    label: 'Face',
    format: (v: boolean, row: Usuario) => row.professionalId ? v ? 'Cadastrada' : 'Pendente' : 'Sem vínculo',
  },
  { key: 'role', label: 'Perfil', format: (v: string) => roleLabels[v] || v },
  { key: 'status', label: 'Status', format: (v: string) => statusLabels[v] || v },
  {
    key: 'lastLogin',
    label: 'Último Acesso',
    format: (v: string | null) =>
      v
        ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'Ainda não acessou',
  },
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
    label: 'Bloquear usuário selecionado',
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
onMounted(() => void Promise.all([load(), loadPhysiotherapists()]))
function refreshFaceStatus(value: boolean) {
  form.faceEnrolled = value
  void load()
}
function clearListFilters() {
  search.value = ''
  statusFilter.value = ''
}

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(messageKind) === 'success' ? 'success' : 'error')
</script>
