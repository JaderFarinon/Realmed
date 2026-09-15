<template>
  <div class="flex flex-col gap-2">
    <label v-if="resolvedInit.label" class="text-sm font-medium text-gray-700 dark:text-gray-200">
      {{ resolvedInit.label }}
    </label>
    <textarea
      :value="internalValue"
      class="min-h-[200px] w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-sm transition focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      :placeholder="resolvedInit.placeholder ?? 'Digite o conteúdo do e-mail aqui...'"
      @input="onInput"
    ></textarea>
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Editor rich text não disponível no ambiente atual. Este campo aceita texto simples.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type TinyInit = Record<string, unknown> & {
  label?: string
  placeholder?: string
}

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  init: {
    type: Object as () => TinyInit | undefined,
    default: undefined,
  },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const internalValue = ref(props.modelValue ?? '')

watch(
  () => props.modelValue,
  (value) => {
    const coerced = value ?? ''
    if (coerced !== internalValue.value) {
      internalValue.value = coerced
    }
  }
)

const onInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  const value = target.value
  internalValue.value = value
  emit('update:modelValue', value)
}

const resolvedInit = computed(() => props.init ?? {})
</script>
