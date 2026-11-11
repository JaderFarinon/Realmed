<template>
  <PageShell
    title="Estoque — Resumo"
    subtitle="Indicadores de saldos, pedidos e compras no seu contexto de acesso."
  >
    
    <section v-if="legacyImport" class="panel min-w-0">
      <h2 class="section-title">Importação do Estoque Anterior</h2>
      <p class="mt-2 text-sm">
        {{ legacyImport.summary.originalProducts }} produtos originais,
        {{ legacyImport.summary.invoices }} notas e {{ legacyImport.summary.requestItems }} itens de
        pedidos preservados. Saldo inicial: {{ legacyImport.summary.totalQuantity }} unidades.
      </p>
      <p class="mt-2 text-sm">
        {{ legacyImport.summary.recoveredProducts }} produtos excluídos foram recuperados como
        cadastros inativos. {{ legacyImport.summary.recoveredRequests }} pedidos sem cabeçalho estão
        bloqueados até confirmar solicitante e data na edição do pedido.
      </p>
      <p class="mt-2 text-sm">
        Fotos vinculadas: {{ legacyImport.summary.photosCopied || 0 }}. Fotos ausentes:
        {{ legacyImport.summary.photosMissing || 0 }}.
      </p>
      <details class="mt-3">
        <summary>Conferência e ajustes da importação</summary>
        <DataList
          :items="
            legacyImport.summary.warnings.map((row: any, index: number) => ({ ...row, id: index }))
          "
          :columns="importColumns"
          :selectable="false"
          embedded
        />
      </details>
    </section>
    <template v-if="data">
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="card in cards" :key="card.label" class="panel min-w-0">
          <p class="text-sm text-gray-500">{{ card.label }}</p>
          <b class="typography-metric mt-2 block">{{ card.value }}</b>
        </article>
      </section>
      <section class="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <article class="panel min-w-0">
          <h2 class="section-title">Produtos mais consumidos</h2>
          <p v-if="!data.topProducts.length" class="mt-4 text-gray-500">
            Nenhum consumo registrado.
          </p>
          <div v-for="product in data.topProducts" :key="product.name" class="mt-4">
            <div class="flex justify-between text-sm">
              <span>{{ product.name }}</span
              ><b>{{ product.quantity }}</b>
            </div>
            <div class="mt-1 h-2 rounded bg-gray-100">
              <div
                class="h-2 rounded bg-brand-500"
                :style="{
                  width: `${(100 * Number(product.quantity)) / Math.max(...data.topProducts.map((p) => Number(p.quantity)), 1)}%`,
                }"
              />
            </div>
          </div>
        </article>
        <article class="panel min-w-0">
          <h2 class="section-title">Compras por mês</h2>
          <p v-if="!data.monthlyPurchases.length" class="mt-4 text-gray-500">
            Nenhuma nota fiscal com itens.
          </p>
          <DataList
            v-model:selected="selectedMonth"
            :items="data.monthlyPurchases"
            :columns="monthColumns"
            row-key="month"
            selection-key="month"
            embedded
          />
        </article>
      </section>
      <section class="panel min-w-0">
        <h2 class="section-title">Alertas de estoque mínimo</h2>
        <DataList
          v-model:selected="selectedAlert"
          :items="alertRows"
          :columns="alertColumns"
          row-key="_rowKey"
          selection-key="product_name"
          embedded
        />
      </section>
    </template>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import { ref, onMounted, computed } from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
const { authUser } = useAuthUser()
const legacyImport = ref<any>(null)
const importColumns = [
  { key: 'table', label: 'Origem' },
  { key: 'key', label: 'Identificador' },
  { key: 'message', label: 'Conferência' },
]
type Summary = {
  cards: {
    products: number
    zero: number
    belowMinimum: number
    pending: number
    waiting: number
    purchaseValue: number
    purchaseDrafts?: number
    consumptions?: number
  }
  topProducts: Array<{ name: string; quantity: number }>
  monthlyPurchases: Array<{ month: string; total: number }>
  alerts: Array<{
    product_name: string
    sector_name: string
    quantity: number
    minimum_quantity: number
  }>
}
const data = ref<Summary | null>(null),
  error = ref('')
const currency = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const selectedMonth = ref<any>(null),
  selectedAlert = ref<any>(null)
const monthColumns = [
  { key: 'month', label: 'Mês', format: (v: string) => v.split('-').reverse().join('/') },
  { key: 'total', label: 'Total', format: currency },
]
const alertRows = computed(
  () => data.value?.alerts.map((item, index) => ({ ...item, _rowKey: index })) || [],
)
const alertColumns = [
  { key: 'product_name', label: 'Produto' },
  { key: 'sector_name', label: 'Setor' },
  { key: 'quantity', label: 'Saldo' },
  { key: 'minimum_quantity', label: 'Mínimo' },
]
const cards = computed(() =>
  data.value
    ? [
        { label: 'Produtos ativos', value: data.value.cards.products },
        { label: 'Saldos zerados', value: data.value.cards.zero },
        { label: 'No mínimo ou abaixo', value: data.value.cards.belowMinimum },
        { label: 'Pedidos de compra em revisão', value: data.value.cards.purchaseDrafts || 0 },
        { label: 'Requisições para consumo', value: data.value.cards.consumptions || 0 },
        { label: 'Requisições anteriores pendentes', value: data.value.cards.pending },
        { label: 'Requisições anteriores aguardando compra', value: data.value.cards.waiting },
        { label: 'Valor acumulado das compras', value: currency(data.value.cards.purchaseValue) },
      ]
    : [],
)
onMounted(async () => {
  try {
    data.value = (await api.get('/inventory/dashboard')).data
    if (['admin', 'masteradmin'].includes(authUser.value?.role || ''))
      legacyImport.value = (await api.get('/inventory/imports/latest')).data.run || null
  } catch (e) {
    error.value = (e as any).response?.data?.error || 'Não foi possível carregar o resumo.'
  }
})

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
