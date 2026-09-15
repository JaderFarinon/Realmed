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
              <div v-show="activeTab === 'contratos'" class="flex-1 min-h-0">
                <AbaContratos ref="abaContratosRef" @contrato-selecionado="onContratoSelecionado" />
              </div>
              <div v-show="activeTab === 'aditivos'" class="flex-1 min-h-0">
                <AbaAditivos ref="abaAditivosRef" :contrato-id="contratoSelecionadoId" />
              </div>
              <div v-show="activeTab === 'negociacoes'" class="flex-1 min-h-0">
                <AbaNegociacoes ref="abaNegociacoesRef" :contrato-id="contratoSelecionadoId" />
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
import AbaContratos from '@/components/contratos/AbaContratos.vue'
import AbaAditivos from '@/components/contratos/AbaAditivos.vue'
import AbaNegociacoes from '@/components/contratos/AbaNegociacoes.vue'

const route = useRoute()
const router = useRouter()

const allowedTabs = ['contratos', 'aditivos', 'negociacoes'] as const

type TabId = (typeof allowedTabs)[number]

const getTabFromRoute = (): TabId => {
  const tab = route.query.tab
  return allowedTabs.includes(tab as TabId) ? (tab as TabId) : 'contratos'
}

const activeTab = ref<TabId>(getTabFromRoute())

const titulo = computed(() => {
  if (activeTab.value === 'contratos') return 'Gestão de Contratos'
  if (activeTab.value === 'aditivos') return 'Gestão de Contratos - Aditivos'
  return 'Gestão de Contratos - Negociações'
})

const abaContratosRef = ref<InstanceType<typeof AbaContratos> | null>(null)
const abaAditivosRef = ref<InstanceType<typeof AbaAditivos> | null>(null)
const abaNegociacoesRef = ref<InstanceType<typeof AbaNegociacoes> | null>(null)

const tabs: { id: TabId; label: string }[] = [
  { id: 'contratos', label: 'Contratos' },
  { id: 'aditivos', label: 'Aditivos' },
  { id: 'negociacoes', label: 'Negociações' },
]

const contratoSelecionadoId = ref<number | null>(null)

const buttonsConfig = computed(() => ({
  novo: activeTab.value === 'contratos' || Boolean(contratoSelecionadoId.value),
  editar: true,
  excluir: true,
}))

const setActiveTab = (tab: TabId) => {
  if (activeTab.value !== tab) {
    activeTab.value = tab
  }

  router.replace({
    path: '/contratos',
    query: tab === 'contratos' ? {} : { tab },
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
  if (activeTab.value === 'contratos') {
    abaContratosRef.value?.abrirModal()
  } else if (activeTab.value === 'aditivos') {
    abaAditivosRef.value?.abrirModal()
  } else if (activeTab.value === 'negociacoes') {
    abaNegociacoesRef.value?.abrirModal()
  }
}

const onContratoSelecionado = (contrato: { id?: number } | null) => {
  contratoSelecionadoId.value = contrato?.id ?? null
}
</script>
