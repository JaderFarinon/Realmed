<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      :page-title="'Unidades'"
      :buttons="botoes"
      @novo="abrirCriacao"
      @editar="editarSelecionada"
      @excluir="confirmarExclusaoSelecionada"
    />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Unidades"
        desc="Cadastre e organize as unidades atendidas pelo sistema."
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0 gap-4"
      >
        <div
          v-if="!podeGerenciar"
          class="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
        >
          {{ mensagemSemPermissao }}
        </div>

        <div v-else class="flex flex-col flex-1 min-h-0 gap-4">
          <div class="sm:w-80">
            <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
            <input
              v-model="busca"
              type="search"
              placeholder="Nome da unidade"
              class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div class="flex-1 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nome
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Atualizado em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="carregando">
                    <td colspan="3" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Carregando unidades...
                    </td>
                  </tr>
                  <tr v-else-if="erroCarregamento">
                    <td colspan="3" class="px-4 py-6 text-center text-sm text-red-500">
                      {{ erroCarregamento }}
                    </td>
                  </tr>
                  <tr v-else-if="unidadesFiltradas.length === 0">
                    <td colspan="3" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhuma unidade encontrada.
                    </td>
                  </tr>
                  <tr
                    v-for="unidade in unidadesFiltradas"
                    v-else
                    :key="unidade.id"
                    :class="[
                      'border-b border-gray-100 last:border-b-0 dark:border-gray-800 cursor-pointer transition',
                      unidadeSelecionada?.id === unidade.id
                        ? 'bg-brand-50/60 dark:bg-brand-500/10'
                        : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                    ]"
                    @click="selecionarUnidade(unidade)"
                    @dblclick="editar(unidade)"
                  >
                    <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {{ unidade.nome }}
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {{ formatarData(unidade.updatedAt || unidade.createdAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>

    <ModalUnidade
      :aberta="modalAberta"
      :unidade="unidadeSelecionada"
      @fechar="fecharModal"
      @sucesso="aoSalvar"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ModalUnidade from '@/components/forms/unidades/ModalUnidade.vue'
import {
  listarUnidades,
  removerUnidade,
  type Unidade,
} from '@/services/unidades'
import { useAuthUser } from '@/composables/useAuthUser'
import { useToast } from '@/composables/useToast'
import { PERMISSION_DENIED_MESSAGE, showPermissionDeniedModal } from '@/composables/usePermissionDeniedModal'

const authStore = useAuthUser()

const podeGerenciar = computed(() => {
  const role = authStore.role.value?.toLowerCase() ?? ''
  return role === 'masteradmin' || role === 'admin'
})

const unidades = ref<Unidade[]>([])
const carregando = ref(false)
const salvandoLista = ref(false)
const erroCarregamento = ref('')
const excluindoId = ref<number | null>(null)
const busca = ref('')
const modalAberta = ref(false)
const unidadeSelecionada = ref<Unidade | null>(null)
const unidadesCarregadas = ref(false)

const toast = useToast()
const mensagemSemPermissao = PERMISSION_DENIED_MESSAGE
const carregandoPermissoes = ref(true)

const unidadesFiltradas = computed(() => {
  const termo = busca.value.trim().toLowerCase()

  if (!termo) {
    return unidades.value
  }

  return unidades.value.filter((unidade) => unidade.nome.toLowerCase().includes(termo))
})

const botoes = computed(() => {
  const selecionada = unidadeSelecionada.value
  const podeEditar = Boolean(selecionada && podeGerenciar.value)
  const podeExcluir = podeEditar

  return {
    novo: { visible: true, disabled: !podeGerenciar.value || salvandoLista.value },
    editar: { visible: true, disabled: salvandoLista.value || !podeEditar },
    excluir: { visible: true, disabled: salvandoLista.value || !podeExcluir },
  }
})

const mostrarNotificacao = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
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

const ordenarUnidades = () => {
  unidades.value.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

const carregarUnidades = async (forcar = false) => {
  if (!podeGerenciar.value) {
    return
  }

  if (!forcar && (carregando.value || unidadesCarregadas.value)) {
    return
  }

  carregando.value = true
  erroCarregamento.value = ''

  try {
    const lista = await listarUnidades()
    unidades.value = lista
    ordenarUnidades()
    if (unidadeSelecionada.value) {
      const selecionada = lista.find((item) => item.id === unidadeSelecionada.value?.id)
      unidadeSelecionada.value = selecionada ?? null
    }
    unidadesCarregadas.value = true
  } catch (error: any) {
    console.error('Erro ao carregar unidades', error)
    erroCarregamento.value = error?.response?.data?.error || 'Não foi possível carregar as unidades.'
    unidades.value = []
    unidadesCarregadas.value = false
  } finally {
    carregando.value = false
  }
}

watch(
  () => podeGerenciar.value,
  (autorizado) => {
    if (autorizado) {
      carregarUnidades()
    } else {
      unidades.value = []
      unidadesCarregadas.value = false
    }
  },
  { immediate: true },
)

watch(
  unidadesFiltradas,
  (lista) => {
    if (!unidadeSelecionada.value) {
      return
    }

    const aindaExiste = lista.some((item) => item.id === unidadeSelecionada.value?.id)
    if (!aindaExiste) {
      unidadeSelecionada.value = null
    }
  },
  { deep: true },
)

const abrirCriacao = () => {
  if (!podeGerenciar.value) {
    return
  }
  unidadeSelecionada.value = null
  modalAberta.value = true
}

const selecionarUnidade = (unidade: Unidade) => {
  unidadeSelecionada.value = unidade
}

const editarSelecionada = () => {
  const unidade = unidadeSelecionada.value
  if (!unidade || !podeGerenciar.value) {
    return
  }
  editar(unidade)
}

const editar = (unidade: Unidade) => {
  if (!podeGerenciar.value) {
    return
  }
  unidadeSelecionada.value = unidade
  modalAberta.value = true
}

const confirmarExclusaoSelecionada = async () => {
  const unidade = unidadeSelecionada.value
  if (!unidade || !podeGerenciar.value) {
    return
  }
  await confirmarExclusao(unidade)
}

const fecharModal = () => {
  modalAberta.value = false
}

const garantirAuthCarregado = async () => {
  if (!authStore.isLoaded.value && !authStore.isLoading.value) {
    try {
      await authStore.loadUser()
    } catch (error) {
      console.error('Não foi possível carregar o usuário autenticado.', error)
    }
  }
  carregandoPermissoes.value = false
}

watch(
  [() => authStore.isLoaded.value, () => podeGerenciar.value, () => carregandoPermissoes.value],
  ([isLoaded, pode, carregandoPermissoesValue]) => {
    if (isLoaded && !carregandoPermissoesValue && !pode) {
      showPermissionDeniedModal()
    }
  },
  { immediate: true },
)

onMounted(() => {
  garantirAuthCarregado()
})

const aoSalvar = (unidade: Unidade) => {
  const indice = unidades.value.findIndex((item) => item.id === unidade.id)
  if (indice >= 0) {
    unidades.value.splice(indice, 1, unidade)
  } else {
    unidades.value.push(unidade)
  }
  ordenarUnidades()
  unidadeSelecionada.value = unidade
  mostrarNotificacao('Unidade salva com sucesso.')
  fecharModal()
}

const confirmarExclusao = async (unidade: Unidade) => {
  if (!podeGerenciar.value) {
    return
  }

  if (!window.confirm(`Deseja realmente excluir a unidade "${unidade.nome}"?`)) {
    return
  }

  excluindoId.value = unidade.id
  salvandoLista.value = true
  try {
    await removerUnidade(unidade.id)
    unidades.value = unidades.value.filter((item) => item.id !== unidade.id)
    if (unidadeSelecionada.value?.id === unidade.id) {
      unidadeSelecionada.value = null
    }
    mostrarNotificacao('Unidade removida com sucesso.')
  } catch (error: any) {
    console.error('Erro ao remover unidade', error)
    const mensagem = error?.response?.data?.error || 'Não foi possível remover a unidade.'
    mostrarNotificacao(mensagem, 'error')
  } finally {
    excluindoId.value = null
    salvandoLista.value = false
  }
}

const formatarData = (valor: string | null) => {
  if (!valor) {
    return '—'
  }

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return valor
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}
</script>
