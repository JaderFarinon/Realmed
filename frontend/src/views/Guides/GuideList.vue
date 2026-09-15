<template>
  <PageShell title="Central de Guias" subtitle="Fila operacional de preparação e liberação de processos">
    <nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Filas da Central de Guias">
      <button v-for="tab in tabs" :key="tab.key" class="whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm font-semibold" :class="activeTab === tab.key ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 bg-white text-gray-600'" @click="selectTab(tab.key)">{{ tab.label }}</button>
    </nav>

    <section class="panel space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div><h2 class="font-semibold text-gray-900">{{ currentTabLabel }}</h2><p class="text-sm text-gray-500">{{ total }} processo(s) nesta visão</p></div>
        <button class="btn-secondary" :aria-expanded="showFilters" @click="showFilters = !showFilters">⚙ Filtros <span v-if="activeFilterCount" class="ml-1 rounded-full bg-brand-100 px-2 text-brand-700">{{ activeFilterCount }}</span></button>
      </div>
      <form v-show="showFilters" class="grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-4" @submit.prevent="load(1)">
        <label class="filter-label xl:col-span-2">Buscar paciente<input v-model="filters.search" class="input" placeholder="Nome do paciente"></label>
        <label class="filter-label">Convênio<select v-model="filters.insurance_provider_id" class="input"><option value="">Todos</option><option v-for="item in insurers" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        <label class="filter-label">Fisioterapeuta<select v-model="filters.physiotherapist_id" class="input"><option value="">Todos</option><option v-for="item in physiotherapists" :key="item.id" :value="item.id">{{ item.full_name }}</option></select></label>
        <label class="filter-label">Médico solicitante<select v-model="filters.requesting_doctor_id" class="input"><option value="">Todos</option><option v-for="item in doctors" :key="item.id" :value="item.id">{{ item.full_name }}</option></select></label>
        <label class="filter-label">Status da liberação<select v-model="filters.authorization_status" class="input"><option value="">Todos</option><option v-for="(label,value) in authorizationStatusLabels" :key="value" :value="value">{{ label }}</option></select></label>
        <label class="filter-label">Documentação<select v-model="filters.document_status" class="input"><option value="">Todos</option><option v-for="(label,value) in documentStatusLabels" :key="value" :value="value">{{ label }}</option></select></label>
        <label class="filter-label">Tratamento<select v-model="filters.treatment_status" class="input"><option value="">Todos</option><option v-for="(label,value) in treatmentStatusLabels" :key="value" :value="value">{{ label }}</option></select></label>
        <label class="filter-label">Faturamento<select v-model="filters.billing_status" class="input"><option value="">Todos</option><option v-for="(label,value) in billingStatusLabels" :key="value" :value="value">{{ label }}</option></select></label>
        <label class="filter-label">Prioridade<select v-model="filters.priority" class="input"><option value="">Todas</option><option value="2">Urgente</option><option value="1">Alta</option><option value="0">Normal</option></select></label>
        <label class="filter-label">Avaliação de<input v-model="filters.assessment_date_from" type="date" class="input"></label><label class="filter-label">Avaliação até<input v-model="filters.assessment_date_to" type="date" class="input"></label>
        <label class="filter-label">Início previsto de<input v-model="filters.expected_start_date_from" type="date" class="input"></label><label class="filter-label">Início previsto até<input v-model="filters.expected_start_date_to" type="date" class="input"></label>
        <div class="flex items-end gap-2 xl:col-span-4"><button class="btn" type="submit">Aplicar filtros</button><button class="btn-secondary" type="button" @click="clearFilters">Limpar filtros</button></div>
      </form>
      <div v-if="activeChips.length" class="flex flex-wrap gap-2 border-t pt-3"><button v-for="chip in activeChips" :key="chip.key" class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700" @click="removeFilter(chip.key)">{{ chip.label }} ×</button></div>
    </section>

    <div class="flex justify-end"><label class="flex items-center gap-2 text-sm font-medium text-gray-600">Ordenar por<select v-model="filters.sort" class="input" @change="load(1)"><option value="start_asc">Início mais próximo</option><option value="start_desc">Início mais distante</option><option value="assessment_desc">Avaliações mais recentes</option><option value="assessment_asc">Avaliações mais antigas</option><option value="priority_desc">Maior prioridade</option><option value="created_asc">Cadastro mais antigo</option><option value="created_desc">Cadastro mais recente</option></select></label></div>

    <div class="panel overflow-x-auto p-0">
      <table class="table"><thead><tr><th>Paciente</th><th>Convênio</th><th>Fisioterapeuta</th><th>Avaliação</th><th>Início previsto</th><th>Sessões</th><th>Documentação</th><th>Liberação</th><th>Prioridade</th><th>Ação</th></tr></thead>
        <tbody><tr v-for="item in data" :key="item.id"><td class="font-semibold text-gray-900">{{ item.patient_name }}</td><td>{{ item.insurance_name }}</td><td>{{ item.physiotherapist_name }}</td><td>{{ date(item.assessment_date) }}</td><td class="font-medium">{{ date(item.expected_start_date) }}</td><td class="whitespace-nowrap"><b>{{ item.requested_sessions }}</b> solicitadas<br><span class="text-gray-500">{{ item.authorized_sessions ?? '—' }} autorizadas</span></td><td><StatusBadge :value="item.document_status" :labels="documentStatusLabels" /></td><td><StatusBadge :value="item.authorization_status" :labels="authorizationStatusLabels" /></td><td>{{ priorityLabel(item.priority) }}</td><td><RouterLink class="btn-secondary inline-block" :to="`/central-de-guias/${item.id}`">Abrir</RouterLink></td></tr>
        <tr v-if="!data.length"><td colspan="10" class="py-10 text-center text-gray-500">Nenhum processo encontrado nesta fila.</td></tr></tbody></table>
      <div class="flex items-center justify-between p-4 text-sm"><button class="btn-secondary" :disabled="page <= 1" @click="load(page - 1)">Anterior</button><span>Página {{ page }} de {{ pages }}</span><button class="btn-secondary" :disabled="page >= pages" @click="load(page + 1)">Próxima</button></div>
    </div>
  </PageShell>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import PageShell from '@/components/PageShell.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { authorizationStatusLabels, billingStatusLabels, documentStatusLabels, treatmentStatusLabels } from '@/utils/guideLabels'

