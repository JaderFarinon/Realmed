<template>
  <PageShell :title="String(route.meta.title)" :subtitle="subtitle" list>
    <p
      v-if="message"
      role="status"
      class="rounded-lg p-3"
      :class="error ? 'bg-error-50 text-error-700' : 'bg-success-50 text-success-700'"
    >
      {{ message }}
    </p>
    <DataList
      v-model:selected="selected"
      :items="filteredRows"
      :columns="listColumns"
      :actions="toolbarActions"
      :loading="loading"
      bounded
      :all-rows="printing"
      :row-class="rowClass"
      selection-key="name"
    >
      <template #filters>
        <div class="list-filter-grid">
          <label class="min-w-48 flex-1 text-sm"
            >Pesquisar<input
              v-model="search"
              class="input mt-1"
              placeholder="Nome, código ou número"
          /></label>
          <label v-if="['saldos', 'relatorios'].includes(mode)" class="text-sm"
            >Setor<select v-model="filters.sector_id" class="input mt-1" @change="load">
              <option value="">
                {{ options.canFilterSectors ? 'Todos os setores' : 'Meu setor' }}
              </option>
              <option v-for="s in options.sectors" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select></label
          >
          <template v-if="mode === 'saldos'">
            <label class="text-sm"
              >Categoria<select v-model="filters.category_id" class="input mt-1" @change="load">
                <option value="">Todas</option>
                <option v-for="c in options.categories" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select></label
            >
            <label class="text-sm"
              ><input v-model="filters.show_zero" type="checkbox" @change="load" /> Mostrar
              zerados</label
            >
            <label class="text-sm"
              ><input v-model="filters.alert_only" type="checkbox" @change="load" /> Somente
              alertas</label
            >
          </template>
          <template v-if="mode === 'relatorios'">
            <label class="text-sm"
              >Produto<select v-model="filters.product_id" class="input mt-1" @change="load">
                <option value="">Todos</option>
                <option v-for="p in options.products" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select></label
            >
            <label class="text-sm"
              >De<input
                v-model="filters.from"
                class="input mt-1"
                type="date"
                @change="load" /></label
            ><label class="text-sm"
              >Até<input v-model="filters.to" class="input mt-1" type="date" @change="load"
            /></label>
            <label class="text-sm"
              >Movimentação<select v-model="filters.kind" class="input mt-1" @change="load">
                <option value="">Todas</option>
                <option v-for="(label, key) in movementLabels" :key="key" :value="key">
                  {{ label }}
                </option>
              </select></label
            >
          </template>
          <label v-if="mode === 'pedidos'" class="text-sm"
            >Status<select v-model="filters.status" class="input mt-1" @change="load">
              <option value="">Todos</option>
              <option v-for="(label, key) in statusLabels" :key="key" :value="key">
                {{ label }}
              </option>
            </select></label
          >
          <label v-if="catalog" class="text-sm"
            >Situação<select v-model="filters.active" class="input mt-1" @change="load">
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select></label
          >
        </div>
        <div v-if="mode === 'saldos'" class="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span
            >Com saldo: <b>{{ rows.filter((r) => Number(r.quantity) > 0).length }}</b></span
          ><span
            >No mínimo ou abaixo:
            <b>{{
              rows.filter(
                (r) =>
                  Number(r.minimum_quantity) > 0 &&
                  Number(r.quantity) <= Number(r.minimum_quantity),
              ).length
            }}</b></span
          ><span
            >Zerados: <b>{{ rows.filter((r) => Number(r.quantity) === 0).length }}</b></span
          >
        </div></template
      >
    </DataList>
    <ListDetailDialog
      :open="Boolean(detail)"
      :title="detail ? (mode === 'pedidos' ? 'Pedido #' : 'Nota fiscal #') + detail.id : 'Detalhes'"
      wide
      @close="detail = null"
      ><div v-if="detail" class="space-y-4">
        <p v-if="detail.notes" class="text-sm">{{ detail.notes }}</p>

        <DataList
          v-model:selected="selectedItem"
          :items="detail.items"
          :columns="detailColumns"
          :actions="itemActions"
          selection-key="product_name"
          :row-height="64"
          ><template #cell-product_name="{ item }"
            ><b>{{ item.product_name }}</b
            ><small v-if="item.notes" class="block text-gray-500">{{ item.notes }}</small></template
          ></DataList
        >
        <div v-if="mode === 'notas-fiscais'" class="flex items-center justify-between">
          <b>Total: {{ currency(detail.total) }}</b
          ><button
            v-if="!detail.closed && can('canEdit')"
            class="btn-primary"
            :disabled="!detail.items.length || busy"
            @click="closeInvoice"
          >
            Fechar nota fiscal
          </button>
        </div>
      </div></ListDetailDialog
    >
    <ListDetailDialog
      :open="editing"
      :title="
        mode === 'saldos'
          ? 'Ajustar saldo do setor'
          : form.id
            ? 'Editar cadastro'
            : mode === 'pedidos'
              ? 'Novo pedido'
              : mode === 'notas-fiscais'
                ? 'Nova nota fiscal'
                : 'Novo cadastro'
      "
      @close="editing = false"
    >
      <form class="space-y-4" @submit.prevent="save">
        <p v-if="formError" role="alert" class="text-error-700">{{ formError }}</p>
        <div class="grid gap-4 md:grid-cols-2">
          <template v-if="catalog"
            ><label class="md:col-span-2"
              >{{ mode === 'fornecedores' ? 'Razão social' : 'Nome'
              }}<input v-model="form.name" class="input" maxlength="150" required
            /></label>
            <template v-if="mode === 'produtos'"
              ><label
                >Código<input
                  v-model="form.code"
                  class="input"
                  maxlength="40"
                  placeholder="Gerado automaticamente"
                  :required="Boolean(form.id)" /></label
              ><label
                >Quantidade mínima<input
                  v-model.number="form.minimum_quantity"
                  class="input"
                  type="number"
                  min="0"
                  step="1"
                  required /></label
              ><label
                >Categoria<select v-model="form.category_id" class="input" required>
                  <option value="">Selecione</option>
                  <option v-for="c in options.categories" :key="c.id" :value="c.id">
                    {{ c.name }}
                  </option>
                </select></label
              ><label
                >Apresentação<select v-model="form.presentation_id" class="input" required>
                  <option value="">Selecione</option>
                  <option v-for="a in options.presentations" :key="a.id" :value="a.id">
                    {{ a.name }}
                  </option>
                </select></label
              ><label class="md:col-span-2"
                >Foto (até 2 MB)<input
                  class="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  @change="selectPhoto" /></label
              ><label class="md:col-span-2"
                >Ou URL pública da foto<input
                  v-model="photoUrl"
                  type="url"
                  class="input"
                  placeholder="https://..." /></label
            ></template>
            <template v-else-if="mode === 'fornecedores'"
              ><label>CNPJ<input v-model="form.cnpj" class="input" maxlength="20" /></label
              ><label>Telefone<input v-model="form.phone" class="input" maxlength="30" /></label
              ><label
                >E-mail<input
                  v-model="form.email"
                  type="email"
                  class="input"
                  maxlength="150" /></label
              ><label
                >Nome do contato<input
                  v-model="form.contact_name"
                  class="input"
                  maxlength="150" /></label
            ></template>
            <label v-else class="md:col-span-2"
              >Descrição<textarea v-model="form.description" class="input" />
            </label>
            <label><input v-model="form.active" type="checkbox" /> Ativo</label>
          </template>
          <template v-else-if="mode === 'saldos'"
            ><label
              >Produto<select v-model="form.product_id" class="input" required>
                <option value="">Selecione</option>
                <option v-for="p in options.products" :key="p.id" :value="p.id">
                  {{ p.name }}
                </option>
              </select></label
            ><label
              >Setor<select v-model="form.sector_id" class="input" required>
                <option value="">Selecione</option>
                <option v-for="s in options.sectors" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select></label
            ><label
              >Saldo correto<input
                v-model.number="form.quantity"
                class="input"
                type="number"
                min="0"
                step="1"
                required /></label
            ><label>Motivo do ajuste<input v-model="form.notes" class="input" required /></label
          ></template>
          <template v-else-if="mode === 'pedidos'"
            ><label
              >Solicitante<select v-model="form.requester_id" class="input" required>
                <option value="">Selecione</option>
                <option v-for="u in options.users" :key="u.id" :value="u.id">
                  {{ u.name || u.username }}
                </option>
              </select></label
            ><label
              >Data do pedido<input
                v-model="form.request_date"
                class="input"
                type="date"
                required /></label
            ><label class="md:col-span-2"
              >Observações<textarea v-model="form.notes" class="input" />
            </label>
            <p class="text-sm text-gray-500 md:col-span-2">
              O setor será o setor cadastrado do solicitante. Salve e depois adicione os itens.
            </p></template
          >
          <template v-else-if="mode === 'notas-fiscais'"
            ><label
              >Número<input v-model="form.number" class="input" maxlength="80" required /></label
            ><label
              >Data da nota<input
                v-model="form.invoice_date"
                class="input"
                type="date"
                required /></label
            ><label
              >Fornecedor<select v-model="form.supplier_id" class="input" required>
                <option value="">Selecione</option>
                <option v-for="s in options.suppliers" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select></label
            ><label
              >Setor de recebimento<select v-model="form.sector_id" class="input" required>
                <option value="">Selecione</option>
                <option v-for="s in options.sectors" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select></label
            ><label class="md:col-span-2"
              >Observações<textarea v-model="form.notes" class="input" />
            </label>
            <p class="text-sm text-gray-500 md:col-span-2">
              Os itens entram no saldo ao serem adicionados. Fechar a nota bloqueia alterações.
            </p></template
          >
        </div>
        <footer class="flex justify-end gap-3">
          <button class="btn-secondary" type="button" :disabled="busy" @click="editing = false">
            Cancelar</button
          ><button class="btn-primary" :disabled="busy">
            {{ busy ? 'Salvando...' : 'Salvar' }}
          </button>
        </footer>
      </form></ListDetailDialog
    >
    <ListDetailDialog
      :open="itemFormOpen && Boolean(detail)"
      :title="itemForm.id ? 'Editar item' : 'Adicionar item'"
      @close="itemFormOpen = false"
    >
      <form class="grid gap-4 md:grid-cols-2" @submit.prevent="saveItem">
        <label class="md:col-span-2"
          >Produto<select v-model="itemForm.product_id" class="input" required>
            <option value="">Selecione</option>
            <option v-for="p in options.products" :key="p.id" :value="p.id">
              {{ p.code }} — {{ p.name }}
            </option>
          </select></label
        >
        <label
          >Quantidade<input
            v-model.number="itemForm.quantity"
            class="input"
            type="number"
            min="1"
            step="1"
            required
        /></label>
        <label v-if="mode === 'notas-fiscais'"
          >Valor unitário (R$)<input
            v-model="itemForm.unit_price"
            class="input"
            type="number"
            min="0"
            step="0.01"
            required
        /></label>
        <label v-else>Observações<input v-model="itemForm.notes" class="input" /></label>
        <div class="flex items-end gap-2">
          <button class="btn-primary" :disabled="busy">
            {{ itemForm.id ? 'Salvar item' : 'Adicionar item' }}</button
          ><button v-if="itemForm.id" type="button" class="btn-secondary" @click="resetItem">
            Cancelar
          </button>
        </div>
      </form></ListDetailDialog
    >
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
const route = useRoute(),
  { canOperational, authUser } = useAuthUser()
