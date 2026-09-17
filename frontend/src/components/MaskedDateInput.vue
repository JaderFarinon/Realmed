<template>
  <input
    :value="displayValue"
    class="input w-full min-w-0"
    inputmode="numeric"
    maxlength="10"
    placeholder="dd/mm/aaaa"
    @input="onInput"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const typed = ref('')

const fromIso = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}
const displayValue = computed(() => typed.value || fromIso(props.modelValue))

watch(
  () => props.modelValue,
  () => {
    typed.value = ''
  },
)

function mask(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')
}
function validIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return ''
  const [, day, month, year] = match
  const candidate = new Date(`${year}-${month}-${day}T12:00:00`)
  return candidate.getFullYear() === Number(year) &&
    candidate.getMonth() + 1 === Number(month) &&
    candidate.getDate() === Number(day)
    ? `${year}-${month}-${day}`
    : ''
}
function onInput(event: Event) {
  typed.value = mask((event.target as HTMLInputElement).value)
  emit('update:modelValue', validIso(typed.value))
}
function onBlur() {
  if (!validIso(typed.value)) typed.value = fromIso(props.modelValue)
}
</script>
