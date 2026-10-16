<template>
  <div>
    <button
      type="button"
      class="menu-group-toggle"
      :class="{ 'is-active': active }"
      :aria-expanded="!collapsed"
      :aria-controls="panelId"
      :title="`${collapsed ? 'Expandir' : 'Recolher'} ${label}`"
      @click="toggle"
    >
      <span>{{ label }}</span>
      <svg
        class="menu-group-chevron"
        :class="{ 'is-collapsed': collapsed }"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <div v-show="!collapsed" :id="panelId" class="space-y-1"><slot /></div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ id: string; label: string; active?: boolean }>()
const panelId = `realmed-menu-group-${props.id}`
const storageKey = `realmed_menu_group_${props.id}`
const collapsed = ref(localStorage.getItem(storageKey) === 'true')
function persist() {
  localStorage.setItem(storageKey, String(collapsed.value))
}
function toggle() {
  collapsed.value = !collapsed.value
  persist()
}
watch(
  () => props.active,
  (active) => {
    if (active) {
      collapsed.value = false
      persist()
    }
  },
)
</script>
<style scoped>
.menu-group-toggle {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  color: #667085;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  text-align: left;
}
.menu-group-toggle:hover,
.menu-group-toggle.is-active {
  background: #ecf3ff;
  color: #465fff;
}
.menu-group-toggle:focus-visible {
  outline: 2px solid #465fff;
  outline-offset: 2px;
}
.menu-group-chevron {
  flex: none;
}
.menu-group-chevron.is-collapsed {
  transform: rotate(-90deg);
}
:global(.dark) .menu-group-toggle {
  color: #d0d5dd;
}
:global(.dark) .menu-group-toggle:hover,
:global(.dark) .menu-group-toggle.is-active {
  background: #1d2939;
  color: #a4bcfd;
}
</style>
