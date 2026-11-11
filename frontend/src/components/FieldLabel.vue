<template>
  <span class="field-label-text"
    ><slot /><span
      v-if="required"
      class="required-field-marker"
      aria-hidden="true"
      :title="reason"
    ></span
  ></span>
</template>
<script setup lang="ts">
withDefaults(defineProps<{ required?: boolean; reason?: string }>(), {
  required: false,
  reason: 'Obrigatório conforme as regras do sistema.',
})
</script>
<style scoped>
.required-field-marker {
  color: #d92d20;
  font-weight: 600;
  white-space: nowrap;
}
.required-field-marker::after {
  content: ' *';
}
</style>
