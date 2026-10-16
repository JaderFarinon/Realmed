<template>
  <PageShell title="Usuário sem permissão a essa função">
    <div class="panel max-w-2xl">
      <p class="text-gray-600">Solicite a um administrador do Realmed a liberação desta função.</p>
      <RouterLink to="/dashboard" class="btn-secondary mt-5 inline-flex"
        >Voltar ao Dashboard</RouterLink
      >
    </div>
  </PageShell>
</template>
<script setup lang="ts">
import PageShell from '@/components/PageShell.vue'
</script>
