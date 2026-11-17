<template>
  <article class="analysis-slide">
    <header>
      <p class="analysis-eyebrow">REALMED · ANÁLISE CRÍTICA</p>
      <h2>{{ slide.title }}</h2>
    </header>
    <p v-if="differentFilters" class="indicator-coverage">
      Antes e Agora usam filtros diferentes além do período. Considere essa diferença ao interpretar
      os resultados.
    </p>
    <div class="analysis-three-columns">
      <section>
        <h3><span>01</span> Antes</h3>
        <IndicatorMetric :metric="slide.before" compact />
        <h4>De onde eu vim</h4>
        <p class="analysis-prose">{{ slide.origin || 'Descreva o ponto de partida.' }}</p>
      </section>
      <section>
        <h3><span>02</span> Agora</h3>
        <IndicatorMetric :metric="slide.now" compact />
        <h4>Como cheguei a este resultado</h4>
        <p class="analysis-prose">
          {{ slide.explanation || 'Descreva as ações, os fatores e as evidências.' }}
        </p>
      </section>
      <section class="analysis-future">
        <h3><span>03</span> Futuro</h3>
        <h4>Para onde estou indo</h4>
        <p class="analysis-prose">{{ slide.direction || 'Defina o resultado desejado.' }}</p>
        <h4>Meta</h4>
        <p class="analysis-prose">{{ slide.target || 'Não definida' }}</p>
        <h4>O que fazer para seguir</h4>
        <p class="analysis-prose">{{ slide.actions || 'Descreva o plano de ação.' }}</p>
        <dl>
          <dt>Responsável</dt>
          <dd>{{ slide.responsible || 'A definir' }}</dd>
          <dt>Prazo</dt>
          <dd>{{ slide.dueDate ? dateOnly(slide.dueDate) : 'A definir' }}</dd>
        </dl>
        <p class="indicator-footnotes">
          Meta e plano preenchidos pela equipe; não são previsão automática.
        </p>
      </section>
    </div>
  </article>
</template>
<script setup lang="ts">
import IndicatorMetric from './IndicatorMetric.vue'
import { computed } from 'vue'
import type { Slide } from './types'
import { dateOnly } from './types'
const props = defineProps<{ slide: Slide }>()
const differentFilters = computed(() =>
  ['source', 'status', 'insurance', 'scheduleId', 'placeId'].some(
    (key) =>
      props.slide.before.filters[key as keyof typeof props.slide.before.filters] !==
      props.slide.now.filters[key as keyof typeof props.slide.now.filters],
  ),
)
</script>
