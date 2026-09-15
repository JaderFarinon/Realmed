<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100000] flex flex-col items-end gap-3 px-4">
    <TransitionGroup name="toast">
      <div
        v-for="toast in state.toasts"
        :key="toast.id"
        class="pointer-events-auto flex min-w-[260px] max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-theme-xl"
        :class="typeClasses[toast.type]"
      >
        <div class="flex-1 text-sm">
          {{ toast.message }}
        </div>
        <button type="button" class="text-xs font-semibold opacity-80 transition hover:opacity-100" @click="remove(toast.id)">
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToast, useToastState } from '@/composables/useToast'

const { remove } = useToast()
const state = useToastState()

const typeClasses = computed(() => ({
  success: 'bg-emerald-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  warning: 'bg-amber-400 text-gray-900',
}))
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
