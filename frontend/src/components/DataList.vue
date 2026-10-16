<template>
  <ListTableFrame
    v-model:page-size="size"
    :row-height="rowHeight"
    :bounded="bounded"
    :embedded="embedded"
  >
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
    <table class="table list-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            :style="column.width ? { width: column.width } : undefined"
            :title="column.label"
            scope="col"
          >
            {{ column.label }}
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
        <tr v-if="loading || !rows.length">
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
        @update:page="changePage"
    /></template>
  </ListTableFrame>
</template>
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, ref, watch } from 'vue'
import ListTableFrame from '@/components/ListTableFrame.vue'
import TableActionToolbar, { type TableAction } from '@/components/TableActionToolbar.vue'
import TablePagination from '@/components/TablePagination.vue'
import { fitPage } from '@/utils/tablePagination'
export interface ListColumn {
  key: string
  label: string
  width?: string
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
    selectable?: boolean
    serverTotal?: number
    page?: number
    allRows?: boolean
    emptyText?: string
    rowClass?: (item: any) => string
  }>(),
  {
    actions: () => [],
    rowKey: 'id',
    selectionKey: 'name',
    rowHeight: 48,
    selectable: true,
    emptyText: 'Nenhum registro encontrado para os filtros aplicados.',
  },
)
const emit = defineEmits<{
  'update:selected': [item: any]
  'update:page': [page: number]
  'update:pageSize': [size: number]
}>()
const size = ref(10),
  localPage = ref(1)
const currentPage = computed(() => props.page ?? localPage.value)
const rows = computed(() =>
  props.loading
    ? []
    : props.serverTotal !== undefined || props.allRows
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
function changePage(page: number) {
  emit('update:selected', null)
  localPage.value = page
  emit('update:page', page)
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
