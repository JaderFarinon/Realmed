<template>
  <button
    v-show="visible"
    type="button"
    class="back-to-top"
    title="Ir ao topo"
    aria-label="Ir ao topo"
    @click="goToTop"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 12 6-6 6 6M12 6v12"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const visible = ref(false)
const update = () => {
  visible.value = window.scrollY > 240
}

function goToTop() {
  document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  })
}

onMounted(() => {
  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', update)
  window.removeEventListener('resize', update)
})
</script>

<style scoped>
.back-to-top {
  position: fixed;
  right: max(4px, env(safe-area-inset-right, 0px));
  bottom: max(4px, env(safe-area-inset-bottom, 0px));
  z-index: 20;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: white;
  cursor: pointer;
}
.back-to-top::before {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: var(--color-brand-600);
  box-shadow: 0 2px 7px rgb(16 24 40 / 22%);
  content: '';
}
.back-to-top svg {
  position: relative;
}
.back-to-top:hover {
  color: white;
}
.back-to-top:hover::before {
  background: var(--color-brand-700);
}
.back-to-top:focus-visible {
  outline: 3px solid var(--color-brand-300);
  outline-offset: 3px;
}
@media print {
  .back-to-top {
    display: none !important;
  }
}
</style>
