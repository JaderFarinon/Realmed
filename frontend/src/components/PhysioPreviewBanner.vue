<template>
  <aside class="physio-preview-banner" role="note">
    <strong>Visualização administrativa<span v-if="name"> · {{ name }}</span></strong>
    <span>Consulta liberada fora do horário da sessão. Nenhum atendimento é iniciado ou gravado por este acesso.</span>
  </aside>
</template>
<script setup lang="ts">
defineProps<{ name?: string }>()
</script>
<style scoped>
.physio-preview-banner{display:flex;flex-wrap:wrap;gap:4px 14px;padding:10px 16px;background:#fff7dc;border-bottom:1px solid #ecd291;color:#755614;font-size:12px;line-height:1.5}.physio-preview-banner strong{font-weight:650}
</style>