const route = useRoute(), router = useRouter(), data = ref<any[]>([]), insurers = ref<any[]>([]), professionals = ref<any[]>([]), page = ref(1), pages = ref(1), total = ref(0), showFilters = ref(false)
const tabs = [{key:'READY',label:'Pendentes de liberação'},{key:'IN_PROGRESS',label:'Em liberação'},{key:'PENDING',label:'Com pendência'},{key:'AUTHORIZED,SESSION_TOKEN,NOT_REQUIRED',label:'Liberados'},{key:'NOT_READY',label:'Em preparação'},{key:'ALL',label:'Todos'}]
const filters = reactive<Record<string,string>>({ search:'', insurance_provider_id:'', physiotherapist_id:'', requesting_doctor_id:'', authorization_status:'READY', document_status:'', treatment_status:'', billing_status:'', priority:'', assessment_date_from:'', assessment_date_to:'', expected_start_date_from:'', expected_start_date_to:'', sort:'start_asc' })
const activeTab = computed(() => tabs.some(t => t.key === filters.authorization_status) ? filters.authorization_status : 'ALL')
const currentTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || 'Todos')
const physiotherapists = computed(() => professionals.value.filter(p => p.type === 'PHYSIOTHERAPIST'))
const doctors = computed(() => professionals.value.filter(p => p.type === 'DOCTOR'))
const filterNames:Record<string,string>={search:'Paciente',insurance_provider_id:'Convênio',physiotherapist_id:'Fisioterapeuta',requesting_doctor_id:'Médico',document_status:'Documentação',treatment_status:'Tratamento',billing_status:'Faturamento',priority:'Prioridade',assessment_date_from:'Avaliação de',assessment_date_to:'Avaliação até',expected_start_date_from:'Início de',expected_start_date_to:'Início até'}
const activeChips=computed(()=>Object.entries(filters).filter(([k,v])=>v&&filterNames[k]).map(([key,value])=>({key,label:`${filterNames[key]}: ${displayValue(key,value)}`})))
const activeFilterCount=computed(()=>activeChips.value.length)
const date=(value:string)=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'):'—'
const priorityLabel=(value:number)=>Number(value)>=2?'Urgente':Number(value)===1?'Alta':'Normal'
function displayValue(key:string,value:string){if(key==='insurance_provider_id')return insurers.value.find(i=>String(i.id)===String(value))?.name||value;if(['physiotherapist_id','requesting_doctor_id'].includes(key))return professionals.value.find(i=>String(i.id)===String(value))?.full_name||value;if(key.includes('date'))return date(value);return ({...documentStatusLabels,...treatmentStatusLabels,...billingStatusLabels}[value as keyof typeof documentStatusLabels] as string)||priorityLabel(Number(value))}
async function load(target=1){const params=Object.fromEntries(Object.entries(filters).filter(([,v])=>v));const response=await api.get('/guide-processes',{params:{...params,page:target}});data.value=response.data.data;page.value=response.data.pagination.page;pages.value=response.data.pagination.pages||1;total.value=response.data.pagination.total;await router.replace({query:{...route.query,queue:activeTab.value==='ALL'?'ALL':filters.authorization_status}})}
function selectTab(key:string){filters.authorization_status=key==='ALL'?'':key;load(1)}
function clearFilters(){Object.keys(filters).forEach(key=>filters[key]='');filters.sort='start_asc';selectTab('READY')}
function removeFilter(key:string){filters[key]='';load(1)}
onMounted(async()=>{const queue=typeof route.query.queue==='string'?route.query.queue:'READY';filters.authorization_status=queue==='ALL'?'':queue;for(const key of ['document_status','treatment_status','billing_status'])if(typeof route.query[key]==='string')filters[key]=route.query[key] as string;[insurers.value,professionals.value]=await Promise.all([(await api.get('/insurance-providers',{params:{active:true}})).data,(await api.get('/professionals',{params:{active:true}})).data]);await load()})
</script>

<style scoped>.filter-label{display:flex;flex-direction:column;gap:.35rem;font-size:.75rem;font-weight:600;color:#475467}.filter-label .input{width:100%;font-weight:400;color:#344054}</style>
