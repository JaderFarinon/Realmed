<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      page-title="Usuários"
      :buttons="botoes"
      @novo="abrirCriacao"
      @editar="editarSelecionado"
      @visualizar="editarSelecionado"
      @excluir="confirmarExclusaoSelecionado"
    />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Usuários"
        desc="Gerencie logins e permissões dos usuários do sistema."
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0 gap-4"
      >
        <div
          v-if="verificandoPermissoes"
          class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
        >
          Carregando permissões do usuário...
        </div>

        <div
          v-else-if="!podeAcessar"
          class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
        >
          {{ mensagemSemPermissao }}
        </div>

        <UsuariosTable
          v-else
          ref="tabelaRef"
          :role-labels="roleLabels"
          :status-options="statusOptions"
          :filtro-role-options="filtroRoleOptions"
          :pode-gerenciar-role="podeGerenciarRole"
          @selecionado-change="onSelecionadoChange"
          @erro="mostrarErroTabela"
          @carregando-change="onCarregandoChange"
        />
      </ComponentCard>
    </div>

    <ModalUsuario
      :aberto="modalAberto"
      :usuario="usuarioSelecionado"
      :roles-disponiveis="rolesDisponiveis"
      @fechar="fecharModal"
      @sucesso="aoSalvar"
      @erro="mostrarErro"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ModalUsuario from '@/components/forms/usuarios/ModalUsuario.vue'
import UsuariosTable from '@/components/tables/usuarios/UsuariosTable.vue'
import api from '@/plugins/axios'
import { removerUsuario as removerUsuarioApi, type Usuario, type UsuarioRole, type UsuarioStatus } from '@/services/usuarios'
import { useToast } from '@/composables/useToast'
import { PERMISSION_DENIED_MESSAGE, showPermissionDeniedModal } from '@/composables/usePermissionDeniedModal'
import { canManageRole } from '@/utils/roles'

interface AuthUser {
  id: number
  username: string
  role?: UsuarioRole | string
  name?: string | null
}

const usuarioSelecionado = ref<Usuario | null>(null)
const modalAberto = ref(false)
const usuarioAtual = ref<AuthUser | null>(null)
const tabelaRef = ref<InstanceType<typeof UsuariosTable> | null>(null)
const carregandoLista = ref(false)
const verificandoPermissoes = ref(true)
const toast = useToast()
const mensagemSemPermissao = PERMISSION_DENIED_MESSAGE

const roleLabels: Record<UsuarioRole, string> = {
  masteradmin: 'Master Admin',
  admin: 'Administrador',
  cac_coord: 'Coordenação do CAC',
  cac: 'CAC',
  secretaria: 'Secretaria',
  user: 'Usuário',
  doctor: 'Médico',
  nurse: 'Enfermeiro(a)',
  pharmacist: 'Farmacêutico(a)',
  patient: 'Paciente',
}

const ordenarPorLabel = (roles: UsuarioRole[]) =>
  [...roles].sort((a, b) => roleLabels[a].localeCompare(roleLabels[b], 'pt-BR'))

const statusOptions: Array<{ value: UsuarioStatus; label: string }> = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'blocked', label: 'Bloqueado' },
]

const todasRoles: UsuarioRole[] = ordenarPorLabel([
  'masteradmin',
  'admin',
  'cac_coord',
  'cac',
  'secretaria',
  'user',
  'doctor',
  'nurse',
  'pharmacist',
  'patient',
])

const podeAcessar = computed(() => {
  const role = usuarioAtual.value?.role
  return role === 'masteradmin' || role === 'admin'
})

const podeCriar = computed(() => podeAcessar.value)

const rolesDisponiveis = computed<UsuarioRole[]>(() => {
  if (usuarioAtual.value?.role === 'masteradmin') {
    return [...todasRoles]
  }

  if (usuarioAtual.value?.role === 'admin') {
    return ordenarPorLabel(
      todasRoles.filter((role) => role !== 'masteradmin'),
    )
  }

  return []
})

const filtroRoleOptions = computed(() => {
  const permissoes =
    usuarioAtual.value?.role === 'masteradmin'
      ? todasRoles
      : rolesDisponiveis.value
  return permissoes.map((role) => ({ value: role, label: roleLabels[role] }))
})

