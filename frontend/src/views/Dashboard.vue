<template>
  <AdminLayout><div><h1 class="text-2xl font-bold text-gray-900">Visão geral</h1><p class="mt-1 text-gray-500">Indicadores operacionais da Central de Guias</p><div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><RouterLink v-for="card in cards" :key="card.key" :to="{path:'/central-de-guias',query:card.query}" class="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><p class="text-sm text-gray-500">{{card.label}}</p><strong class="mt-2 block text-3xl text-gray-900">{{metrics[card.key]??0}}</strong><span class="mt-3 block text-xs font-semibold text-brand-600">Ver fila →</span></RouterLink></div></div></AdminLayout>
</template>
<script setup lang="ts">
defineOptions({ name: 'DashboardView' })
import { onMounted, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/plugins/axios'
const metrics=reactive<Record<string,number>>({});const cards=[{key:'preparation',label:'Em preparação',query:{queue:'NOT_READY'}},{key:'ready',label:'Pendentes de liberação',query:{queue:'READY'}},{key:'authorizing',label:'Em liberação',query:{queue:'IN_PROGRESS'}},{key:'pending',label:'Pendências do convênio',query:{queue:'PENDING'}},{key:'authorized',label:'Liberados',query:{queue:'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED'}},{key:'treatment',label:'Em tratamento',query:{queue:'ALL',treatment_status:'IN_PROGRESS'}},{key:'billing',label:'Concluídos aguardando faturamento',query:{queue:'ALL',treatment_status:'COMPLETED',billing_status:'READY'}}];onMounted(async()=>Object.assign(metrics,(await api.get('/dashboard')).data))
;</script>
