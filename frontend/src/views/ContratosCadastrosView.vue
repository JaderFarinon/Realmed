<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div class="flex flex-col gap-6 min-h-[calc(100vh-180px)]">
        <PageBreadcrumbIcons
          :page-title="titulo"
          :buttons="buttonsConfig"
          @novo="abrirModalAtual"
        />

        <CardBox class="flex flex-col flex-1" body-class="flex flex-col flex-1 min-h-0">
          <div class="flex flex-col flex-1 min-h-0 gap-4">
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
                @click="setActiveTab(tab.id)"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="flex flex-1 min-h-0">
              <div v-show="activeTab === 'templates'" class="flex-1 min-h-0">
                <AbaTemplates ref="abaTemplatesRef" />
              </div>
              <div v-show="activeTab === 'alertas'" class="flex-1 min-h-0">
                <AbaAlertas ref="abaAlertasRef" />
              </div>
              <div v-show="activeTab === 'agenteIa'" class="flex-1 min-h-0">
                <AbaAgenteIa />
              </div>
            </div>
          </div>
        </CardBox>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CardBox from '@/components/layout/CardBox.vue'
import LayoutAuthenticated from '@/components/layout/LayoutAuthenticated.vue'
import SectionMain from '@/components/layout/SectionMain.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import AbaTemplates from '@/components/contratos/AbaTemplates.vue'
import AbaAlertas from '@/components/contratos/AbaAlertas.vue'
import AbaAgenteIa from '@/components/contratos/AbaAgenteIa.vue'

const route = useRoute()
const router = useRouter()

const allowedTabs = ['templates', 'alertas', 'agenteIa'] as const

type TabId = (typeof allowedTabs)[number]

const getTabFromRoute = (): TabId => {
  const tab = route.query.tab
  return allowedTabs.includes(tab as TabId) ? (tab as TabId) : 'templates'
}

const activeTab = ref<TabId>(getTabFromRoute())

const TAB_TITLES: Record<TabId, string> = {
  templates: 'Gestão de Contratos - Templates',
  alertas: 'Gestão de Contratos - Notificações',
  agenteIa: 'Gestão de Contratos - Agente de IA',
}

const titulo = computed(() => TAB_TITLES[activeTab.value])

const abaTemplatesRef = ref<InstanceType<typeof AbaTemplates> | null>(null)
const abaAlertasRef = ref<InstanceType<typeof AbaAlertas> | null>(null)

const tabs: { id: TabId; label: string }[] = [
  { id: 'templates', label: 'Templates' },
  { id: 'alertas', label: 'Notificações' },
  { id: 'agenteIa', label: 'Agente de IA' },
]

const buttonsConfig = computed(() => ({
  novo: activeTab.value !== 'agenteIa',
  editar: activeTab.value !== 'agenteIa',
  excluir: activeTab.value !== 'agenteIa',
}))

const setActiveTab = (tab: TabId) => {
  if (activeTab.value !== tab) {
    activeTab.value = tab
  }

  router.replace({
    path: '/contratos/cadastros',
    query: tab === 'templates' ? {} : { tab },
  })
}

watch(
  () => route.query.tab,
  () => {
    const nextTab = getTabFromRoute()
    if (nextTab !== activeTab.value) {
      activeTab.value = nextTab
    }
  },
)

const abrirModalAtual = () => {
  if (activeTab.value === 'templates') {
    abaTemplatesRef.value?.abrirModal()
  } else if (activeTab.value === 'alertas') {
    abaAlertasRef.value?.abrirModal()
  }
}
</script>
