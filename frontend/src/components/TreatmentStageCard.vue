<template>
  <section
    class="panel"
    :class="{ 'treatment-stage-complete': completed && !tabbed, 'treatment-card-compact': compact }"
    :data-treatment-stage="stage"
  >
    <div class="treatment-card-header">
      <div class="treatment-card-heading">
        <h2 class="section-title">{{ title }}</h2>
        <p v-if="!open && $slots.summary" class="text-sm text-gray-600"><slot name="summary" /></p>
      </div>
      <TreatmentCardToggle
        v-if="!tabbed"
        :open="open"
        :label="title"
        :controls="bodyId"
        @toggle="open = !open"
      />
    </div>
    <div v-show="tabbed || open" :id="bodyId" class="mt-4">
      <slot />
      <div v-if="canEdit" class="treatment-stage-footer">
        <TreatmentStageActions
          :process="process"
          :stage="stage"
          :title="title"
          :can-edit="canEdit"
          :disabled="disabled"
          @updated="$emit('updated', $event)"
        />
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import TreatmentCardToggle from './TreatmentCardToggle.vue'
import TreatmentStageActions from './TreatmentStageActions.vue'
import { treatmentStageClosed } from '@/utils/treatmentStages'
const props = defineProps<{
  process: any
  stage: string
  title: string
  canEdit: boolean
  disabled?: boolean
  tabbed?: boolean
  compact?: boolean
  initiallyCollapsed?: boolean
}>()
defineEmits(['updated'])
const completed = computed(() => treatmentStageClosed(props.process, props.stage))
const bodyId = computed(() => `treatment-${props.process.id}-${props.stage}-body`)
const open = ref(!props.initiallyCollapsed)
defineExpose({
  async reveal() {
    open.value = true
    await nextTick()
  },
})
watch(
  completed,
  (value, previous) => {
    if (value) open.value = false
    else if (previous !== undefined) open.value = true
  },
  { immediate: true },
)
</script>

<style scoped>
.panel.treatment-card-compact {
  padding: 0.75rem 1rem;
}
.treatment-card-compact .section-title {
  margin-bottom: 0;
}
</style>
