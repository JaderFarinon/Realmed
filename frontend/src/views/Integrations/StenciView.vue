<template>
  <PageShell title="Integração Stenci" subtitle="Consulta assistencial em modo somente leitura.">
    <div v-if="loading" class="rounded-xl border bg-white p-6 text-gray-500">Carregando status...</div>
    <div v-else-if="loadError" class="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{{ loadError }}</div>
    <section v-else-if="status" class="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div><p class="text-sm text-gray-500">Status</p><span :class="badgeClass" class="mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold">{{ statusLabel }}</span></div>
        <button :disabled="testing" class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50" @click="testConnection">{{ testing ? 'Testando...' : 'Testar conexão' }}</button>
      </div>
      <dl class="grid gap-4 border-t pt-5 sm:grid-cols-2">
        <div><dt class="text-sm text-gray-500">Base URL</dt><dd class="font-medium">{{ yesNo(status.base_url_configured) }}</dd></div>
        <div><dt class="text-sm text-gray-500">Autenticação</dt><dd class="font-medium">{{ yesNo(status.authentication_configured) }}</dd></div>
        <div><dt class="text-sm text-gray-500">Última operação</dt><dd class="font-medium">{{ status.last_operation?.operation || 'Nenhuma consulta realizada' }}</dd></div>
        <div><dt class="text-sm text-gray-500">Resultado</dt><dd class="font-medium">{{ status.last_operation?.status || '—' }}</dd></div>
      </dl>
      <div v-if="feedback" :class="feedbackError ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'" class="rounded-lg border p-4">{{ feedback }}</div>
      <div v-if="status.last_error" class="rounded-lg border border-red-200 bg-red-50 p-4"><p class="text-sm font-semibold text-red-800">Último erro</p><p class="mt-1 text-red-700">{{ status.last_error }}</p></div>
      <p class="text-xs text-gray-500">Credenciais, tokens, cookies e cabeçalhos de autenticação nunca são exibidos nesta tela.</p>
    </section>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageShell from '@/components/PageShell.vue'
import api from '@/plugins/axios'

interface Status { enabled: boolean; base_url_configured: boolean; authentication_configured: boolean; status: 'DISABLED'|'CONFIGURED'|'ERROR'|'CONNECTED'; last_operation: null|{operation:string;status:string}; last_error:string|null }
const status = ref<Status|null>(null), loading = ref(true), testing = ref(false), loadError = ref(''), feedback = ref(''), feedbackError = ref(false)
const labels = { DISABLED: 'Desabilitado', CONFIGURED: 'Configurado', ERROR: 'Erro', CONNECTED: 'Conectado' }
const statusLabel = computed(() => status.value ? labels[status.value.status] : '—')
const badgeClass = computed(() => ({ DISABLED:'bg-gray-100 text-gray-700', CONFIGURED:'bg-amber-100 text-amber-800', ERROR:'bg-red-100 text-red-700', CONNECTED:'bg-green-100 text-green-700' }[status.value?.status || 'DISABLED']))
const yesNo = (value:boolean) => value ? 'Configurada' : 'Não configurada'
async function load() { try { status.value = (await api.get('/integrations/stenci/status')).data; loadError.value = '' } catch (error:any) { loadError.value = error.response?.data?.error || 'Não foi possível carregar a integração.' } finally { loading.value = false } }
async function testConnection() { testing.value=true; feedback.value=''; try { feedback.value=(await api.post('/integrations/stenci/test-connection')).data.message; feedbackError.value=false } catch(error:any) { feedback.value=error.response?.data?.error || 'Falha controlada ao testar conexão.'; feedbackError.value=true } finally { testing.value=false; await load() } }
onMounted(load)
</script>
