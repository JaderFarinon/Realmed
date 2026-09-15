<template>
  <AdminLayout>
    <PageBreadcrumbIcons :page-title="pageTitle" />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Parâmetros do Sistema"
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
              @click="selectTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="flex flex-col flex-1 min-h-0">
            <section
              v-for="tab in tabs"
              v-show="activeTab === tab.id"
              :key="`content-${tab.id}`"
              class="flex flex-1 min-h-0 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            >
              Em breve você poderá configurar os parâmetros de {{ tab.label }} por aqui.
            </section>
          </div>
        </div>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'

type ModuleTab =
  | 'diretoria'
  | 'esteira-cirurgica'
  | 'relatorios'
  | 'faturamento'
  | 'financeiro'
  | 'qualidade'

interface TabConfig {
  id: ModuleTab
  label: string
}

const pageTitle = 'Parâmetros do Sistema'

const tabs: TabConfig[] = [
  { id: 'diretoria', label: 'Diretoria' },
  { id: 'esteira-cirurgica', label: 'Esteira Cirúrgica' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'qualidade', label: 'Qualidade' },
]

const activeTab = ref<ModuleTab>('diretoria')

const selectTab = (tabId: ModuleTab) => {
  activeTab.value = tabId
}
</script>