const mode = computed(() => String(route.meta.inventory)),
  moduleKey = computed(() => String(route.meta.module))
const apiNames: Record<string, string> = {
  saldos: 'stock',
  produtos: 'products',
  fornecedores: 'suppliers',
  setores: 'sectors',
  categorias: 'categories',
  apresentacoes: 'presentations',
  'notas-fiscais': 'invoices',
  pedidos: 'requests',
  relatorios: 'reports',
}
const endpoint = computed(() => `/inventory/${apiNames[mode.value]}`)
const catalog = computed(() =>
  ['produtos', 'fornecedores', 'setores', 'categorias', 'apresentacoes'].includes(mode.value),
)
const subtitle = computed(() =>
  mode.value === 'saldos'
    ? 'Saldos por produto e setor, com alertas de quantidade mínima.'
    : mode.value === 'pedidos'
      ? 'Solicitação, atendimento parcial e acompanhamento de compras.'
      : mode.value === 'notas-fiscais'
        ? 'Recebimento de produtos e movimentação do estoque.'
        : mode.value === 'relatorios'
          ? 'Histórico de entradas, consumo e ajustes por setor.'
          : 'Cadastros do módulo de estoque.',
)
const rows = ref<any[]>([]),
  options = reactive<any>({
    products: [],
    sectors: [],
    categories: [],
    presentations: [],
    suppliers: [],
    users: [],
    profile: {},
    canFilterSectors: false,
  })
