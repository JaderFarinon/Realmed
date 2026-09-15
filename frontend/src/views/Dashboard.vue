<template>
  <AdminLayout>
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
        {{ route.meta.title }}
      </h1>
      <p class="mt-4 text-gray-600 dark:text-gray-300">
        Selecione uma opção no menu à esquerda para começar.
      </p>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'

const route = useRoute()
</script>
