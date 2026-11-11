<template>
  <button
    type="button"
    class="btn-secondary inline-flex items-center justify-center gap-2"
    :disabled="disabled || busy"
    @click="$emit('click')"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="h-4 w-4"
    >
      <path d="M4 3h14l3 3v15H3V3h1Zm3 0v7h10V3M7 21v-7h10v7" />
    </svg>
    {{ busy ? 'Salvando…' : 'Salvar rascunho' }}
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ disabled?: boolean; busy?: boolean }>(), {
  disabled: false,
  busy: false,
})
defineEmits<{ click: [] }>()
</script>
