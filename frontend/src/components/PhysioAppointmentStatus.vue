<template>
  <span class="physio-status" :style="{'--status-color': appearance.color, backgroundColor: `${appearance.color}26`, borderColor: `${appearance.color}88`}">
    <span class="physio-status-swatch" aria-hidden="true" />{{ appearance.label }}
  </span>
</template>
<script setup lang="ts">
import {computed} from 'vue'
import {appointmentStatus} from '@/utils/physioAgenda'
const props=defineProps<{status:string}>()
const appearance=computed(()=>appointmentStatus(props.status))
</script>
<style scoped>
.physio-status{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:7px 10px;border:1px solid;border-radius:10px;color:#143350;font-size:12px;line-height:1.35;font-weight:600;text-align:left}
.physio-status-swatch{flex:none;width:14px;height:18px;border-radius:4px;background:var(--status-color)}
@media screen and (min-width:640px) and (max-width:1368px), screen and (min-width:640px) and (pointer:coarse){
  .physio-status{padding:3px 7px;gap:5px;border-radius:7px;font-size:11px}.physio-status-swatch{width:10px;height:13px;border-radius:3px}
}
</style>
