<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      :page-title="currentPageTitle"
      :buttons="buttons"
      @novo="openModal"
      @editar="editarSelecionado"
      @excluir="cancelarSelecionado"
      @timeline="abrirLinhaDoTempo"
    />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Gestão de Cirurgias"
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <SurgicalRequestTable
          ref="tabela"
          @editar="onEditarSolicitacao"
          @cancelar="onCancelarSolicitacao"
          @selecionado="onSelecionado"
        />
      </ComponentCard>
    </div>

    <ModelSolicitacaoCirurgia
      :isOpen="isModalOpen"
      :dados="solicitacaoEdicao"
      @close="closeModal"
      @saved="onSolicitacaoSalva"
    />
    <SurgicalRequestTimelineModal
      :is-open="isTimelineOpen"
      :solicitacao-id="solicitacaoSelecionadaId"
      :solicitacao="solicitacaoSelecionada"
      @close="fecharLinhaDoTempo"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import SurgicalRequestTable from '@/components/tables/surgical-request/SurgicalRequestTable.vue'
import ModelSolicitacaoCirurgia from '@/components/forms/surgical-request/ModelSolicitacaoCirurgia.vue'
import SurgicalRequestTimelineModal from '@/components/surgical-request/SurgicalRequestTimelineModal.vue'
import api from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import {
  cloneSurgicalRequestData,
  extractSurgicalRequestId,
} from '@/utils/surgicalRequests'

const currentPageTitle = ref('Gestão de Cirurgias')
const isModalOpen = ref(false)
const solicitacaoEdicao = ref<Record<string, unknown> | null>(null)
const tabela = ref<InstanceType<typeof SurgicalRequestTable> | null>(null)
const toast = useToast()
const solicitacaoSelecionada = ref<Record<string, unknown> | null>(null)
const isTimelineOpen = ref(false)

const solicitacaoSelecionadaId = computed(() => {
  const selecionada = solicitacaoSelecionada.value
  if (!selecionada) {
    return null
  }
  const id = extractSurgicalRequestId(selecionada)
  return id || null
})

const buttons = computed(() => ({
  novo: true,
  editar: true,
  excluir: true,
  timeline: {
    visible: true,
    disabled: !solicitacaoSelecionada.value,
  },
}))

const openModal = () => {
  solicitacaoEdicao.value = null
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  solicitacaoEdicao.value = null
}

const onSolicitacaoSalva = async () => {
  await tabela.value?.reload()
}

const editarSelecionado = () => {
  tabela.value?.editarSelecionado()
}

const cancelarSelecionado = () => {
  tabela.value?.cancelarSelecionado()
}

const onEditarSolicitacao = (dados: Record<string, unknown>) => {
  solicitacaoEdicao.value = cloneSurgicalRequestData(dados)
  isModalOpen.value = true
}

const onSelecionado = (dados: Record<string, unknown> | null) => {
  solicitacaoSelecionada.value = dados
}

const abrirLinhaDoTempo = () => {
  const selecionada = tabela.value?.getSelecionado?.() ?? solicitacaoSelecionada.value

  if (!selecionada) {
    toast.warning('Selecione uma solicitação para visualizar a linha do tempo.')
    return
  }

  const id = extractSurgicalRequestId(selecionada)
  if (!id) {
    toast.error('Não foi possível identificar a solicitação selecionada.')
    return
  }

  solicitacaoSelecionada.value = selecionada
  isTimelineOpen.value = true
}

const fecharLinhaDoTempo = () => {
  isTimelineOpen.value = false
}

const onCancelarSolicitacao = async (dados: Record<string, unknown>) => {
  const id = extractSurgicalRequestId(dados)

  if (!id) {
    toast.error('Não foi possível identificar a solicitação selecionada.')
    return
  }

  const confirmado = window.confirm('Deseja realmente excluir esta solicitação de cirurgia?')

  if (!confirmado) {
    return
  }

  try {
    await api.delete(`/esteira-procedimentos/${encodeURIComponent(id)}`)
    toast.success('Solicitação excluída com sucesso.')
    await tabela.value?.reload()
  } catch (error) {
    console.error('Erro ao excluir solicitação de cirurgia', error)
    toast.error('Não foi possível excluir a solicitação selecionada.')
  }
}
</script>