const filters = reactive<any>({
  sector_id: '',
  category_id: '',
  show_zero: false,
  alert_only: false,
  active: '',
  product_id: '',
  from: '',
  to: '',
  kind: '',
  status: '',
})
const search = ref(''),
  page = ref(1),
  loading = ref(false),
  busy = ref(false),
  editing = ref(false),
  message = ref(''),
  error = ref(false),
  formError = ref(''),
  form = reactive<any>({}),
  detail = ref<any>(null),
  photo = ref<File | null>(null),
  photoUrl = ref('')
const itemForm = reactive<any>({
  id: null,
  product_id: '',
  quantity: 1,
  unit_price: '0.00',
  notes: '',
})
const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  PARCIALMENTE_ATENDIDO: 'Parcialmente atendido',
  AGUARDANDO_COMPRA: 'Aguardando compra',
  ATENDIDO: 'Atendido',
}
const movementLabels: Record<string, string> = {
  RECEIPT: 'Entrada por nota fiscal',
  INVOICE_EDIT: 'Alteração de nota fiscal',
  INVOICE_REMOVAL: 'Remoção de item da nota',
  FULFILLMENT: 'Atendimento de pedido',
  ADJUSTMENT: 'Ajuste de saldo',
}
const columnSets: Record<string, Array<[string, string]>> = {
  saldos: [
    ['code', 'Código'],
    ['name', 'Produto'],
    ['category_name', 'Categoria'],
    ['presentation_name', 'Apresentação'],
    ['quantity', 'Saldo'],
    ['minimum_quantity', 'Mínimo'],
  ],
  produtos: [
    ['code', 'Código'],
    ['name', 'Nome'],
    ['category_name', 'Categoria'],
    ['presentation_name', 'Apresentação'],
    ['minimum_quantity', 'Mínimo'],
    ['active', 'Situação'],
  ],
  fornecedores: [
    ['name', 'Razão social'],
    ['cnpj', 'CNPJ'],
    ['phone', 'Telefone'],
    ['email', 'E-mail'],
    ['contact_name', 'Contato'],
    ['active', 'Situação'],
  ],
  setores: [
    ['name', 'Nome'],
    ['description', 'Descrição'],
    ['active', 'Situação'],
  ],
  categorias: [
    ['name', 'Nome'],
    ['active', 'Situação'],
  ],
  apresentacoes: [
    ['name', 'Nome'],
    ['active', 'Situação'],
  ],
  pedidos: [
    ['id', 'Código'],
    ['request_date', 'Data'],
    ['requester_name', 'Solicitante'],
    ['sector_name', 'Setor'],
    ['status', 'Status'],
    ['total_items', 'Itens'],
    ['requested_quantity', 'Solicitada'],
    ['fulfilled_quantity', 'Atendida'],
  ],
  'notas-fiscais': [
    ['number', 'Número'],
    ['invoice_date', 'Data'],
    ['supplier_name', 'Fornecedor'],
    ['sector_name', 'Setor'],
    ['closed', 'Situação'],
  ],
  relatorios: [
    ['created_at', 'Data'],
    ['product_name', 'Produto'],
    ['sector_name', 'Setor'],
    ['kind', 'Movimentação'],
    ['delta', 'Quantidade'],
    ['balance_after', 'Saldo após'],
    ['username', 'Responsável'],
    ['notes', 'Observação'],
  ],
}
const columns = computed(() => columnSets[mode.value]!.map(([key, label]) => ({ key, label })))
const filteredRows = computed(() =>
  rows.value.filter((row) =>
    columns.value.some((c) =>
      String(cell(row, c.key))
        .toLocaleLowerCase('pt-BR')
        .includes(search.value.toLocaleLowerCase('pt-BR')),
    ),
  ),
)
const printing = ref(false)
const pages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / 25))),
  pagedRows = computed(() =>
    printing.value
      ? filteredRows.value
      : filteredRows.value.slice((page.value - 1) * 25, page.value * 25),
  )
