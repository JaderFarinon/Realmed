<template>
  <Transition name="notification">
    <div
      v-if="show"
      class="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-sm shadow-theme-xl"
      :class="variantClasses"
    >
      <span>{{ message }}</span>
      <button
        type="button"
        class="rounded-md px-2 py-1 text-xs font-semibold transition hover:bg-black/10 hover:text-inherit"
        @click="$emit('close')"
      >
        Fechar
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'success' | 'error' | 'info' | 'warning'

const props = withDefaults(
  defineProps<{ show: boolean; type?: Variant; message: string }>(),
  {
    type: 'info',
  },
)

defineEmits(['close'])

const variantClasses = computed(() => {
  const base = 'text-white'
  switch (props.type) {
    case 'success':
      return `${base} bg-emerald-500`
    case 'error':
      return `${base} bg-red-500`
    case 'warning':
      return `${base} bg-amber-500 text-gray-900`
    default:
      return `${base} bg-blue-500`
  }
})
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
