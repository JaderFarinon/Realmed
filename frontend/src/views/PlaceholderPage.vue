<template>
  <AdminLayout>
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
        {{ route.meta.title }}
      </h1>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'

const route = useRoute()
</script>
