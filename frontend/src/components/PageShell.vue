<template><AdminLayout><div class="space-y-6"><header><h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1><p v-if="subtitle" class="mt-1 text-gray-500">{{ subtitle }}</p></header><slot /></div></AdminLayout></template>
<script setup lang="ts">import AdminLayout from '@/components/layout/AdminLayout.vue'; defineProps<{title:string;subtitle?:string}>();</script>
