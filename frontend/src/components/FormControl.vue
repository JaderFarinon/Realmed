<template>
  <component
    :is="inputTag"
    :id="id"
    :type="inputTag === 'input' ? type : undefined"
    :rows="inputTag === 'textarea' ? rows : undefined"
    :placeholder="placeholder"
    :value="displayValue"
    :required="required"
    class="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
    @input="onInput"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ModelValue = string | number | null | undefined

const props = defineProps({
  id: String,
  modelValue: [String, Number, null],
  type: {
    type: String,
    default: 'text',
  },
  placeholder: String,
  rows: {
    type: Number,
    default: 3,
  },
  required: Boolean,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
}>()

const inputTag = computed(() => (props.type === 'textarea' ? 'textarea' : 'input'))

const displayValue = computed(() => {
  if (props.type === 'number') {
    return props.modelValue ?? ''
  }
  return props.modelValue ?? ''
})

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement

  if (props.type === 'number') {
    const value = target.value
    emit('update:modelValue', value === '' ? null : Number(value))
    return
  }

  emit('update:modelValue', target.value)
}
</script>
