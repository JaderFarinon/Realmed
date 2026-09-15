<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      page-title="Permissões"
      :buttons="botoes"
      @editar="abrirPermissoesSelecionado"
    />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Gerenciamento de Permissões"
        desc="Controle o acesso dos usuários aos módulos do sistema de acordo com seu perfil."
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <div
          v-if="!podeAcessar"
          class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
        >
          {{ mensagemSemPermissao }}
        </div>

        <PermissoesUsuariosTable
          v-else
          ref="tabelaRef"
          :role-labels="roleLabels"
          :pode-acessar="podeAcessar"
          @selecionado-change="selecionarUsuario"
          @usuario-dblclick="abrirModal"
          @carregando-change="atualizarCarregandoTabela"
          @erro="mostrarErro"
        />
      </ComponentCard>
    </div>

    <ModalPermissoes
      :aberto="modalAberto"
      :usuario="usuarioSelecionado"
      :module-groups="moduleGroups"
      @fechar="fecharModal"
      @salvo="aoSalvarPermissoes"
      @erro="mostrarErro"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ModalPermissoes from '@/components/forms/usuarios/ModalPermissoes.vue'
import PermissoesUsuariosTable from '@/components/tables/configuracoes/PermissoesUsuariosTable.vue'
import api from '@/plugins/axios'
import { sidebarMenuGroups } from '@/constants/sidebarMenu'
import { hiddenPermissionModules } from '@/constants/hiddenPermissionModules'
import { buildPermissionModuleGroups } from '@/utils/permission-modules'
import type { Usuario } from '@/services/usuarios'
import { useToast } from '@/composables/useToast'
import { PERMISSION_DENIED_MESSAGE, showPermissionDeniedModal } from '@/composables/usePermissionDeniedModal'
import { canManageRole } from '@/utils/roles'

interface AuthUser {
  id: number
  role?: string
  nome?: string | null
}

const usuarioAtual = ref<AuthUser | null>(null)
const usuarioSelecionado = ref<Usuario | null>(null)
const modalAberto = ref(false)
const carregandoTabela = ref(false)
const tabelaRef = ref<InstanceType<typeof PermissoesUsuariosTable> | null>(null)
const carregandoUsuarioAtual = ref(true)

const toast = useToast()
const mensagemSemPermissao = PERMISSION_DENIED_MESSAGE

const moduleGroups = buildPermissionModuleGroups(sidebarMenuGroups, hiddenPermissionModules)

const roleLabels: Record<string, string> = {
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

const podeAcessar = computed(() => {
  const role = usuarioAtual.value?.role
  return role === 'masteradmin' || role === 'admin'
})

const podeGerenciarUsuario = (usuario: Usuario) => {
  if (!podeAcessar.value) return false
  return canManageRole(usuarioAtual.value?.role ?? null, usuario.role)
}

const botoes = computed(() => {
  const selecionado = usuarioSelecionado.value
  const podeGerenciar = selecionado ? podeGerenciarUsuario(selecionado) : false

  return {
    novo: { visible: false },
    editar: { visible: true, disabled: !podeGerenciar || carregandoTabela.value },
    excluir: { visible: false },
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

const carregarUsuarioAtual = async () => {
  try {
    const { data } = await api.get<{ user: AuthUser }>('/auth/me')
    usuarioAtual.value = data.user
  } catch {
    usuarioAtual.value = null
  }
}

const selecionarUsuario = (usuario: Usuario | null) => {
  usuarioSelecionado.value = usuario
}

const atualizarCarregandoTabela = (status: boolean) => {
  carregandoTabela.value = status
}

const abrirModal = (usuario: Usuario) => {
  if (!podeGerenciarUsuario(usuario)) return
  selecionarUsuario(usuario)
  modalAberto.value = true
}

const abrirPermissoesSelecionado = () => {
  const usuario = usuarioSelecionado.value
  if (!usuario || !podeGerenciarUsuario(usuario)) return
  modalAberto.value = true
}

const fecharModal = () => {
  modalAberto.value = false
  usuarioSelecionado.value = null
  tabelaRef.value?.limparSelecao()
}

const aoSalvarPermissoes = () => {
  mostrarNotificacao('success', 'Permissões atualizadas com sucesso.')
  fecharModal()
  tabelaRef.value?.recarregar()
}

const mostrarErro = (mensagem: string) => {
  if (mensagem) {
    mostrarNotificacao('error', mensagem)
  }
}

onMounted(async () => {
  await carregarUsuarioAtual()
  carregandoUsuarioAtual.value = false
})

watch(
  [() => carregandoUsuarioAtual.value, () => podeAcessar.value],
  ([carregando, pode]) => {
    if (!carregando && !pode) {
      showPermissionDeniedModal()
    }
  },
  { immediate: true },
)
</script>
