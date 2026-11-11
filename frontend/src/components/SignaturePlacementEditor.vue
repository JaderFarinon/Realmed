<template>
  <div class="space-y-3">
    <p class="text-gray-500">
      Guia SADT padrão. Arraste a assinatura e use o canto para ajustar o tamanho. As setas do
      teclado também movem a imagem.
    </p>
    <div ref="stage" class="signature-stage" :style="{ aspectRatio: `${W} / ${H}` }">
      <img
        :src="background"
        alt="Guia SADT padrão para posicionamento"
        draggable="false"
        class="signature-background"
      />
      <div
        v-if="image"
        role="button"
        aria-label="Mover assinatura na guia"
        :tabindex="disabled ? -1 : 0"
        class="signature-overlay"
        :style="{
          left: `${(modelValue.x / W) * 100}%`,
          top: `${(modelValue.y / H) * 100}%`,
          width: `${(modelValue.width / W) * 100}%`,
          height: `${(modelValue.height / H) * 100}%`,
        }"
        @pointerdown="start($event, false)"
        @pointermove="move"
        @pointerup="end"
        @pointercancel="end"
        @keydown="key"
      >
        <img :src="image" alt="Assinatura posicionada" draggable="false" />
        <button
          v-if="!disabled"
          type="button"
          aria-label="Redimensionar assinatura"
          class="signature-resize"
          @pointerdown.stop="start($event, true)"
          @pointermove.stop="move"
          @pointerup.stop="end"
          @pointercancel.stop="end"
        >
          ↘
        </button>
      </div>
    </div>
    <p class="text-gray-500">
      Posição a partir do topo: X {{ modelValue.x.toFixed(1) }}, Y {{ modelValue.y.toFixed(1) }} •
      Tamanho {{ modelValue.width.toFixed(1) }} × {{ modelValue.height.toFixed(1) }} pontos.
    </p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import background from '@/assets/sadt-placement-base.png'
const W = 841.92,
  H = 595.32
const props = defineProps<{ modelValue: any; image: string; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: any] }>()
const stage = ref<HTMLElement>()
let drag: any = null
function start(e: PointerEvent, resize: boolean) {
  if (props.disabled || e.button !== 0) return
  e.preventDefault()
  const rect = stage.value!.getBoundingClientRect()
  drag = {
    x: e.clientX,
    y: e.clientY,
    scale: W / rect.width,
    resize,
    initial: { ...props.modelValue },
    target: e.currentTarget,
  }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!drag) return
  const p = { ...drag.initial },
    dx = (e.clientX - drag.x) * drag.scale,
    dy = (e.clientY - drag.y) * drag.scale
  if (drag.resize) {
    const ratio = p.height / p.width
    p.width = Math.max(10, Math.min(p.width + dx, W - p.x, (H - p.y) / ratio))
    p.height = p.width * ratio
  } else {
    p.x = Math.max(0, Math.min(W - p.width, p.x + dx))
    p.y = Math.max(0, Math.min(H - p.height, p.y + dy))
  }
  emit('update:modelValue', p)
}
function end() {
  drag = null
}
function key(e: KeyboardEvent) {
  if (props.disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
  e.preventDefault()
  const p = { ...props.modelValue },
    step = e.shiftKey ? 10 : 1
  p.x = Math.max(
    0,
    Math.min(
      W - p.width,
      p.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0),
    ),
  )
  p.y = Math.max(
    0,
    Math.min(H - p.height, p.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)),
  )
  emit('update:modelValue', p)
}
</script>
<style scoped>
.signature-stage {
  position: relative;
  width: 100%;
  background: white;
  outline: 1px solid #cbd5e1;
}
.signature-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.signature-overlay {
  position: absolute;
  border: 2px dashed #465fff;
  cursor: move;
  touch-action: none;
  user-select: none;
}
.signature-overlay img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.signature-resize {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 28px;
  height: 28px;
  background: white;
  border: 1px solid #465fff;
  cursor: nwse-resize;
  touch-action: none;
  color: #465fff;
}
</style>