const podeGerenciarRole = (role: UsuarioRole) =>
  canManageRole(usuarioAtual.value?.role ?? null, role)

const podeEditarUsuario = (usuario: Usuario) => podeGerenciarRole(usuario.role)

const podeExcluirUsuario = (usuario: Usuario) => {
  if (!podeGerenciarRole(usuario.role)) return false
  return usuarioAtual.value?.id !== usuario.id
}

const botoes = computed(() => {
  const selecionado = usuarioSelecionado.value
  const podeEditar = selecionado ? podeEditarUsuario(selecionado) : false
  const podeExcluir = selecionado ? podeExcluirUsuario(selecionado) : false

  return {
    novo: { visible: true, disabled: !podeCriar.value || carregandoLista.value },
    editar: {
      visible: true,
      disabled: carregandoLista.value || !podeEditar,
    },
    excluir: {
      visible: true,
      disabled: carregandoLista.value || !podeExcluir,
    },
  }
})

const mostrarNotificacao = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
  if (type === 'success') {
    toast.success(message)
  } else if (type === 'error') {
    toast.error(message)
  } else if (type === 'info') {
    toast.info(message)
  } else {
    toast.warning(message)
  }
}

const extrairMensagemErro = (erro: unknown, padrao: string) => {
  if (typeof erro === 'object' && erro !== null) {
    const resposta = (erro as { response?: { data?: { error?: unknown } } }).response
    const mensagem = resposta?.data?.error
    if (typeof mensagem === 'string' && mensagem.trim().length > 0) {
      return mensagem
    }
  }

  if (erro instanceof Error && erro.message.trim().length > 0) {
    return erro.message
  }

  return padrao
}

const carregarUsuarioAtual = async () => {
  try {
    const { data } = await api.get<{ user: AuthUser }>('/auth/me')
    usuarioAtual.value = data.user
  } catch {
    usuarioAtual.value = null
  }
}

const abrirCriacao = () => {
  if (!podeCriar.value || carregandoLista.value) return
  usuarioSelecionado.value = null
  tabelaRef.value?.limparSelecao()
  modalAberto.value = true
}

const editarSelecionado = () => {
  const usuario = usuarioSelecionado.value
  if (!usuario || !podeEditarUsuario(usuario) || carregandoLista.value) return
  modalAberto.value = true
}

const fecharModal = () => {
  modalAberto.value = false
}

const aoSalvar = (usuario: Usuario) => {
  tabelaRef.value?.atualizarUsuario(usuario)
  usuarioSelecionado.value = usuario
  mostrarNotificacao('success', 'Usuário salvo com sucesso.')
}

const mostrarErro = (mensagem: string) => {
  mostrarNotificacao('error', mensagem)
}

const confirmarExclusaoSelecionado = async () => {
  const usuario = usuarioSelecionado.value
  if (!usuario || !podeExcluirUsuario(usuario) || carregandoLista.value) return

  const confirmado = window.confirm(`Deseja realmente excluir o usuário "${usuario.nome}"?`)
  if (!confirmado) return

  try {
    await removerUsuarioApi(usuario.id)
    tabelaRef.value?.removerUsuario(usuario.id)
    usuarioSelecionado.value = null
    mostrarNotificacao('success', 'Usuário excluído com sucesso.')
  } catch (erro: unknown) {
    mostrarNotificacao('error', extrairMensagemErro(erro, 'Não foi possível excluir o usuário.'))
  }
}

const mostrarErroTabela = (mensagem: string) => {
  if (mensagem) {
    mostrarNotificacao('error', mensagem)
  }
}

const onSelecionadoChange = (usuario: Usuario | null) => {
  usuarioSelecionado.value = usuario
}

const onCarregandoChange = (valor: boolean) => {
  carregandoLista.value = valor
}

onMounted(async () => {
  await carregarUsuarioAtual()
  verificandoPermissoes.value = false
})

watch(
  [() => verificandoPermissoes.value, () => podeAcessar.value],
  ([verificando, pode]) => {
    if (!verificando && !pode) {
      showPermissionDeniedModal()
    }
  },
  { immediate: true },
)
</script>
