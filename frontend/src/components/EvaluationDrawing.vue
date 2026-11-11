<template>
  <div>
    <div v-if="!signature" class="mb-2 flex flex-wrap gap-2">
      <button
        v-for="item in kinds"
        :key="item.value"
        type="button"
        class="btn-secondary"
        :aria-pressed="kind === item.value"
        :disabled="disabled"
        @click="kind = item.value"
      >
        {{ item.label }}
      </button>
    </div>
    <svg
      ref="surface"
      class="drawing"
      :class="{ signature }"
      :viewBox="signature ? '0 0 1000 300' : '0 0 1417 1199'"
      role="img"
      :aria-label="
        signature
          ? 'Área para assinatura ou rubrica'
          : 'Mapa corporal: toque para marcar dor, limitação ou atenção'
      "
      @pointerdown="start"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="cancel"
    >
      <image v-if="!signature" :href="bodyMap" width="1417" height="1199" />
      <template v-if="signature">
        <polyline
          v-for="(stroke, i) in modelValue"
          :key="i"
          :points="stroke.map((p: any) => `${p.x * 1000},${p.y * 300}`).join(' ')"
          fill="none"
          stroke="#1d2939"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>
      <template v-else>
        <g v-for="(point, i) in modelValue" :key="i">
          <circle
            :cx="point.x * 1417"
            :cy="point.y * 1199"
            r="17"
            :fill="colors[point.kind]"
            stroke="white"
            stroke-width="3"
          />
          <text
            :x="point.x * 1417"
            :y="point.y * 1199 + 6"
            text-anchor="middle"
            fill="white"
            font-size="19"
          >
            {{ i + 1 }}
          </text>
        </g>
      </template>
    </svg>
    <p class="mt-2 text-sm text-gray-600">
      {{
        signature
          ? 'Assine com o dedo ou a caneta. A rubrica é salva junto à avaliação.'
          : 'Selecione o tipo e toque no mapa. Vermelho: dor; azul: limitação; laranja: atenção.'
      }}
    </p>
    <div class="mt-2 flex gap-2">
      <button
        type="button"
        class="btn-secondary history-button"
        :title="signature ? 'Desfazer traço' : 'Desfazer marcação'"
        :aria-label="signature ? 'Desfazer traço' : 'Desfazer marcação'"
        :disabled="disabled || !undoHistory.length"
        @click="undo"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M9 4 4 9l5 5M4 9h9a7 7 0 0 1 0 14" transform="translate(0 -2)" />
        </svg>
      </button>
      <button
        type="button"
        class="btn-secondary history-button"
        :title="signature ? 'Refazer traço' : 'Refazer marcação'"
        :aria-label="signature ? 'Refazer traço' : 'Refazer marcação'"
        :disabled="disabled || !redoHistory.length"
        @click="redo"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m15 4 5 5-5 5m5-5h-9a7 7 0 0 0 0 14" transform="translate(0 -2)" />
        </svg></button
      ><button
        type="button"
        class="btn-secondary"
        :disabled="disabled || !modelValue.length"
        @click="commit([])"
      >
        Limpar {{ signature ? 'rubrica' : 'mapa' }}
      </button>
    </div>
    <ol v-if="!signature && modelValue.length" class="mt-2 text-sm">
      <li v-for="(p, i) in modelValue" :key="i">
        {{ i + 1 }}. {{ kinds.find((k) => k.value === p.kind)?.label }}
      </li>
    </ol>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import bodyMap from '@/assets/evaluation-body-map.png'
const props = defineProps<{ modelValue: any[]; signature?: boolean; disabled?: boolean }>()
const emit = defineEmits(['update:modelValue'])
const surface = ref<SVGSVGElement>(),
  kind = ref('PAIN')
const kinds = [
  { value: 'PAIN', label: 'Dor' },
  { value: 'LIMITATION', label: 'Limitação' },
  { value: 'ATTENTION', label: 'Atenção' },
]
const colors: Record<string, string> = {
  PAIN: '#dc2626',
  LIMITATION: '#2563eb',
  ATTENTION: '#d97706',
}
const clone = (value: any[]) => JSON.parse(JSON.stringify(value))
const undoHistory = ref<any[][]>(
  props.modelValue.map((_, index) => clone(props.modelValue.slice(0, index))),
)
const redoHistory = ref<any[][]>([])
let expected = JSON.stringify(props.modelValue)
function publish(value: any[]) {
  expected = JSON.stringify(value)
  emit('update:modelValue', value)
}
function commit(value: any[]) {
  undoHistory.value.push(clone(props.modelValue))
  if (undoHistory.value.length > 300) undoHistory.value.shift()
  redoHistory.value = []
  publish(value)
}
function undo() {
  if (props.disabled || pointer !== null || !undoHistory.value.length) return
  redoHistory.value.push(clone(props.modelValue))
  publish(undoHistory.value.pop()!)
}
function redo() {
  if (props.disabled || pointer !== null || !redoHistory.value.length) return
  undoHistory.value.push(clone(props.modelValue))
  publish(redoHistory.value.pop()!)
}
watch(
  () => props.modelValue,
  (value) => {
    const serialized = JSON.stringify(value)
    if (serialized !== expected) {
      undoHistory.value = value.map((_, index) => clone(value.slice(0, index)))
      redoHistory.value = []
      expected = serialized
    }
  },
  { deep: true, flush: 'sync' },
)
let pointer: number | null = null
let origin = { x: 0, y: 0 },
  moved = false
const point = (e: PointerEvent) => {
  const r = surface.value!.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
    y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
  }
}
function start(e: PointerEvent) {
  if (props.disabled || pointer !== null) return
  if (!props.signature) {
    pointer = e.pointerId
    origin = { x: e.clientX, y: e.clientY }
    moved = false
    surface.value!.setPointerCapture(e.pointerId)
    return
  }
  e.preventDefault()
  if (props.modelValue.length >= 200) return
  pointer = e.pointerId
  surface.value!.setPointerCapture(e.pointerId)
  commit([...props.modelValue, [point(e)]])
}
function move(e: PointerEvent) {
  if (pointer !== e.pointerId) return
  if (!props.signature) {
    moved ||= Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 8
    return
  }
  const rows = props.modelValue.map((s) => [...s])
  if (rows[rows.length - 1].length < 2000) {
    rows[rows.length - 1].push(point(e))
    publish(rows)
  }
}
function end(e: PointerEvent) {
  if (pointer !== e.pointerId) return
  if (
    !props.signature &&
    !props.disabled &&
    !moved &&
    Math.hypot(e.clientX - origin.x, e.clientY - origin.y) <= 8 &&
    props.modelValue.length < 300
  )
    commit([...props.modelValue, { ...point(e), kind: kind.value }])
  pointer = null
}
function cancel() {
  pointer = null
}
</script>
<style scoped>
.drawing {
  display: block;
  width: 100%;
  max-width: 760px;
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  background: white;
  touch-action: pan-y;
  user-select: none;
  aspect-ratio: 1417/1199;
}
.drawing.signature {
  aspect-ratio: 10/3;
  touch-action: none;
  max-width: 100%;
}
.history-button {
  min-width: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
button {
  min-height: 48px;
}
button[aria-pressed='true'] {
  border-color: #2563eb;
  background: #eff6ff;
}
</style>
