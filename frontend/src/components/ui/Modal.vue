<template>
  <div
    class="fixed inset-0 z-[100000] flex w-full items-stretch justify-center px-4 py-6"
    :style="modalBoundsStyle"
  >
    <div
      v-if="modalProps.fullScreenBackdrop"
      class="absolute inset-0 z-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
      aria-hidden="true"
      @click="$emit('close')"
    ></div>
    <div
      class="relative z-10 flex h-full w-full items-start justify-center overflow-hidden sm:items-center"
      :style="scrollAreaStyle"
    >
      <slot name="body">
        <slot></slot>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, withDefaults, defineProps } from 'vue'

interface ModalProps {
  fullScreenBackdrop?: boolean
  fullViewport?: boolean
}

const modalProps = withDefaults(defineProps<ModalProps>(), {
  fullScreenBackdrop: false,
  fullViewport: false,
})
defineEmits(['close'])

let bodyOriginalOverflow: string | null = null
let openModalCount = 0

const lockBodyScroll = () => {
  if (typeof window === 'undefined') return
  const body = window.document.body

  if (openModalCount === 0) {
    bodyOriginalOverflow = body.style.overflow
    body.style.overflow = 'hidden'
  }

  openModalCount += 1
}

const unlockBodyScroll = () => {
  if (typeof window === 'undefined') return
  const body = window.document.body

  openModalCount = Math.max(0, openModalCount - 1)

  if (openModalCount === 0) {
    body.style.overflow = bodyOriginalOverflow ?? ''
    bodyOriginalOverflow = null
  }
}

onMounted(() => {
  lockBodyScroll()
})

onBeforeUnmount(() => {
  unlockBodyScroll()
})

const modalBoundsStyle = computed(() => ({
  top: modalProps.fullViewport ? '0px' : 'var(--app-header-height, 0px)',
  left: modalProps.fullViewport ? '0px' : 'var(--app-sidebar-width, 0px)',
  width: modalProps.fullViewport
    ? '100vw'
    : 'calc(100vw - var(--app-sidebar-width, 0px))',
  height: modalProps.fullViewport
    ? '100vh'
    : 'calc(100vh - var(--app-header-height, 0px))',
}))

const scrollAreaStyle = computed(() => ({
  width: '100%',
  height: '100%',
}))
</script>
