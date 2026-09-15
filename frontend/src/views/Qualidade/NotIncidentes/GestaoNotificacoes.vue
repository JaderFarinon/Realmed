<template>
  <AdminLayout>
    <div class="space-y-6">
      <PageBreadcrumbIcons
        :page-title="pageTitle"
        :buttons="breadcrumbButtons"
        @novo="abrirNovaNotificacao"
        @cadastros="openParametros"
      />

      <ComponentCard
        title="Notificações"
        class-name="shadow-theme-sm"
        body-class="space-y-6"
        content-class="space-y-6"
      >
        <div class="flex flex-wrap items-center gap-3">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            :class="[
              'rounded-full px-4 py-2 text-sm font-medium transition',
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-theme-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.08] dark:text-gray-300',
            ]"
            @click="selectTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <form class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" @submit.prevent="buscarNotificacoes">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300">Paciente</label>
            <input
              v-model="filtros.dsPaciente"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
              placeholder="Nome do paciente"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300">Classificação</label>
            <select
              v-model="filtros.dsClass"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
            >
              <option value="">Todas</option>
              <option value="Não Processado">Não Processado</option>
              <option value="Procedente">Procedente</option>
              <option value="Improcedente">Improcedente</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300">Incidente</label>
            <select
              v-model.number="filtros.cdIncidente"
              class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200"
            >
              <option :value="null">Todos</option>
              <option v-for="tipo in tipos" :key="tipo.id" :value="tipo.id">{{ tipo.dsTipo }}</option>
            </select>
          </div>
          <div class="flex items-end gap-3">
            <Button variant="outline" size="sm" @click="limparFiltros">Limpar</Button>
            <Button size="sm" @click="buscarNotificacoes">Buscar</Button>
          </div>
        </form>

        <NotificacoesTable
          :items="notificacoes"
          :loading="isLoading"
          :selected-id="notificacaoSelecionada"
          @update:selected-id="(value) => (notificacaoSelecionada = value)"
          @pre-processamento="abrirPreProcessamento"
          @preview="abrirPreview"
          @imprimir="imprimir"
        />
      </ComponentCard>
    </div>

    <PreProcessamentoModal
      v-if="preProcessamentoSelecionado"
      :open="isPreProcessamentoOpen"
      :notificacao="preProcessamentoSelecionado"
      :responsaveis="responsaveis"
      @close="fecharPreProcessamento"
      @saved="handlePreProcessamentoSalvo"
      @refresh-responsaveis="carregarResponsaveis"
    />

    <PreviewNotificacaoModal
      v-if="previewSelecionado"
      :open="isPreviewOpen"
      :notificacao-id="previewSelecionado"
      @close="() => (isPreviewOpen = false)"
    />

    <NovaNotificacaoModal
      :open="isNovaNotificacaoOpen"
      :tipos="tipos"
      @close="() => (isNovaNotificacaoOpen = false)"
      @created="handleNovaNotificacao"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import Button from '@/components/ui/Button.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import NotificacoesTable from '@/components/tables/not-incidentes/NotificacoesTable.vue'
import {
  cancelPreProcessamento,
  fetchNotificacaoById,
  fetchNotificacoes,
  fetchResponsaveis,
  fetchTiposNotificacao,
} from '@/services/notIncidentes'
import type {
  NotificacaoFiltro,
  NotificacaoIncidente,
  NotificacaoTipo,
  RespNotificacao,
} from '@/types/notIncidentes'
import PreProcessamentoModal from './components/PreProcessamentoModal.vue'
import PreviewNotificacaoModal from './components/PreviewNotificacaoModal.vue'
import NovaNotificacaoModal from './components/NovaNotificacaoModal.vue'
import { useToast } from '@/composables/useToast'

interface TabConfig {
  id: string
  label: string
  scope?: string
  qualidade?: boolean
  pesquisa?: boolean
}

const pageTitle = 'Gestão de Notificações'

const tabs: TabConfig[] = [
  { id: 'pre-qualidade', label: 'Pré-Processamento', scope: 'pre', qualidade: true },
  { id: 'pre-pesquisa', label: 'Pré-Processamento (Pesquisa Clínica)', scope: 'pre-pesquisa', pesquisa: true },
  { id: 'nucleo', label: 'Núcleo de Segurança', scope: 'nucleo' },
  { id: 'administrativo', label: 'Administrativo', scope: 'administrativo' },
  { id: 'comissoes', label: 'Comissões', scope: 'comissoes' },
  { id: 'qualidade', label: 'Qualidade', scope: 'qualidade' },
  { id: 'compras', label: 'Compras', scope: 'compras' },
  { id: 'pos-pesquisa', label: 'Pós-Pesquisa', scope: 'pos-pesquisa' },
]

