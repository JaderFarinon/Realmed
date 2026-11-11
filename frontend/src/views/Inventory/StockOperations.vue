<template>
  <PageShell
    :title="purchase ? 'Pedidos de Compra' : 'Requisições para Consumo'"
    :subtitle="
      purchase
        ? 'Pedidos editáveis para revisão de compras; não movimentam o estoque.'
        : 'Registre os itens que está retirando. A confirmação reduz o saldo do setor.'
    "
    list
  >
    
    <DataList
      v-model:selected="selected"
      :items="filtered"
      :columns="columns"
      :actions="actions"
      :loading="loading"
      bounded
      selection-key="id"
    >
      <template #filters
        ><div class="list-filter-grid">
          <label class="filter-search"
            >Pesquisar<input
              v-model="search"
              class="input"
              placeholder="Número, solicitante ou setor" /></label
          ><button class="btn-secondary" @click="search = ''">Limpar</button>
        </div></template
      >
    </DataList>
    <ListDetailDialog
      :open="editorOpen"
      :title="
        automatic
          ? 'Gerar pedido pelo estoque mínimo'
          : editingId
            ? (purchase ? 'Pedido de compra #' : 'Requisição de consumo #') + editingId
            : purchase
              ? 'Novo pedido de compra'
              : 'Nova requisição para consumo'
      "
      wide
      @close="!busy && (editorOpen = false)"
    >
      <form class="operation-form space-y-4" @submit.prevent="save">
        <p v-if="purchase">
          {{
            automatic
              ? 'Cria um rascunho com produtos ativos cujo saldo no setor esteja igual ou abaixo do mínimo. Sugestão: mínimo menos saldo, pelo menos uma unidade. Após gerar, revise e altere os itens e quantidades.'
              : 'Confira e ajuste os produtos e quantidades. Salvar este pedido não baixa nem repõe estoque. A entrada continua pela nota fiscal.'
          }}
        </p>
        <p v-else>
          O solicitante é o usuário logado. Ao registrar, todos os itens serão baixados do setor
          selecionado. Se faltar saldo para algum item, nenhuma retirada será aplicada.
        </p>
        <fieldset :disabled="busy || Boolean(editingId)" class="grid gap-4 md:grid-cols-2">
          <label
            ><FieldLabel :required="true">Setor</FieldLabel
            ><select
              v-model="sectorId"
              aria-label="Setor"
              class="input"
              required
              @change="loadOptions"
            >
              <option v-for="item in options.sectors" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select></label
          >
          <p v-if="editingId">Registrado em {{ date(detailCreated) }}</p>
        </fieldset>
        <label
          >Observações<textarea
            v-model="notes"
            class="input"
            maxlength="5000"
            :disabled="busy || readOnly"
          />
        </label>
        <template v-if="!automatic">
          <div v-if="!readOnly" class="grid items-end gap-3 md:grid-cols-[1fr_8rem_auto]">
            <label
              ><FieldLabel :required="true">Produto</FieldLabel
              ><SearchableSelect
                v-model="selectedProduct"
                :options="searchableProducts"
                label-key="searchLabel"
                key-key="id"
                aria-label="Produto"
                placeholder="Digite o nome ou código do material"
                :disabled="busy"
              >
                <template #option="{ option }">
                  <span class="block font-medium">{{ option.code }} · {{ option.name }}</span>
                  <span class="block text-gray-500"
                    >Saldo: {{ option.balance }} · Mínimo: {{ option.minimum_quantity }}</span
                  >
                </template>
              </SearchableSelect></label
            >
            <label
              ><FieldLabel :required="true">Quantidade</FieldLabel
              ><input
                v-model.number="quantity"
                class="input"
                type="number"
                min="1"
                step="1"
                :disabled="busy"
            /></label>
            <button
              class="btn-secondary"
              type="button"
              :disabled="busy || !productId"
              @click="addItem"
            >
              Adicionar à lista
            </button>
          </div>
          <DataList
            v-model:selected="selectedItem"
            :items="items"
            :columns="itemColumns"
            :actions="itemActions"
            embedded
            selection-key="product_name"
            row-key="product_id"
          >
            <template #cell-quantity="{ item, value }"
              ><span v-if="readOnly">{{ value }}</span
              ><input
                v-else
                v-model.number="item.quantity"
                class="input"
                type="number"
                min="1"
                step="1"
                :disabled="busy"
                :aria-label="'Quantidade de ' + item.product_name"
            /></template>
          </DataList>
        </template>
        
        <div class="flex flex-wrap justify-end gap-3">
          <button type="button" class="btn-secondary" :disabled="busy" @click="editorOpen = false">
            Fechar</button
          ><button
            v-if="!readOnly"
            class="btn"
            :disabled="busy || optionsLoading || (!automatic && !items.length)"
          >
            {{
              busy
                ? 'Salvando…'
                : automatic
                  ? 'Gerar rascunho para revisão'
                  : purchase
                    ? 'Salvar pedido de compra'
                    : 'Registrar retirada e baixar estoque'
            }}
          </button>
        </div>
      </form>
    </ListDetailDialog>
  </PageShell>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
