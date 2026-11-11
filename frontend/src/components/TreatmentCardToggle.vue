<template>
  <button
    type="button"
    class="btn-secondary treatment-card-toggle"
    :aria-expanded="open"
    :aria-controls="controls"
    :aria-label="description"
    :title="description"
    @click="$emit('toggle')"
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path :d="open ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'" />
    </svg>
  </button>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ open: boolean; label: string; controls: string }>()
defineEmits(['toggle'])
const description = computed(() => `${props.open ? 'Recolher' : 'Expandir'} ${props.label}`)
</script>
