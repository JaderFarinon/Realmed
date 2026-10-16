<template>
  <div class="table-action-toolbar" role="toolbar" :aria-label="label">
    <button
      v-for="action in actions"
      :key="action.id || action.label"
      type="button"
      class="table-action-button"
      :class="{
        'is-danger': action.variant === 'danger',
        'is-primary': action.variant === 'primary',
      }"
      :title="action.title || action.label"
      :aria-label="action.label"
      :disabled="busy || action.disabled"
      @click="action.onClick()"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="icons[action.icon] || icons.open" />
      </svg>
      <span class="sr-only">{{ action.label }}</span>
    </button>
    <span v-if="selectionLabel" class="table-selection-label" role="status">{{
      selectionLabel
    }}</span>
    <slot />
  </div>
</template>
<script setup lang="ts">
export interface TableAction {
  id?: string
  label: string
  title?: string
  icon: string
  disabled?: boolean
  variant?: 'danger' | 'primary'
  onClick: () => unknown
}
withDefaults(
  defineProps<{
    actions: TableAction[]
    busy?: boolean
    selectionLabel?: string
    label?: string
  }>(),
  { label: 'Ações da listagem' },
)
const icons: Record<string, string> = {
  add: 'M12 5v14M5 12h14',
  edit: 'm16 3 5 5-13 13H3v-5L16 3Zm-2 2 5 5',
  open: 'M8 4H4v16h16v-4M14 4h6v6M20 4 10 14',
  delete: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  refresh: 'M20 7a8 8 0 1 0 1 7M20 3v5h-5',
  toggle: 'M7 6h10a6 6 0 0 1 0 12H7A6 6 0 0 1 7 6Zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
  print: 'M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7',
  copy: 'M8 8h13v13H8V8ZM3 16V3h13',
  check: 'm4 12 5 5L20 6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  photo: 'M3 3h18v18H3V3Zm0 14 6-6 4 4 3-3 5 5M16 7h.01',
  filter: 'M3 4h18l-7 8v7l-4 2v-9L3 4Z',
  save: 'M4 3h14l3 3v15H3V3h1Zm3 0v7h10V3M7 21v-7h10v7',
  close: 'm6 6 12 12M6 18 18 6',
  search: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6',
  file: 'M5 3h9l5 5v13H5V3Zm9 0v6h5M8 13h8M8 17h8',
}
</script>