const route = useRoute(),
  { canOperational } = useAuthUser(),
  purchase = computed(() => route.meta.module === 'inventory_purchase_orders'),
  moduleKey = computed(() => String(route.meta.module)),
  endpoint = computed(() => (purchase.value ? 'purchase-orders' : 'consumptions'))
const rows = ref<any[]>([]),
  selected = ref<any>(null),
  search = ref(''),
  loading = ref(false),
  message = ref(''),
  error = ref(false),
  editorOpen = ref(false),
  automatic = ref(false),
  editingId = ref<number | null>(null),
  revision = ref(0),
  detailCreated = ref(''),
  options = ref<any>({ products: [], sectors: [] }),
  sectorId = ref<number | string>(''),
  optionsLoading = ref(false),
  items = ref<any[]>([]),
  selectedItem = ref<any>(null),
  productId = ref<number | string>(''),
  quantity = ref(1),
  notes = ref(''),
  formError = ref(''),
  busy = ref(false),
  requestKey = ref('')
const readOnly = computed(() =>
  editingId.value
    ? !purchase.value || !canOperational(moduleKey.value, 'canEdit')
    : !canOperational(moduleKey.value, 'canCreate'),
)
const date = (value: string) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const searchableProducts = computed(() =>
  options.value.products.map((item: any) => ({
    ...item,
    searchLabel: `${item.code} · ${item.name}`,
  })),
)
const selectedProduct = computed({
  get: () =>
    searchableProducts.value.find((item: any) => item.id === Number(productId.value)) || null,
  set: (item: any) => {
    productId.value = item?.id || ''
  },
})
const columns = computed(() => [
  { key: 'id', label: 'Número' },
  { key: 'created_at', label: 'Registrado em', format: date },
  { key: 'requester_name', label: 'Solicitante' },
  { key: 'sector_name', label: 'Setor' },
  ...(purchase.value
    ? [
        {
          key: 'source',
          label: 'Origem',
          format: (v: string) => (v === 'MINIMUM' ? 'Estoque mínimo' : 'Manual'),
        },
        { key: 'status', label: 'Situação', format: () => 'Rascunho para revisão' },
      ]
    : []),
  { key: 'notes', label: 'Observações' },
])
const itemColumns = computed(() => [
  { key: 'code', label: 'Código' },
  { key: 'product_name', label: 'Produto' },
  { key: 'quantity', label: 'Quantidade', required: true },
  ...(purchase.value
    ? [
        { key: 'balance_snapshot', label: 'Saldo ao gerar', format: (v: any) => v ?? '—' },
        { key: 'minimum_snapshot', label: 'Mínimo ao gerar', format: (v: any) => v ?? '—' },
      ]
    : []),
])
const filtered = computed(() =>
  rows.value.filter((row) =>
    [row.id, row.requester_name, row.sector_name, row.notes].some((v) =>
      String(v || '')
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    ),
  ),
)
const actions = computed(() => [
  {
    icon: 'add',
    label: purchase.value ? 'Novo pedido de compra' : 'Nova requisição para consumo',
    variant: 'primary' as const,
    disabled: !canOperational(moduleKey.value, 'canCreate'),
    onClick: () => openNew(false),
  },
  ...(purchase.value
    ? [
        {
          icon: 'copy',
          label: 'Gerar pedido automático pelo estoque mínimo',
          disabled: !canOperational(moduleKey.value, 'canCreate'),
          onClick: () => openNew(true),
        },
      ]
    : []),
  {
    icon: 'open',
    label: 'Abrir selecionado',
    disabled: !selected.value,
    onClick: () => selected.value && openExisting(selected.value.id),
  },
  ...(purchase.value
    ? [
        {
          icon: 'edit',
          label: 'Editar pedido de compra selecionado',
          disabled: !selected.value || !canOperational(moduleKey.value, 'canEdit'),
          onClick: () => selected.value && openExisting(selected.value.id),
        },
      ]
    : []),
  { icon: 'refresh', label: 'Atualizar', onClick: load },
])
const itemActions = computed(() =>
  readOnly.value
    ? []
    : [
        {
          icon: 'delete',
          label: 'Remover item selecionado',
          disabled: busy.value || !selectedItem.value,
          onClick: () => {
            items.value = items.value.filter(
              (item) => item.product_id !== selectedItem.value.product_id,
            )
            selectedItem.value = null
          },
        },
      ],
)
async function loadOptions() {
  optionsLoading.value = true
  formError.value = ''
  try {
    const data = (
      await api.get('/inventory/' + endpoint.value + '-options', {
        params: sectorId.value ? { sector_id: sectorId.value } : {},
      })
    ).data
    options.value = data
    sectorId.value = data.sector_id
  } catch (e: any) {
    options.value = { products: [], sectors: [] }
    formError.value = e.response?.data?.error || 'Não foi possível carregar os produtos.'
  } finally {
    optionsLoading.value = false
  }
}
async function load() {
  loading.value = true
  selected.value = null
  try {
    rows.value = (await api.get('/inventory/' + endpoint.value)).data
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível carregar os registros.'
  } finally {
    loading.value = false
  }
}
async function openNew(auto: boolean) {
  editingId.value = null
  revision.value = 0
  automatic.value = auto
  items.value = []
  selectedItem.value = null
  notes.value = ''
  productId.value = ''
  quantity.value = 1
  sectorId.value = ''
  requestKey.value = crypto.randomUUID()
  formError.value = ''
  editorOpen.value = true
  await loadOptions()
}
async function openExisting(id: number) {
  formError.value = ''
  try {
    const detail = (await api.get('/inventory/' + endpoint.value + '/' + id)).data
    editingId.value = id
    revision.value = detail.revision || 0
    detailCreated.value = detail.created_at
    sectorId.value = detail.sector_id
    notes.value = detail.notes || ''
    items.value = detail.items
    automatic.value = false
    selectedItem.value = null
    editorOpen.value = true
    await loadOptions()
  } catch (e: any) {
    error.value = true
    message.value = e.response?.data?.error || 'Não foi possível abrir o registro.'
  }
}
function addItem() {
  const product = options.value.products.find((p: any) => p.id === Number(productId.value))
  if (!product) return
  if (!Number.isSafeInteger(quantity.value) || quantity.value < 1) {
    formError.value = 'Informe uma quantidade inteira positiva.'
    return
  }
  if (items.value.some((row) => row.product_id === product.id)) {
    formError.value = 'Produto já incluído. Altere sua quantidade na lista.'
    return
  }
  items.value.push({
    id: product.id,
    product_id: product.id,
    code: product.code,
    product_name: product.name,
    quantity: quantity.value,
  })
  productId.value = ''
  quantity.value = 1
  formError.value = ''
}
async function save() {
  if (busy.value || readOnly.value) return
  busy.value = true
  formError.value = ''
  let committed = false
  try {
    const payload = {
      sector_id: Number(sectorId.value),
      notes: notes.value,
      request_key: requestKey.value,
      revision: revision.value,
      items: items.value.map((row) => ({ product_id: row.product_id, quantity: row.quantity })),
    }
    const response = editingId.value
      ? await api.put('/inventory/purchase-orders/' + editingId.value, payload)
      : await api.post(
          '/inventory/' + endpoint.value + (automatic.value ? '/automatic' : ''),
          payload,
        )
    committed = true
    editorOpen.value = false
    error.value = false
    message.value = purchase.value
      ? 'Pedido #' + response.data.id + ' salvo em rascunho. Revise os itens antes de comprar.'
      : 'Retirada #' + response.data.id + ' registrada. Estoque atualizado.'
    const auto = automatic.value
    await load()
    if (auto) await openExisting(response.data.id)
  } catch (e: any) {
    if (committed) {
      editorOpen.value = false
      error.value = true
      message.value =
        'Registro salvo. Atualize a lista para consultar; não é necessário registrar novamente.'
    } else formError.value = e.response?.data?.error || 'Não foi possível salvar.'
  } finally {
    busy.value = false
  }
}
watch(
  () => route.path,
  () => {
    editorOpen.value = false
    message.value = ''
    search.value = ''
    load()
  },
)
onMounted(load)

useFeedback(() => unwrapNoticeValue(message), () => unwrapNoticeValue(error) ? 'error' : 'success')
useFeedback(() => unwrapNoticeValue(formError), () => 'error')
</script>
<style scoped>
.operation-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}
.operation-form .input {
  width: 100%;
  min-width: 0;
}
</style>
