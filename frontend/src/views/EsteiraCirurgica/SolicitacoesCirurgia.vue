<template>
  <AdminLayout>
    <PageBreadcrumb
      :pageTitle="currentPageTitle"
      :buttons="buttons"
      @novo="openModal"
      @editar="editarSelecionado"
      @cancelar="cancelarSelecionado"
    />
    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Solicitações de Cirurgia"
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <SurgicalRequestTable
          ref="tabela"
          @editar="onEditarSolicitacao"
          @cancelar="onCancelarSolicitacao"
        />
      </ComponentCard>
    </div>
    <ModelSolicitacaoCirurgia
      :isOpen="isModalOpen"
      :dados="solicitacaoEdicao"
      @close="closeModal"
      @saved="onSolicitacaoSalva"
    />
    <CancelSolicitacaoModal
      :isOpen="isCancelModalOpen"
      :solicitacao="solicitacaoCancelamento"
      :loading="cancelamentoEmAndamento"
      @close="fecharModalCancelamento"
      @confirm="confirmarCancelamento"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import SurgicalRequestTable from '@/components/tables/surgical-request/SurgicalRequestTable.vue'
import ModelSolicitacaoCirurgia from '@/components/forms/surgical-request/ModelSolicitacaoCirurgia.vue'
import CancelSolicitacaoModal from '@/components/forms/surgical-request/CancelSolicitacaoModal.vue'
import api from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import {
  cloneSurgicalRequestData,
  extractSurgicalRequestId,
} from '@/utils/surgicalRequests'

const currentPageTitle = ref('Solicitações de Cirurgia')
const isModalOpen = ref(false)
const solicitacaoEdicao = ref<Record<string, unknown> | null>(null)
const isCancelModalOpen = ref(false)
const solicitacaoCancelamento = ref<Record<string, unknown> | null>(null)
const cancelamentoEmAndamento = ref(false)
const tabela = ref<InstanceType<typeof SurgicalRequestTable> | null>(null)
const toast = useToast()

const buttons = {
  novo: true,
  editar: true,
  cancelar: true,
}

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

const onCancelarSolicitacao = (dados: Record<string, unknown>) => {
  const id = extractSurgicalRequestId(dados)

  if (!id) {
    toast.error('Não foi possível identificar a solicitação selecionada.')
    return
  }

  solicitacaoCancelamento.value = cloneSurgicalRequestData(dados)
  isCancelModalOpen.value = true
}

const fecharModalCancelamento = () => {
  if (cancelamentoEmAndamento.value) {
    return
  }
  isCancelModalOpen.value = false
  solicitacaoCancelamento.value = null
}

const confirmarCancelamento = async (motivo: string) => {
  if (cancelamentoEmAndamento.value) {
    return
  }

  const id = extractSurgicalRequestId(solicitacaoCancelamento.value ?? {})

  if (!id) {
    toast.error('Não foi possível identificar a solicitação selecionada.')
    return
  }

  cancelamentoEmAndamento.value = true

  try {
    await api.post(`/esteira-procedimentos/${encodeURIComponent(id)}/cancelar`, {
      descricao_motivo: motivo,
    })

    toast.success('Solicitação cancelada com sucesso.')
    fecharModalCancelamento()
    await tabela.value?.reload()
  } catch (error: any) {
    console.error('Erro ao cancelar solicitação de cirurgia', error)
    const mensagem = error?.response?.data?.error || 'Não foi possível cancelar a solicitação selecionada.'
    toast.error(mensagem)
  } finally {
    cancelamentoEmAndamento.value = false
  }
}
</script>
