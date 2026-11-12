<template>
  <PageShell :title="event?.name || 'Confraternização 2026'" subtitle="Confirmações de presença e acompanhantes" list>
    <DataList v-model:selected="selected" :items="items" :columns="columns" :actions="actions" :loading="loading" :server-total="total" :page="page" selection-key="participant_name" bounded :row-height="58" :empty-text="emptyText" @update:page="changePage" @update:page-size="changeSize" @row-dblclick="openDetails">
      <template #tabs>
        <div class="event-context">
          <p v-if="event">{{ dateOnly(event.event_date) }} · {{ event.event_time }} · {{ event.location_name }} <span class="text-gray-500">— {{ event.address }}</span></p>
          <div class="event-counts" aria-label="Totais do evento"><span>Confirmações <b>{{ summary.confirmations }}</b></span><span>Acompanhantes <b>{{ summary.companions }}</b></span><span>Total de pessoas <b>{{ summary.total_people }}</b></span></div>
          <p v-if="applied.search || applied.companions" class="text-xs text-gray-500">Filtro aplicado: {{ applied.search || 'Todos os nomes' }} · {{ applied.companions === 'with' ? 'Com acompanhante' : applied.companions === 'without' ? 'Sem acompanhante' : 'Com ou sem acompanhante' }}. Totais acima consideram o evento inteiro.</p>
        </div>
      </template>
      <template #filters><form class="list-filter-grid" @submit.prevent="applyFilters">
        <label class="filter-search">Participante ou acompanhante<input v-model="filters.search" class="input" maxlength="120" placeholder="Pesquisar nome" /></label>
        <label>Acompanhante<select v-model="filters.companions" class="input"><option value="">Todos</option><option value="with">Com acompanhante</option><option value="without">Sem acompanhante</option></select></label>
        <label>Ordenar por<select v-model="filters.sort" class="input"><option value="recent">Confirmação mais recente</option><option value="name">Nome do participante</option></select></label>
        <button class="btn-primary" type="submit">Aplicar</button><button class="btn-secondary" type="button" @click="clearFilters">Limpar</button>
      </form></template>
      <template #actions><small class="text-gray-500">{{ updatedAt ? `Atualizado às ${updatedAt} · Atualização automática a cada 30 s` : 'As confirmações do convite aparecem aqui.' }}</small></template>
      <template #cell-participant_name="{item}"><strong>{{ item.participant_name }}</strong></template>
      <template #cell-companion_names="{item}"><ul v-if="item.companion_names.length" class="companion-list"><li v-for="(name,index) in item.companion_names" :key="index">{{ name }}</li></ul><span v-else class="text-gray-500">Sem acompanhante</span></template>
    </DataList>
    <ListDetailDialog :open="detailOpen" title="Confirmação de presença" @close="detailOpen=false">
      <dl v-if="selected" class="confirmation-detail"><dt>Participante</dt><dd>{{ selected.participant_name }}</dd><dt>Acompanhante{{ selected.companion_names.length > 1 ? 's' : '' }}</dt><dd><ul v-if="selected.companion_names.length"><li v-for="(name,index) in selected.companion_names" :key="index">{{ name }}</li></ul><span v-else>Sem acompanhante</span></dd><dt>Total de pessoas</dt><dd>{{ selected.total_people }}</dd><dt>Confirmado em</dt><dd>{{ dateTime(selected.created_at) }}</dd></dl>
    </ListDetailDialog>
  </PageShell>
</template>
<script setup lang="ts">
import {computed,onBeforeUnmount,onMounted,reactive,ref} from 'vue'
import PageShell from '@/components/PageShell.vue'
import DataList from '@/components/DataList.vue'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
import api from '@/plugins/axios'
import {notify} from '@/composables/useNotifications'
import {apiCooldownRemaining} from '@/utils/apiCooldown'