const can = (action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete') =>
  canOperational(moduleKey.value, action)
const currency = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatDate = (v: any) => {
  const d = String(v || '')
    .slice(0, 10)
    .split('-')
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : '—'
}
const today = () => new Date().toLocaleDateString('sv-SE')
function cell(row: any, key: string): any {
  if (key === 'active') return row.active ? 'Ativo' : 'Inativo'
  if (key === 'closed') return row.closed ? 'Fechada' : 'Aberta'
  if (key === 'status') return statusLabels[row[key]] || row[key]
  if (key === 'kind') return movementLabels[row[key]] || row[key]
  if (key.endsWith('_date') || key === 'created_at') return formatDate(row[key])
  if (key === 'requester_name') return row[key] || row.username
  return row[key] ?? '—'
}
function reportError(e: any) {
  error.value = true
  message.value = e.response?.data?.error || 'Não foi possível concluir a operação.'
}
async function load() {
  loading.value = true
  page.value = 1
  try {
    rows.value = (
      await api.get(endpoint.value, {
        params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
      })
    ).data
  } catch (e) {
    reportError(e)
  } finally {
    loading.value = false
  }
}
async function loadOptions() {
  Object.assign(options, (await api.get('/inventory/options')).data)
}
function edit(row?: any) {
  for (const key of Object.keys(form)) delete form[key]
  Object.assign(
    form,
    {
      active: true,
      code: '',
      minimum_quantity: 0,
      category_id: '',
      presentation_id: '',
      product_id: row?.id || '',
      sector_id:
        filters.sector_id ||
        options.profile.sector_id ||
        options.sectors.find((s: any) => s.name === 'Geral')?.id ||
        '',
      quantity: row && filters.sector_id ? Number(row.quantity) : 0,
      notes: '',
      requester_id: authUser.value?.id,
      request_date: today(),
      invoice_date: today(),
      supplier_id: '',
      number: '',
    },
    row || {},
  )
  if (row && mode.value === 'saldos') {
    delete form.id
    form.product_id = row.id
  }
  photo.value = null
  photoUrl.value = ''
  for (const dateKey of ['request_date', 'invoice_date']) {
    if (form[dateKey]) form[dateKey] = String(form[dateKey]).slice(0, 10)
  }
  formError.value = ''
  editing.value = true
}
async function save() {
  busy.value = true
  formError.value = ''
  try {
    const saved =
      mode.value === 'saldos'
        ? (await api.post('/inventory/stock/adjust', form)).data
        : (
            await api[form.id ? 'put' : 'post'](
              form.id ? `${endpoint.value}/${form.id}` : endpoint.value,
              form,
            )
          ).data
    if (mode.value === 'produtos' && (photo.value || photoUrl.value)) {
      try {
        const file =
          photo.value ||
          new File(
            [
              (
                await api.post(
                  '/inventory/photo-from-url',
                  { url: photoUrl.value },
                  { responseType: 'blob' },
                )
              ).data,
            ],
            'produto',
          )
        await uploadPhoto(saved.id, file)
      } catch (e) {
        form.id = saved.id
        await loadOptions()
        await load()
        formError.value =
          'Produto salvo. Não foi possível enviar a foto; selecione novamente ou feche este formulário.'
        return
      }
    }
    editing.value = false
    message.value = 'Registro salvo.'
    error.value = false
    await loadOptions()
    await load()
    if (['pedidos', 'notas-fiscais'].includes(mode.value)) await openDetail(saved)
  } catch (e) {
    formError.value = (e as any).response?.data?.error || 'Não foi possível salvar.'
  } finally {
    busy.value = false
  }
}
async function remove(row: any) {
  if (
    !window.confirm(
      catalog.value
        ? 'Inativar este cadastro? O histórico será preservado.'
        : 'Excluir este pedido sem atendimento?',
    )
  )
    return
  try {
    await api.delete(`${endpoint.value}/${row.id}`)
    await loadOptions()
    await load()
  } catch (e) {
    reportError(e)
  }
}
async function openDetail(row: any) {
  try {
    detail.value = (await api.get(`${endpoint.value}/${row.id}`)).data
    resetItem()
    selectedItem.value = null
    itemFormOpen.value = false
  } catch (e) {
    reportError(e)
  }
}
function resetItem() {
  Object.assign(itemForm, { id: null, product_id: '', quantity: 1, unit_price: '0.00', notes: '' })
}
function editItem(item: any) {
  Object.assign(itemForm, item, { quantity: item.requested_quantity || item.quantity })
}
async function saveItem() {
  busy.value = true
  try {
    const data =
      mode.value === 'pedidos'
        ? {
            product_id: itemForm.product_id,
            requested_quantity: itemForm.quantity,
            notes: itemForm.notes,
          }
        : {
            product_id: itemForm.product_id,
            quantity: itemForm.quantity,
            unit_price: itemForm.unit_price,
          }
    const url = `${endpoint.value}/${detail.value.id}/items${itemForm.id ? `/${itemForm.id}` : ''}`
    await api[itemForm.id ? 'put' : 'post'](url, data)
    await openDetail(detail.value)
    await load()
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}
async function removeItem(item: any) {
  if (!window.confirm('Excluir este item? Na nota fiscal, o saldo recebido será estornado.')) return
  try {
    await api.delete(`${endpoint.value}/${detail.value.id}/items/${item.id}`)
    await openDetail(detail.value)
    await load()
  } catch (e) {
    reportError(e)
  }
}
async function fulfill(item: any) {
  const value = window.prompt(
    `Quantidade a atender de ${item.product_name}. Pendente: ${item.requested_quantity - item.fulfilled_quantity}`,
    String(item.requested_quantity - item.fulfilled_quantity),
  )
  if (value === null) return
  try {
    const data = (
      await api.post(`${endpoint.value}/${detail.value.id}/items/${item.id}/fulfill`, {
        quantity: Number(value),
      })
    ).data
    error.value = !data.ok
    message.value = data.message
    await openDetail(detail.value)
    await load()
  } catch (e) {
    reportError(e)
  }
}
async function waitPurchase(item: any) {
  try {
    await api.post(`${endpoint.value}/${detail.value.id}/items/${item.id}/wait`)
    await openDetail(detail.value)
    await load()
  } catch (e) {
    reportError(e)
  }
}
async function closeInvoice() {
  if (!window.confirm('Fechar a nota fiscal e bloquear novas alterações?')) return
  busy.value = true
  try {
    await api.post(`${endpoint.value}/${detail.value.id}/close`)
    await openDetail(detail.value)
    await load()
  } catch (e) {
    reportError(e)
  } finally {
    busy.value = false
  }
}
function selectPhoto(event: Event) {
  photo.value = (event.target as HTMLInputElement).files?.[0] || null
}
async function uploadPhoto(id: number, file: File) {
  if (file.size > 2 * 1024 * 1024) throw new Error('Foto deve ter até 2 MB.')
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  const ratio = Math.min(120 / bitmap.width, 120 / bitmap.height, 1)
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Foto inválida.'))), 'image/png'),
  )
  await api.post(`/inventory/products/${id}/photo`, blob, {
    headers: { 'Content-Type': 'image/png', 'X-File-Name': 'produto.png' },
  })
}
async function viewPhoto(row: any) {
  try {
    const blob = (await api.get(`/inventory/products/${row.id}/photo`, { responseType: 'blob' }))
      .data
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (e) {
    reportError(e)
  }
}
const selected = ref<any>(null),
  selectedItem = ref<any>(null),
  itemFormOpen = ref(false)
const listColumns = computed(() =>
  columns.value.map((c) => ({ ...c, format: (_value: any, row: any) => cell(row, c.key) })),
)
const rowClass = (row: any) =>
  mode.value === 'saldos' &&
  Number(row.minimum_quantity) > 0 &&
  Number(row.quantity) <= Number(row.minimum_quantity)
    ? 'bg-warning-50'
    : ''
const toolbarActions = computed(() => [
  ...(mode.value !== 'saldos' && mode.value !== 'relatorios'
    ? [
        {
          icon: 'add',
          label:
            mode.value === 'pedidos'
              ? 'Novo pedido'
              : mode.value === 'notas-fiscais'
                ? 'Nova nota fiscal'
                : 'Novo cadastro',
          variant: 'primary' as const,
          disabled: !can('canCreate'),
          onClick: () => edit(),
        },
      ]
    : []),
  ...(['pedidos', 'notas-fiscais'].includes(mode.value)
    ? [
        {
          icon: 'open',
          label: 'Abrir selecionado',
          disabled: !selected.value,
          onClick: () => selected.value && openDetail(selected.value),
        },
      ]
    : []),
  ...(mode.value !== 'relatorios'
    ? [
        {
          icon: 'edit',
          label: mode.value === 'saldos' ? 'Ajustar saldo selecionado' : 'Editar selecionado',
          disabled:
            !selected.value ||
            !can('canEdit') ||
            selected.value.closed ||
            selected.value.status === 'ATENDIDO',
          onClick: () => selected.value && edit(selected.value),
        },
      ]
    : []),
  ...(catalog.value || mode.value === 'pedidos'
    ? [
        {
          icon: 'delete',
          label: catalog.value ? 'Inativar selecionado' : 'Excluir selecionado',
          variant: 'danger' as const,
          disabled:
            !selected.value ||
            !can('canDelete') ||
            (catalog.value ? !selected.value.active : selected.value.status !== 'PENDENTE'),
          onClick: () => selected.value && remove(selected.value),
        },
      ]
    : []),
  ...(mode.value === 'produtos'
    ? [
        {
          icon: 'photo',
          label: 'Visualizar foto',
          disabled: !selected.value?.photo_path,
          onClick: () => selected.value && viewPhoto(selected.value),
        },
      ]
    : []),
  { icon: 'download', label: 'Exportar CSV', onClick: () => exportData('csv') },
  { icon: 'file', label: 'Exportar Excel', onClick: () => exportData('xls') },
  { icon: 'copy', label: 'Copiar tabela', onClick: copyData },
  { icon: 'print', label: 'Imprimir / PDF', onClick: () => print() },
  { icon: 'refresh', label: 'Atualizar', onClick: load },
])
const detailColumns = computed(() => [
  { key: 'product_name', label: 'Produto' },
  {
    key: 'quantity',
    label: mode.value === 'pedidos' ? 'Solicitada' : 'Quantidade',
    format: (_v: any, row: any) => row.requested_quantity || row.quantity,
  },
  {
    key: 'fulfilled_quantity',
    label: mode.value === 'pedidos' ? 'Atendida' : 'Valor unitário',
    format: (_v: any, row: any) =>
      mode.value === 'pedidos' ? row.fulfilled_quantity : currency(row.unit_price),
  },
  {
    key: 'status',
    label: mode.value === 'pedidos' ? 'Status' : 'Subtotal',
    format: (_v: any, row: any) =>
      mode.value === 'pedidos' ? statusLabels[row.status] : currency(row.quantity * row.unit_price),
  },
])
const itemActions = computed(() => [
  {
    icon: 'add',
    label: 'Adicionar item',
    variant: 'primary' as const,
    disabled:
      !detail.value ||
      detail.value.closed ||
      detail.value.status === 'ATENDIDO' ||
      !can('canCreate'),
    onClick: () => {
      resetItem()
      itemFormOpen.value = true
    },
  },
  {
    icon: 'edit',
    label: 'Editar item selecionado',
    disabled:
      !selectedItem.value ||
      Boolean(selectedItem.value.fulfilled_quantity) ||
      detail.value?.closed ||
      detail.value?.status === 'ATENDIDO' ||
      !can('canEdit'),
    onClick: () => {
      if (selectedItem.value) {
        editItem(selectedItem.value)
        itemFormOpen.value = true
      }
    },
  },
  ...(mode.value === 'pedidos'
    ? [
        {
          icon: 'check',
          label: 'Atender item selecionado',
          disabled:
            !selectedItem.value ||
            selectedItem.value.status === 'ATENDIDO' ||
            !canOperational('inventory_fulfillment', 'canEdit'),
          onClick: () => selectedItem.value && fulfill(selectedItem.value),
        },
        {
          icon: 'clock',
          label: 'Marcar item como aguardando compra',
          disabled:
            !selectedItem.value ||
            selectedItem.value.status === 'ATENDIDO' ||
            !canOperational('inventory_fulfillment', 'canEdit'),
          onClick: () => selectedItem.value && waitPurchase(selectedItem.value),
        },
      ]
    : []),
  {
    icon: 'delete',
    label: 'Excluir item selecionado',
    variant: 'danger' as const,
    disabled:
      !selectedItem.value ||
      Boolean(selectedItem.value.fulfilled_quantity) ||
      detail.value?.closed ||
      !can('canDelete'),
    onClick: () => selectedItem.value && removeItem(selectedItem.value),
  },
])
watch(mode, () => {
  selected.value = null
  selectedItem.value = null
  itemFormOpen.value = false
})
const print = async () => {
  printing.value = true
  await nextTick()
  window.print()
  printing.value = false
}
const beforePrint = () => {
  printing.value = true
}
const afterPrint = () => {
  printing.value = false
}
window.addEventListener('beforeprint', beforePrint)
window.addEventListener('afterprint', afterPrint)
onBeforeUnmount(() => {
  window.removeEventListener('beforeprint', beforePrint)
  window.removeEventListener('afterprint', afterPrint)
})
function exportData(type: 'csv' | 'xls') {
  const vals = [
    columns.value.map((c) => c.label),
    ...filteredRows.value.map((r) => columns.value.map((c) => String(cell(r, c.key)))),
  ]
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safe = (v: string) => (/^[=+@-]/.test(v) ? `'${v}` : v)
  const content =
    type === 'csv'
      ? '\ufeff' +
        vals.map((r) => r.map((v) => `"${safe(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
      : '\ufeff<html><meta charset="utf-8"><table>' +
        vals
          .map((r) => '<tr>' + r.map((v) => `<td>${esc(safe(v))}</td>`).join('') + '</tr>')
          .join('') +
        '</table></html>'
  const url = URL.createObjectURL(
    new Blob([content], {
      type: type === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.ms-excel',
    }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `realmed-${mode.value}.${type}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
async function copyData() {
  try {
    await navigator.clipboard.writeText(
      [
        columns.value.map((c) => c.label).join('\t'),
        ...filteredRows.value.map((r) => columns.value.map((c) => cell(r, c.key)).join('\t')),
      ].join('\n'),
    )
    message.value = 'Tabela copiada.'
    error.value = false
  } catch {
    message.value = 'Não foi possível acessar a área de transferência.'
    error.value = true
  }
}
watch(search, () => {
  page.value = 1
})
watch(mode, async () => {
  detail.value = null
  editing.value = false
  message.value = ''
  search.value = ''
  Object.assign(filters, {
    sector_id: '',
    category_id: '',
    show_zero: false,
    alert_only: false,
    active: '',
    product_id: '',
    from: '',
    to: '',
    kind: '',
    status: '',
  })
  try {
    await loadOptions()
    await load()
  } catch (e) {
    reportError(e)
  }
})
onMounted(async () => {
  try {
    await loadOptions()
    await load()
  } catch (e) {
    reportError(e)
  }
})
</script>
<style scoped>
label {
  display: block;
  min-width: 0;
  font-size: 0.875rem;
  color: #475467;
}
.input {
  display: block;
  width: 100%;
  min-width: 0;
  margin-top: 0.375rem;
}
th {
  background: #f9fafb;
  font-weight: 600;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
@media print {
  :deep(aside),
  :deep(header.flex.h-16) {
    display: none;
  }
  :deep(.lg\:pl-64) {
    padding-left: 0;
  }
  table {
    font-size: 10px;
  }
}
</style>
