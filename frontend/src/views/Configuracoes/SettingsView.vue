<template>
  <PageShell title="Configurações" subtitle="Administração de usuários e acessos">
    <nav class="grid gap-4 sm:grid-cols-2" aria-label="Opções de configurações">
      <RouterLink to="/usuarios" class="panel block hover:border-brand-300 focus-visible:outline-brand-500">
        <h2>Usuários</h2><p class="mt-2 text-gray-500">Cadastrar e gerenciar as contas da equipe.</p>
      </RouterLink>
      <RouterLink to="/configuracoes/permissoes" class="panel block hover:border-brand-300 focus-visible:outline-brand-500">
        <h2>Permissões</h2><p class="mt-2 text-gray-500">Definir os acessos e as ações permitidas para cada usuário.</p>
      </RouterLink>
    </nav>
  </PageShell>
</template>
<script setup lang="ts">
import PageShell from '@/components/PageShell.vue'
</script>
