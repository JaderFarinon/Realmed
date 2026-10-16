<template>
  <Teleport to="body"
    ><div
      v-if="open"
      class="list-dialog-backdrop"
      @click.self="emit('close')"
      @keydown.esc.stop="emit('close')"
    >
      <section
        ref="dialog"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="list-detail-dialog"
        :class="{ 'is-wide': wide }"
      >
        <header>
          <h2 :id="titleId">{{ title }}</h2>
          <button
            type="button"
            class="table-action-button"
            title="Fechar"
            aria-label="Fechar"
            @click="emit('close')"
          >
            ×
          </button>
        </header>
        <div class="list-dialog-content"><slot /></div>
        <footer v-if="$slots.footer"><slot name="footer" /></footer>
      </section></div
  ></Teleport>
</template>
<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount, useId } from 'vue'
const props = defineProps<{ open: boolean; title: string; wide?: boolean }>(),
  emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLElement | null>(null),
  titleId = useId()
let previous: HTMLElement | null = null
function trapFocus(event: KeyboardEvent) {
  if (!props.open || event.key !== 'Tab') return
  const dialogs = document.querySelectorAll('.list-detail-dialog')
  if (dialogs[dialogs.length - 1] !== dialog.value) return
  const elements = Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
    ) || [],
  ).filter((el) => el.getClientRects().length)
  if (!elements.length) {
    event.preventDefault()
    dialog.value?.focus()
    return
  }
  const first = elements[0]!,
    last = elements[elements.length - 1]!
  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialog.value)
  ) {
    event.preventDefault()
    last.focus()
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || document.activeElement === dialog.value)
  ) {
    event.preventDefault()
    first.focus()
  }
}
watch(
  () => props.open,
  async (open) => {
    if (open) {
      previous = document.activeElement as HTMLElement
      document.addEventListener('keydown', trapFocus)
      await nextTick()
      dialog.value?.focus()
    } else {
      document.removeEventListener('keydown', trapFocus)
      if (previous?.isConnected) previous.focus()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', trapFocus)
  if (previous?.isConnected) previous.focus()
})
</script>
