<template>
  <button
    type="button"
    :class="[
      'inline-flex items-center justify-center w-8 h-8 border rounded transition',
      disabled
        ? 'cursor-not-allowed opacity-50'
        : 'hover:bg-gray-50 dark:hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
    ]"
    @click="handleClick"
    :disabled="disabled"
    :title="title"
    :aria-disabled="disabled || undefined"
    :aria-label="ariaLabel"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

interface Props {
  title?: string
  ariaLabel?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits(['click'])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>
