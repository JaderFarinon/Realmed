
<template>
  <div class="min-h-[70vh] xl:flex">
    <app-sidebar />
    <Backdrop />
    <div
      class="flex-1 transition-all duration-300 ease-in-out"
      :class="[isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]']"
    >
      <div ref="headerWrapper">
        <app-header />
      </div>
      <div
        class="p-4 max-h-[70vh] w-full md:p-6"
        :style="layoutStyle"
      >
        <slot></slot>
      </div>
    </div>
  </div>

  <InternalChatModal />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import { useSidebar } from '@/composables/useSidebar'
import Backdrop from './Backdrop.vue'
import InternalChatModal from '@/components/chat/InternalChatModal.vue'

const { isExpanded, isHovered, isMobileOpen, isMobile } = useSidebar()

const headerWrapper = ref<HTMLElement | null>(null)
const headerHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

const updateHeaderHeight = () => {
  if (headerWrapper.value) {
    headerHeight.value = headerWrapper.value.offsetHeight
  }
}

onMounted(() => {
  updateHeaderHeight()

  if (typeof window !== 'undefined' && 'ResizeObserver' in window && headerWrapper.value) {
    resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight()
    })

    resizeObserver.observe(headerWrapper.value)
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateHeaderHeight)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && headerWrapper.value) {
    resizeObserver.unobserve(headerWrapper.value)
  }

  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateHeaderHeight)
  }
})

const sidebarWidth = computed(() => {
  if (isMobile.value) {
    return isMobileOpen.value ? 290 : 0
  }

  return isExpanded.value || isHovered.value ? 290 : 90
})

const layoutStyle = computed(() => ({
  '--app-header-height': `${headerHeight.value}px`,
  '--app-sidebar-width': `${sidebarWidth.value}px`,
}))
</script>
