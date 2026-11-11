<template>
  <article class="panel billing-chart">
    <header class="billing-chart-heading">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
      <button class="billing-chart-data" :aria-label="`Ver dados de ${title}`" @click="open = true">
        Ver dados
      </button>
    </header>
    <p v-if="!displayRows.length || !total" class="billing-chart-empty">{{ emptyText }}</p>
    <div v-else-if="kind === 'donut'" class="billing-donut-layout">
      <svg viewBox="0 0 240 240" role="img" :aria-label="title">
        <title>{{ title }}: {{ total }} {{ unit }}</title>
        <circle cx="120" cy="120" r="87" fill="none" stroke="#edf2f7" stroke-width="34" />
        <circle
          v-for="(row, i) in slices"
          :key="row.label"
          cx="120"
          cy="120"
          r="87"
          fill="none"
          :stroke="colors[i % colors.length]"
          stroke-width="34"
          :stroke-dasharray="`${(row.value / total) * circumference} ${circumference}`"
          :stroke-dashoffset="(-row.offset / total) * circumference"
          transform="rotate(-90 120 120)"
        >
          <title>
            {{ row.label }}: {{ row.value }} ({{ ((100 * row.value) / total).toFixed(1) }}%)
          </title>
        </circle>
        <text x="120" y="112" text-anchor="middle" class="billing-chart-muted">
          {{ centerLabel }}
        </text>
        <text
          v-for="row in slices.filter((row) => row.value / total >= 0.08)"
          :key="`percent-${row.label}`"
          :x="slicePoint(row).x"
          :y="slicePoint(row).y"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          class="billing-chart-percent"
        >
          {{ ((row.value / total) * 100).toFixed(1) }}%
        </text>
        <text x="120" y="140" text-anchor="middle" class="billing-chart-total">
          {{ total.toLocaleString('pt-BR') }}
        </text>
      </svg>
      <ul class="billing-chart-legend">
        <li v-for="(row, i) in slices" :key="row.label">
          <span
            class="billing-chart-dot"
            :style="{ background: colors[i % colors.length] }"
          /><span>{{ row.label }}</span
          ><b>{{ row.value.toLocaleString('pt-BR') }}</b>
        </li>
      </ul>
    </div>
    <svg v-else class="billing-cartesian" viewBox="0 0 640 246" role="img" :aria-label="title">
      <title>
        {{ title }}: {{ displayRows.map((row) => `${row.label}: ${row.value}`).join('; ') }}
      </title>
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#20b8c7" stop-opacity=".36" />
          <stop offset="100%" stop-color="#20b8c7" stop-opacity=".04" />
        </linearGradient>
      </defs>
      <g v-for="tick in [0, 1, 2, 3, 4]" :key="tick">
        <line
          x1="44"
          x2="626"
          :y1="202 - tick * 44"
          :y2="202 - tick * 44"
          stroke="#e8eef3"
          stroke-dasharray="3 5"
        />
        <text x="34" :y="206 - tick * 44" text-anchor="end" class="billing-chart-muted">
          {{ Math.round((maximum * tick) / 4).toLocaleString('pt-BR') }}
        </text>
      </g>
      <template v-if="kind === 'bar'">
        <g v-for="(row, i) in plotted" :key="row.label">
          <rect
            :x="44 + i * step + step * 0.2"
            :y="202 - (row.value / maximum) * 176"
            :width="step * 0.6"
            :height="(row.value / maximum) * 176"
            rx="4"
            fill="#21b8c8"
          >
            <title>{{ row.label }}: {{ row.value }}</title>
          </rect>
          <text
            :x="44 + (i + 0.5) * step"
            :y="194 - (row.value / maximum) * 176"
            text-anchor="middle"
            class="billing-chart-value"
          >
            {{ row.value }}
          </text>
        </g>
      </template>
      <template v-else>
        <path :d="`${line} L ${lastX} 202 L ${firstX} 202 Z`" :fill="`url(#${gradientId})`" />
        <path :d="line" fill="none" stroke="#18b2c3" stroke-width="3" stroke-linejoin="round" />
        <circle
          v-for="(row, i) in plotted"
          :key="row.label"
          :cx="x(i)"
          :cy="202 - (row.value / maximum) * 176"
          r="3"
          fill="#18b2c3"
        >
          <title>{{ row.label }}: {{ row.value }}</title>
        </circle>
        <text
          v-for="(row, i) in plotted"
          :key="`value-${row.label}`"
          :x="x(i)"
          :y="192 - (row.value / maximum) * 176"
          :text-anchor="i === 0 ? 'start' : i === plotted.length - 1 ? 'end' : 'middle'"
          class="billing-chart-value"
          stroke="white"
          stroke-width="3"
          paint-order="stroke"
        >
          {{ row.value.toLocaleString('pt-BR') }}
        </text>
      </template>
      <text
        v-for="(row, i) in plotted"
        v-show="
          i %
            Math.ceil(
              plotted.length / (plotted.some((item) => item.label.includes(' a ')) ? 3 : 5),
            ) ===
            0 || i === plotted.length - 1
        "
        :key="row.label"
        :x="kind === 'bar' ? 44 + (i + 0.5) * step : x(i)"
        y="226"
        :text-anchor="
          kind === 'bar'
            ? 'middle'
            : i === 0
              ? 'start'
              : i === plotted.length - 1
                ? 'end'
                : 'middle'
        "
        class="billing-chart-muted"
      >
        {{ row.label }}
      </text>
    </svg>
    <ListDetailDialog :open="open" :title="title" @close="open = false"
      ><DataList
        :items="displayRows"
        :columns="[
          { key: 'label', label: 'Grupo' },
          { key: 'value', label: 'Quantidade' },
        ]"
        row-key="label"
        :selectable="false"
        embedded
    /></ListDetailDialog>
  </article>
