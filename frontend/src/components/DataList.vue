<template>
  <ListTableFrame
    :page-size="size"
    @update:page-size="autoSize"
    :row-height="rowHeight"
    :measure-rows="measureRows"
    :loading="loading"
    :bounded="bounded"
    :embedded="embedded"
  >
    <template v-if="$slots.tabs" #tabs><slot name="tabs" /></template>
    <template v-if="$slots.filters" #filters><slot name="filters" /></template>
    <template #actions
      ><TableActionToolbar
        v-if="actions.length || selectable"
        :actions="safeActions"
        :busy="loading"
        :selection-label="
          selected
            ? `Selecionado: ${String(selected[selectionKey] ?? selected[rowKey])}`
            : selectable
              ? 'Selecione uma linha para usar as ações'
              : ''
        " /><slot name="actions"
    /></template>
    <span v-if="loading && rows.length" class="sr-only" role="status">Atualizando...</span>
    <table class="table list-table" :aria-busy="loading || undefined">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="column.width ? { width: column.width } : undefined"
            :title="column.label"
            scope="col"
          >
            <FieldLabel :required="column.required">{{ column.label }}</FieldLabel>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in rows"
          :key="item[rowKey]"
          :tabindex="selectable ? 0 : undefined"
          :aria-selected="selectable ? selected?.[rowKey] === item[rowKey] : undefined"
          :class="rowClass?.(item)"
          @click="select(item, $event)"
          @dblclick="doubleClick(item, $event)"
          @keydown.enter.prevent="select(item, $event)"
          @keydown.space.prevent="select(item, $event)"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            :data-label="column.label"
            :title="String(value(item, column) ?? '')"
          >
            <slot :name="`cell-${column.key}`" :item="item" :value="value(item, column)">{{
              value(item, column) ?? '—'
            }}</slot>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="list-empty" role="status">
            {{ loading ? 'Carregando...' : emptyText }}
          </td>
        </tr>
      </tbody>
    </table>
    <template v-if="!allRows" #pagination
      ><TablePagination
        :page="currentPage"
        :page-size="size"
        :total="serverTotal ?? items.length"
        :loading="loading"
        :page-size-options="pageSizeOptions"
        @update:page="changePage"
        @update:page-size="chooseSize"
    /></template>
  </ListTableFrame>
</template>
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref, watch } from 'vue'
import FieldLabel from '@/components/FieldLabel.vue'
import ListTableFrame from '@/components/ListTableFrame.vue'
import TableActionToolbar, { type TableAction } from '@/components/TableActionToolbar.vue'
import TablePagination from '@/components/TablePagination.vue'
import { fitPage } from '@/utils/tablePagination'
export interface ListColumn {
  key: string
  label: string
  width?: string
  required?: boolean
  format?: (value: any, item: any) => unknown
}
const props = withDefaults(
  defineProps<{
    items: any[]
    columns: ListColumn[]
    actions?: TableAction[]
    selected?: any
    rowKey?: string
    selectionKey?: string
    loading?: boolean
    bounded?: boolean
    embedded?: boolean
    rowHeight?: number
    measureRows?: boolean
    selectable?: boolean
    serverTotal?: number
    page?: number
    allRows?: boolean
    pageSizeOptions?: number[]
    emptyText?: string
    rowClass?: (item: any) => string
  }>(),
  {
    actions: () => [],
    rowKey: 'id',
    selectionKey: 'name',
    rowHeight: 48,
    measureRows: true,
    selectable: true,
    emptyText: 'Nenhum registro encontrado para os filtros aplicados.',
  },
)
const emit = defineEmits<{
  'row-dblclick': [item: any]
  'update:selected': [item: any]
  'update:page': [page: number]
  'update:pageSize': [size: number]
}>()
const size = ref(10),
  localPage = ref(1)
const currentPage = computed(() => props.page ?? localPage.value)
const rows = computed(() =>
  props.serverTotal !== undefined || props.allRows
      ? props.items
      : props.items.slice((localPage.value - 1) * size.value, localPage.value * size.value),
)
const safeActions = computed(() =>
  props.actions.map((a) => ({ ...a, disabled: props.loading || a.disabled })),
)
function value(item: any, column: ListColumn) {
  return column.format ? column.format(item[column.key], item) : item[column.key]
}
function select(item: any, event: Event) {
  if (
    !props.selectable ||
    props.loading ||
    (event.target as HTMLElement).closest('a,button,input,select,textarea')
  )
    return
  emit('update:selected', props.selected?.[props.rowKey] === item[props.rowKey] ? null : item)
}
function doubleClick(item: any, event: MouseEvent) {
  if (
    !props.selectable ||
    props.loading ||
    (event.target as Element).closest('a,button,input,select,textarea')
  )
    return
  emit('row-dblclick', item)
}
function changePage(page: number) {
  emit('update:selected', null)
  localPage.value = page
  emit('update:page', page)
}
function autoSize(value: number) {
  if (!props.pageSizeOptions?.length) size.value = value
}
function chooseSize(value: number) {
  if (!props.pageSizeOptions?.includes(value)) return
  changePage(1)
  size.value = value
}
watch(size, (value) => {
  emit('update:selected', null)
  localPage.value = fitPage(localPage.value, value, props.items.length)
  emit('update:pageSize', value)
})
watch(
  () => props.page,
  () => emit('update:selected', null),
)
watch(
  () => props.items,
  (items) => {
    localPage.value = fitPage(localPage.value, size.value, items.length)
    if (props.selected) {
      const current = items.find((i) => i[props.rowKey] === props.selected[props.rowKey])
      emit('update:selected', current || null)
    }
  },
)
watch(
  () => props.items.map((i) => i[props.rowKey]).join('|'),
  () => {
    if (props.serverTotal === undefined) localPage.value = 1
    emit('update:selected', null)
  },
)
</script>
