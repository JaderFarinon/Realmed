<template>
  <div ref="root" class="relative">
    <div class="relative">
      <input
        :value="query"
        class="input pr-9"
        :placeholder="placeholder"
        :disabled="disabled"
        role="combobox"
        :aria-expanded="open"
        autocomplete="off"
        @focus="show"
        @input="input"
        @keydown="keydown"
      />
      <button
        v-if="modelValue"
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
        aria-label="Limpar seleção"
        @click="clear"
      >
        ×
      </button>
    </div>
    <div
      v-if="open"
      class="absolute z-999 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg"
      role="listbox"
    >
      <p v-if="loading" class="p-3 text-sm text-gray-500">{{ loadingText }}</p>
      <p v-else-if="!filtered.length" class="p-3 text-sm text-gray-500">Nenhum resultado</p>
      <button
        v-for="(option, index) in filtered"
        :key="getKey(option)"
        type="button"
        class="block w-full px-3 py-2 text-left hover:bg-gray-50"
        :class="index === activeIndex ? 'bg-gray-50' : ''"
        role="option"
        @mouseenter="activeIndex = index"
        @click="choose(option)"
      >
        <slot name="option" :option="option"
          ><span class="block font-medium text-gray-800">{{ getLabel(option) }}</span></slot
        >
      </button>
    </div>
  </div>
</template>
<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = withDefaults(
  defineProps<{
    modelValue: T | null
    options: T[]
    placeholder?: string
    disabled?: boolean
    loading?: boolean
    loadingText?: string
    labelKey?: string
    keyKey?: string
    minChars?: number
    remote?: boolean
  }>(),
  {
    placeholder: 'Selecione...',
    loadingText: 'Carregando...',
    labelKey: 'name',
    keyKey: 'externalId',
    minChars: 0,
  },
)
const emit = defineEmits<{ 'update:modelValue': [value: T | null]; search: [value: string] }>()
const root = ref<HTMLElement>(),
  open = ref(false),
  query = ref(''),
  activeIndex = ref(-1)
const getLabel = (item: T) => String(item?.[props.labelKey] ?? '')
const getKey = (item: T) => String(item?.[props.keyKey] ?? getLabel(item))
const filtered = computed(() =>
  props.remote
    ? props.options
    : props.options.filter((item) =>
        getLabel(item)
          .toLocaleLowerCase('pt-BR')
          .includes(query.value.trim().toLocaleLowerCase('pt-BR')),
      ),
)
watch(
  () => props.modelValue,
  (value) => {
    query.value = value ? getLabel(value) : ''
  },
  { immediate: true },
)
function show() {
  if (!props.disabled && (query.value.trim().length >= props.minChars || !!props.modelValue))
    open.value = true
}
function input(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  emit('update:modelValue', null)
  activeIndex.value = -1
  open.value = query.value.trim().length >= props.minChars
  emit('search', query.value)
}
function choose(option: T) {
  emit('update:modelValue', option)
  query.value = getLabel(option)
  open.value = false
}
function clear() {
  emit('update:modelValue', null)
  query.value = ''
  open.value = false
  emit('search', '')
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
  else if (event.key === 'ArrowDown') {
    event.preventDefault()
    open.value = true
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter' && open.value && activeIndex.value >= 0) {
    event.preventDefault()
    choose(filtered.value[activeIndex.value])
  }
}
function outside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', outside))
onBeforeUnmount(() => document.removeEventListener('mousedown', outside))
</script>