</template>
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
const props = withDefaults(
  defineProps<{
    title: string
    description: string
    rows: Array<{ label: string; value: number }>
    kind: 'bar' | 'area' | 'donut'
    unit?: string
    centerLabel?: string
    emptyText?: string
  }>(),
  { unit: 'registros', centerLabel: 'Total', emptyText: 'Nenhum registro no período.' },
)
const open = ref(false),
  gradientId = `billing-gradient-${useId()}`,
  circumference = 2 * Math.PI * 87
const colors = ['#09b4c6', '#285b86', '#497ca3', '#88abc5', '#bad1e1', '#0d2132']
// Monthly buckets use their first day as reference; keep the full year everywhere.
const dateLabel = (label: string): string => {
  if (label.includes(' a ')) return label.split(' a ').map(dateLabel).join(' a ')
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(label)
  return match ? `${match[3] || '01'}/${match[2]}/${match[1]}` : label
}
const displayRows = computed(() =>
  props.rows.map((row) => ({ ...row, label: dateLabel(row.label) })),
)
const total = computed(() => props.rows.reduce((sum, row) => sum + Number(row.value), 0))
const slices = computed(() => {
  const sorted = [...displayRows.value].sort((a, b) => b.value - a.value)
  const rows =
    sorted.length > 6
      ? [
          ...sorted.slice(0, 5),
          { label: 'Outros', value: sorted.slice(5).reduce((sum, row) => sum + row.value, 0) },
        ]
      : sorted
  let offset = 0
  return rows.map((row) => {
    const result = { ...row, offset }
    offset += row.value
    return result
  })
})
const plotted = computed(() => {
  if (displayRows.value.length <= 24) return displayRows.value
  const size = Math.ceil(displayRows.value.length / 24)
  return Array.from({ length: Math.ceil(displayRows.value.length / size) }, (_, i) => {
    const group = displayRows.value.slice(i * size, (i + 1) * size)
    return {
      label: `${group[0].label} a ${group[group.length - 1].label}`,
      value: group.reduce((sum, row) => sum + row.value, 0),
    }
  })
})
const maximum = computed(() =>
  Math.max(4, Math.ceil(Math.max(0, ...plotted.value.map((row) => row.value)) / 4) * 4),
)
const step = computed(() => 582 / Math.max(1, plotted.value.length))
const x = (i: number) =>
  plotted.value.length === 1 ? 335 : 44 + (i * 582) / (plotted.value.length - 1)
const firstX = computed(() => x(0)),
  lastX = computed(() => x(plotted.value.length - 1))
const line = computed(() =>
  plotted.value
    .map((row, i) => {
      const y = 202 - (row.value / maximum.value) * 176
      if (!i) return `M ${x(i)} ${y}`
      const middle = (x(i - 1) + x(i)) / 2
      return `C ${middle} ${202 - (plotted.value[i - 1].value / maximum.value) * 176} ${middle} ${y} ${x(i)} ${y}`
    })
    .join(' '),
)
const slicePoint = (row: { offset: number; value: number }) => {
  const angle = ((row.offset + row.value / 2) / total.value) * Math.PI * 2 - Math.PI / 2
  return { x: 120 + 87 * Math.cos(angle), y: 120 + 87 * Math.sin(angle) }
}
</script>
<style scoped>
.billing-chart {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}
.billing-chart-heading {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: flex-start;
}
.billing-chart-heading h2 {
  font-size: var(--realmed-text-size);
  font-weight: 600;
}
.billing-chart-heading p,
.billing-chart-data {
  color: #8798a9;
  font-size: var(--realmed-help-size);
}
.billing-chart-data {
  white-space: nowrap;
  color: #44677e;
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid #e3ebf2;
  border-radius: 6px;
}
.billing-cartesian {
  width: 100%;
  height: 220px;
  overflow: visible;
}
.billing-chart-muted {
  fill: #748697;
  font-size: var(--realmed-help-size);
}
.billing-chart-value {
  fill: #234358;
  font-size: var(--realmed-help-size);
}
.billing-chart-total {
  fill: #123047;
  font-size: var(--realmed-title-size);
  font-weight: 600;
}
.billing-chart-percent {
  font-size: var(--realmed-help-size);
  font-weight: var(--realmed-weight-emphasis);
}
.billing-chart-empty {
  min-height: 220px;
  display: grid;
  place-content: center;
  color: #8798a9;
}
.billing-donut-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: 220px;
  flex-direction: column;
  gap: 8px;
}
.billing-donut-layout svg {
  width: 210px;
  max-width: 52%;
  flex-shrink: 0;
}
.billing-chart-legend {
  display: grid;
  gap: 12px;
  min-width: 0;
  flex: 1;
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  flex: unset;
  gap: 6px 14px;
}
.billing-chart-legend li {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  font-size: var(--realmed-help-size);
  overflow-wrap: anywhere;
  display: flex;
}
.billing-chart-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
@media (max-width: 600px) {
  .billing-chart {
    padding: 16px;
  }
  .billing-donut-layout {
    flex-direction: column;
    gap: 8px;
  }
  .billing-donut-layout svg {
    max-width: 100%;
    width: 200px;
  }
  .billing-chart-legend {
    width: 100%;
  }
  .billing-cartesian {
    height: 190px;
  }
}
</style>
