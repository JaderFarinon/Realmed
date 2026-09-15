<template>
  <AdminLayout><div><h1 class="text-2xl font-bold text-gray-900">Visão geral</h1><p class="mt-1 text-gray-500">Indicadores operacionais da Central de Guias</p><div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><article v-for="card in cards" :key="card.key" class="rounded-2xl border bg-white p-5 shadow-sm"><p class="text-sm text-gray-500">{{card.label}}</p><strong class="mt-2 block text-3xl text-gray-900">{{metrics[card.key]??0}}</strong></article></div></div></AdminLayout>
</template>
<script setup lang="ts">
defineOptions({ name: 'DashboardView' })
import { onMounted, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/plugins/axios'
const metrics=reactive<Record<string,number>>({});const cards=[['preparation','Processos em preparação'],['incomplete','Documentação incompleta'],['ready','Prontos para liberação'],['authorizing','Em liberação'],['pending','Com pendência'],['authorized','Liberados'],['treatment','Em tratamento'],['billing','Concluídos aguardando faturamento']].map(([key,label])=>({key,label}));onMounted(async()=>Object.assign(metrics,(await api.get('/dashboard')).data))
;</script>
