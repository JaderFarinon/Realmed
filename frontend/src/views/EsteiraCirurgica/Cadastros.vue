<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      :page-title="currentPageTitle"
      :buttons="buttonsConfig"
      @novo="abrirModalAtual"
      @editar="editarSelecionado"
      @excluir="excluirSelecionado"
    />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Cadastros da Esteira Cirúrgica"
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <div class="flex flex-col flex-1 min-h-0 space-y-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              :class="[
                'px-4 py-2 rounded-full text-sm font-medium transition',
                activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-theme-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300',
              ]"
              @click="selecionarTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="flex flex-col flex-1 min-h-0 space-y-4">
            <div v-show="activeTab === 'etapas'" class="flex flex-col flex-1 min-h-0">
              <EtapasTable ref="tabelaEtapas" :atualizar="atualizarEtapas" />
            </div>
            <div v-show="activeTab === 'tipos'" class="flex flex-col flex-1 min-h-0">
              <TiposProcedimentoTable ref="tabelaTipos" :atualizar="atualizarTipos" />
            </div>
            <div v-show="activeTab === 'motivos'" class="flex flex-col flex-1 min-h-0">
              <MotivosPendenciaTable ref="tabelaMotivos" :atualizar="atualizarMotivos" />
            </div>
            <div v-show="activeTab === 'parametros'" class="flex flex-col flex-1 min-h-0">
              <ParametrosEsteiraTable ref="tabelaParametros" :atualizar="atualizarParametros" />
            </div>
            <div v-show="activeTab === 'permissoes'" class="flex flex-col flex-1 min-h-0">
              <div class="flex flex-1 min-h-0 flex-col overflow-y-auto">
                <AbaPermissoes ref="abaPermissoesRef" />
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>

    <EtapaModal :is-open="modalEtapaAberto" :dados="null" @close="fecharModalEtapa" />
    <TipoProcedimentoModal :is-open="modalTipoAberto" :dados="null" @close="fecharModalTipo" />
    <MotivoPendenciaModal :is-open="modalMotivoAberto" :dados="null" @close="fecharModalMotivo" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import EtapasTable from '@/components/tables/procedimentos/EtapasTable.vue'
import TiposProcedimentoTable from '@/components/tables/procedimentos/TiposProcedimentoTable.vue'
import MotivosPendenciaTable from '@/components/tables/procedimentos/MotivosPendenciaTable.vue'
import ParametrosEsteiraTable from '@/components/tables/procedimentos/ParametrosEsteiraTable.vue'
import EtapaModal from '@/components/forms/procedimentos/EtapaModal.vue'
import TipoProcedimentoModal from '@/components/forms/procedimentos/TipoProcedimentoModal.vue'
import MotivoPendenciaModal from '@/components/forms/procedimentos/MotivoPendenciaModal.vue'
import AbaPermissoes from '@/views/EsteiraCirurgica/components/AbaPermissoes.vue'
import api from '@/plugins/axios'

type TabId = 'etapas' | 'tipos' | 'motivos' | 'parametros' | 'permissoes'

interface TabConfig {
  id: TabId
  label: string
}

const currentPageTitle = ref('Cadastros da Esteira Cirúrgica')
const activeTab = ref<TabId>('etapas')

const podeGerenciarPermissoes = ref(false)
const abaPermissoesRef = ref<InstanceType<typeof AbaPermissoes> | null>(null)

const carregarPerfisGlobais = async (force = false) => {
  if (!abaPermissoesRef.value) {
    return
  }

  await abaPermissoesRef.value.carregarDados(force)
}

const tabelaEtapas = ref<InstanceType<typeof EtapasTable> | null>(null)
const tabelaTipos = ref<InstanceType<typeof TiposProcedimentoTable> | null>(null)
const tabelaMotivos = ref<InstanceType<typeof MotivosPendenciaTable> | null>(null)
const tabelaParametros = ref<InstanceType<typeof ParametrosEsteiraTable> | null>(null)

const atualizarEtapas = ref(false)
const atualizarTipos = ref(false)
const atualizarMotivos = ref(false)
const atualizarParametros = ref(false)