const activeTab = ref<string>(tabs[0].id)
const router = useRouter()
const cadastrosPath = '/qualidade/gestao-notificacoes/cadastros'
const breadcrumbButtons = { novo: true, cadastros: true }
const filtros = reactive<NotificacaoFiltro>({
  dsPaciente: '',
  dsClass: '',
  cdMedico: null,
  cdSetorNotificador: null,
  cdIncidente: null,
  cdResponsavel: null,
})

const notificacoes = ref<NotificacaoIncidente[]>([])
const tipos = ref<NotificacaoTipo[]>([])
const responsaveis = ref<RespNotificacao[]>([])
const isLoading = ref<boolean>(false)
const isPreProcessamentoOpen = ref(false)
const isPreviewOpen = ref(false)
const isNovaNotificacaoOpen = ref(false)
const preProcessamentoSelecionado = ref<NotificacaoIncidente | null>(null)
const previewSelecionado = ref<number | null>(null)
const notificacaoSelecionada = ref<number | null>(null)

const toast = useToast()

const filtrosComEscopo = computed(() => {
  const tab = tabs.find((item) => item.id === activeTab.value)
  return {
    ...filtros,
    qualidade: tab?.qualidade,
    pesquisa: tab?.pesquisa,
    scope: tab?.scope,
  }
})

const carregarNotificacoes = async () => {
  isLoading.value = true
  try {
    const { data } = await fetchNotificacoes(filtrosComEscopo.value)
    notificacoes.value = data
    if (notificacaoSelecionada.value) {
      const aindaExiste = data.some((item) => item.id === notificacaoSelecionada.value)
      if (!aindaExiste) {
        notificacaoSelecionada.value = null
      }
    }
  } catch (error) {
    console.error('Erro ao listar notificações', error)
    toast.error('Não foi possível carregar as notificações')
  } finally {
    isLoading.value = false
  }
}

const carregarTipos = async () => {
  try {
    tipos.value = await fetchTiposNotificacao({ qualidade: true, pesquisa: true, incluirSubtipos: true })
  } catch (error) {
    console.error('Erro ao listar tipos de incidentes', error)
    toast.error('Não foi possível carregar os tipos de incidentes')
  }
}

const carregarResponsaveis = async () => {
  try {
    responsaveis.value = await fetchResponsaveis()
  } catch (error) {
    console.error('Erro ao listar responsáveis', error)
    toast.error('Não foi possível carregar os responsáveis')
  }
}

const buscarNotificacoes = async () => {
  await carregarNotificacoes()
}

const limparFiltros = async () => {
  filtros.dsPaciente = ''
  filtros.dsClass = ''
  filtros.cdIncidente = null
  filtros.cdSetorNotificador = null
  filtros.cdResponsavel = null
  filtros.cdMedico = null
  await carregarNotificacoes()
}

const selectTab = async (id: string) => {
  if (activeTab.value === id) return
  activeTab.value = id
  await carregarNotificacoes()
}

const abrirPreProcessamento = async (item: NotificacaoIncidente) => {
  try {
    const detalhado = await fetchNotificacaoById(item.id)
    preProcessamentoSelecionado.value = detalhado
    isPreProcessamentoOpen.value = true
  } catch (error) {
    console.error('Erro ao abrir pré-processamento', error)
    toast.error('Não foi possível abrir o pré-processamento da notificação')
  }
}

const fecharPreProcessamento = async (cancelado = false) => {
  isPreProcessamentoOpen.value = false
  if (cancelado && preProcessamentoSelecionado.value) {
    try {
      await cancelPreProcessamento(preProcessamentoSelecionado.value.id)
      toast.success('Pré-processamento cancelado com sucesso')
      await carregarNotificacoes()
    } catch (error) {
      console.error('Erro ao cancelar pré-processamento', error)
      toast.error('Não foi possível cancelar o pré-processamento')
    }
  }
  preProcessamentoSelecionado.value = null
}

const handlePreProcessamentoSalvo = async () => {
  toast.success('Pré-processamento salvo com sucesso')
  isPreProcessamentoOpen.value = false
  preProcessamentoSelecionado.value = null
  await carregarNotificacoes()
}

const abrirPreview = async (item: NotificacaoIncidente) => {
  previewSelecionado.value = item.id
  isPreviewOpen.value = true
}

const imprimir = (item: NotificacaoIncidente) => {
  window.open(`/api/not-incidentes/${item.id}/relatorio`, '_blank')
}

const abrirNovaNotificacao = () => {
  isNovaNotificacaoOpen.value = true
}

const handleNovaNotificacao = async () => {
  toast.success('Notificação cadastrada com sucesso')
  isNovaNotificacaoOpen.value = false
  await carregarNotificacoes()
}

const openParametros = () => {
  const resolved = router.resolve(cadastrosPath)
  if (resolved.matched.length) {
    void router.push(resolved)
    return
  }

  window.open('/configuracoes/parametrizacoes', '_blank')
}

onMounted(async () => {
  await Promise.all([carregarTipos(), carregarResponsaveis()])
  await carregarNotificacoes()
})
</script>
