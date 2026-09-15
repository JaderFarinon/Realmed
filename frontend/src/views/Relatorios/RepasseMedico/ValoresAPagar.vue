<template>
  <AdminLayout>
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Repasse Médico</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Visualize os valores pendentes de repasse aos profissionais da equipe médica.
        </p>
      </header>

      <ComponentCard
        title="Valores a pagar"
        desc="Este relatório apresenta um resumo dos repasses financeiros pendentes para cada profissional."
        class-name="max-w-5xl"
      >
        <p class="text-sm text-gray-600 dark:text-gray-400">
          A implementação detalhada deste relatório será disponibilizada em breve. Enquanto isso, utilize os demais filtros e
          relatórios disponíveis no sistema para acompanhar os repasses.
        </p>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
</script>
