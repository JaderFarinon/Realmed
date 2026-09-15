<template><span class="status-badge" :class="`status-badge--${statusTone(value)}`"><span aria-hidden="true">●</span>{{ label }}</span></template>
<script setup lang="ts">
import { computed } from 'vue'
import { labelFor, statusTone, type LabelMap } from '@/utils/guideLabels'
const props = defineProps<{ value: string; labels: LabelMap }>()
const label = computed(() => labelFor(props.labels, props.value))
</script>