const modalEtapaAberto = ref(false)
const modalTipoAberto = ref(false)
const modalMotivoAberto = ref(false)

const baseTabs: TabConfig[] = [
  { id: 'etapas', label: 'Etapas' },
  { id: 'tipos', label: 'Tipos de Procedimentos' },
  { id: 'motivos', label: 'Motivos de Pendências' },
  { id: 'parametros', label: 'Parâmetros' },
]

const permissoesTab: TabConfig = { id: 'permissoes', label: 'Permissões' }

const tabs = computed<TabConfig[]>(() => {
  if (!podeGerenciarPermissoes.value) {
    return baseTabs
  }
  return [...baseTabs, permissoesTab]
})

const buttonsConfig = computed(() => {
  if (activeTab.value === 'permissoes') {
    return {
      novo: { visible: false },
      editar: false,
      excluir: { visible: false },
    }
  }
  if (activeTab.value === 'parametros') {
    return {
      novo: { visible: false },
      editar: true,
      excluir: { visible: false },
    }
  }
  return {
    novo: true,
    editar: true,
    excluir: true,
  }
})

const selecionarTab = (id: TabId) => {
  if (id === 'permissoes' && !podeGerenciarPermissoes.value) {
    return
  }
  activeTab.value = id
}

const carregarPerfilAtual = async () => {
  try {
    const { data } = await api.get<{ user?: { role?: string } }>('/auth/me')
    const role = data?.user?.role ?? null
    podeGerenciarPermissoes.value = role === 'masteradmin' || role === 'admin'
  } catch (error: unknown) {
    console.error('Erro ao carregar o perfil do usuário para gerenciar permissões da esteira', error)
    podeGerenciarPermissoes.value = false
  }
}

const abrirModalAtual = () => {
  if (activeTab.value === 'etapas') {
    modalEtapaAberto.value = true
  } else if (activeTab.value === 'tipos') {
    modalTipoAberto.value = true
  } else if (activeTab.value === 'motivos') {
    modalMotivoAberto.value = true
  } else {
    tabelaParametros.value?.editarSelecionado()
  }
}

const fecharModalEtapa = (precisaAtualizar: boolean) => {
  modalEtapaAberto.value = false
  if (precisaAtualizar) {
    atualizarEtapas.value = !atualizarEtapas.value
  }
}

const fecharModalTipo = (precisaAtualizar: boolean) => {
  modalTipoAberto.value = false
  if (precisaAtualizar) {
    atualizarTipos.value = !atualizarTipos.value
  }
}

const fecharModalMotivo = (precisaAtualizar: boolean) => {
  modalMotivoAberto.value = false
  if (precisaAtualizar) {
    atualizarMotivos.value = !atualizarMotivos.value
  }
}

const editarSelecionado = () => {
  if (activeTab.value === 'etapas') {
    tabelaEtapas.value?.editarSelecionado()
  } else if (activeTab.value === 'tipos') {
    tabelaTipos.value?.editarSelecionado()
  } else if (activeTab.value === 'motivos') {
    tabelaMotivos.value?.editarSelecionado()
  } else {
    tabelaParametros.value?.editarSelecionado()
  }
}

const excluirSelecionado = () => {
  if (activeTab.value === 'etapas') {
    tabelaEtapas.value?.excluirSelecionado()
  } else if (activeTab.value === 'tipos') {
    tabelaTipos.value?.excluirSelecionado()
  } else if (activeTab.value === 'motivos') {
    tabelaMotivos.value?.excluirSelecionado()
  }
}

watch(
  () => podeGerenciarPermissoes.value,
  async (pode) => {
    if (!pode) {
      if (activeTab.value === 'permissoes') {
        activeTab.value = 'etapas'
      }
      return
    }

    if (activeTab.value === 'permissoes') {
      await nextTick()
      await carregarPerfisGlobais()
    }
  },
)

watch(
  () => activeTab.value,
  async (tab) => {
    if (tab === 'permissoes' && podeGerenciarPermissoes.value) {
      await nextTick()
      await carregarPerfisGlobais()
    }
  },
)

onMounted(() => {
  carregarPerfilAtual()
})
</script>