type Confirmation={id:number;participant_name:string;companion_names:string[];companion_count:number;total_people:number;created_at:string}
type EventInfo={name:string;event_date:string;event_time:string;location_name:string;address:string;confirmation_path:string}
type Filters={search:string;companions:string;sort:string}
const event=ref<EventInfo|null>(null),items=ref<Confirmation[]>([]),selected=ref<Confirmation|null>(null),detailOpen=ref(false)
const summary=ref({confirmations:0,companions:0,total_people:0}),total=ref(0),page=ref(1),pageSize=ref(10),loading=ref(false),updatedAt=ref(''),failed=ref(false)
const filters=reactive<Filters>({search:'',companions:'',sort:'recent'}),applied=ref<Filters>({...filters})
let disposed=false,initialized=false,stopped=false,queued=false,requestVersion=0,controller:AbortController|undefined,timer:ReturnType<typeof setInterval>|undefined
const dateOnly=(date:string)=>date.split('-').reverse().join('/')
function dateTime(value:string){return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value))}
const columns=[{key:'participant_name',label:'Participante'},{key:'companion_names',label:'Acompanhante(s)'},{key:'total_people',label:'Pessoas'},{key:'created_at',label:'Confirmado em',format:dateTime}]
const emptyText=computed(()=>failed.value?'Não foi possível carregar as confirmações. Use Atualizar para tentar novamente.':applied.value.search || applied.value.companions?'Nenhuma confirmação encontrada para os filtros aplicados.':'Nenhuma confirmação recebida até agora.')
function openDetails(item=selected.value){if(!item)return;selected.value=item;detailOpen.value=true}
const actions=computed(()=>[
  {icon:'eye',label:'Ver confirmação',disabled:!selected.value,onClick:()=>openDetails()},
  {icon:'refresh',label:'Atualizar confirmações',onClick:()=>load()},
  {icon:'copy',label:'Copiar link do convite',disabled:!event.value,onClick:async()=>{try{await navigator.clipboard.writeText(new URL(event.value!.confirmation_path,window.location.origin).href);notify('Link do convite copiado.','success')}catch{notify('Não foi possível copiar o link do convite.','error')}}},
])
function applyFilters(){applied.value={...filters};page.value=1;void load()}
function clearFilters(){Object.assign(filters,{search:'',companions:'',sort:'recent'});applyFilters()}
function changePage(value:number){if(value===page.value)return;page.value=value;void load()}
function changeSize(value:number){if(value===pageSize.value)return;pageSize.value=value;page.value=1;if(initialized)void load()}
async function load(){
  if(disposed || stopped || apiCooldownRemaining()>0)return
  queued=true;requestVersion++
  if(loading.value)return
  loading.value=true
  try{
    while(queued && !disposed){
      queued=false;const version=requestVersion;controller=new AbortController()
      try{
        const {data}=await api.get('/events/realmed-2026/confirmations',{params:{...applied.value,page:page.value,pageSize:pageSize.value},signal:controller.signal})
        if(disposed || version!==requestVersion)continue
        items.value=data.items;event.value=data.event;summary.value=data.summary;total.value=data.pagination.total;page.value=data.pagination.page;failed.value=false
        if(selected.value){selected.value=items.value.find(item=>item.id===selected.value?.id)||null;if(!selected.value)detailOpen.value=false}
        updatedAt.value=new Intl.DateTimeFormat('pt-BR',{timeStyle:'medium',timeZone:'America/Sao_Paulo'}).format(new Date())
      }catch(error){
        if(disposed || (error as any).code==='ERR_CANCELED')return
        const status=(error as any).response?.status
        if(status===401 || status===403 || status===404)stopped=true
        if(status===429 || stopped)queued=false
        failed.value=true
        notify((error as any).response?.data?.error || 'Não foi possível carregar as confirmações.','error')
      }
    }
  }finally{loading.value=false}
}
function refreshVisible(){if(!document.hidden && !loading.value && !detailOpen.value)void load()}
onMounted(()=>{initialized=true;void load();timer=setInterval(refreshVisible,30000);document.addEventListener('visibilitychange',refreshVisible)})
onBeforeUnmount(()=>{disposed=true;queued=false;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',refreshVisible)})
</script>
<style scoped>
.event-context{display:grid;gap:9px;font-size:13px}.event-counts{display:flex;gap:8px;flex-wrap:wrap}.event-counts>span{background:#f2f4f7;border-radius:8px;padding:6px 10px;color:#475467}.event-counts b{color:#344054;margin-left:6px}.companion-list{list-style:none;margin:0;padding:0}.companion-list li+li{margin-top:3px}.confirmation-detail{display:grid;gap:6px}.confirmation-detail dt{font-size:12px;color:#667085;margin-top:9px}.confirmation-detail dd{font-size:15px;overflow-wrap:anywhere}.confirmation-detail ul{list-style:none;padding:0}.confirmation-detail li+li{margin-top:5px}
</style>
