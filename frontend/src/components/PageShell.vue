<template>
  <AdminLayout
    ><div class="page-shell" :class="{ 'page-shell--list': list }">
      <header class="page-heading">
        <div>
          <h1>{{ title }}</h1>
          <p v-if="subtitle">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.actions" class="page-heading-actions"><slot name="actions" /></div>
      </header>
      <slot /></div
  ></AdminLayout>
</template>
<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
defineProps<{ title: string; subtitle?: string; list?: boolean }>()
</script>
