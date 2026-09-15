<template>
  <AdminLayout>
    <PageBreadcrumbIcons
      :page-title="currentPageTitle"
      :buttons="buttons"
      @novo="abrirModal"
      @editar="editarSelecionado"
      @excluir="excluirSelecionado"
    />
    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Tipos de Procedimento"
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <TiposProcedimentoTable ref="tabela" :atualizar="atualizar" />
      </ComponentCard>
    </div>
    <TipoProcedimentoModal :is-open="modalAberto" :dados="null" @close="fecharModal" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import TiposProcedimentoTable from '@/components/tables/procedimentos/TiposProcedimentoTable.vue'
import TipoProcedimentoModal from '@/components/forms/procedimentos/TipoProcedimentoModal.vue'

const currentPageTitle = ref('Tipos de Procedimento')
const modalAberto = ref(false)
const atualizar = ref(false)
const tabela = ref<InstanceType<typeof TiposProcedimentoTable> | null>(null)

const buttons = {
  novo: true,
  editar: true,
  excluir: true,
}

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

const excluirSelecionado = () => {
  tabela.value?.excluirSelecionado()
}
</script>
