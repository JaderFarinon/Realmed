<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      :pageTitle="currentPageTitle"
      :buttons="buttons"
      @novo="abrirModal"
      @editar="editarSelecionado"
      @visualizar="visualizarSelecionado"
      @excluir="excluirSelecionado"
    />
    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Procedimentos"
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <ProcedimentosTable ref="tabela" :atualizar="atualizar" @selecionado-change="onSelecionadoChange" />
      </ComponentCard>
    </div>
    <ProcedimentoModal :isOpen="modalAberto" :dados="null" @close="fecharModal" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ProcedimentosTable from '@/components/tables/procedimentos/ProcedimentosTable.vue'
import ProcedimentoModal from '@/components/forms/procedimentos/ProcedimentoModal.vue'

const currentPageTitle = ref('Procedimentos')
const modalAberto = ref(false)
const atualizar = ref(false)
const tabela = ref<InstanceType<typeof ProcedimentosTable> | null>(null)

const origemSelecionada = ref<'local' | 'integracao' | null>(null)
const possuiSelecionado = ref(false)

const buttons = computed(() => ({
  novo: { visible: true, disabled: false },
  editar: { visible: true, disabled: !possuiSelecionado.value || origemSelecionada.value === 'integracao' },
  excluir: { visible: true, disabled: !possuiSelecionado.value || origemSelecionada.value === 'integracao' },
}))

const abrirModal = () => {
  modalAberto.value = true
}

const fecharModal = (precisaAtualizar: boolean) => {
  modalAberto.value = false
  if (precisaAtualizar) {
    atualizar.value = !atualizar.value
  }
}

const editarSelecionado = () => {
  tabela.value?.editarSelecionado()
}

const visualizarSelecionado = () => {
  tabela.value?.visualizarSelecionado?.()
}

const excluirSelecionado = () => {
  tabela.value?.excluirSelecionado()
}

const onSelecionadoChange = (payload: { item: unknown | null; origem: 'local' | 'integracao' | null }) => {
  possuiSelecionado.value = Boolean(payload.item)
  origemSelecionada.value = payload.origem
}
</script>
