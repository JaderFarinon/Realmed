<template>
  <template v-if="isAdmin">
    <button ref="trigger" type="button" class="table-action-button relative" :aria-label="`Notificações${unread ? `: ${unread} não lidas` : ''}`" title="Notificações" @click="show = true; refresh()">
      <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      <span v-if="unread" class="notification-count">{{ unread > 99 ? '99+' : unread }}</span>
    </button>
    <ListDetailDialog :open="show" title="Notificações" @close="show = false">
      <p v-if="loading && !items.length" role="status">Carregando notificações…</p>
      <p v-else-if="!items.length" class="text-sm text-gray-500">Nenhuma notificação por enquanto.</p>
      <ol v-else class="space-y-3">
        <li v-for="item in items" :key="item.id" class="rounded-xl border p-4" :class="item.read_at ? 'border-gray-200' : 'border-blue-300 bg-blue-50'">
          <div class="flex items-start justify-between gap-3"><h3 class="font-semibold">{{ item.title }}</h3><span v-if="!item.read_at" class="text-xs font-semibold text-blue-700">Nova</span></div>
          <p class="mt-2 text-sm">{{ item.message }}</p>
          <p class="mt-2 text-xs text-gray-500">{{ dateTime(item.created_at) }}</p>
          <button v-if="!item.read_at" type="button" class="btn-secondary mt-3" :disabled="marking === item.id" @click="markRead(item)">Marcar como lida</button>
        </li>
      </ol>
      <template #footer><button v-if="hasMore" type="button" class="btn-secondary" :disabled="loading" @click="loadMore">Mais notificações</button><button type="button" class="btn-secondary" @click="show = false">Fechar</button></template>
    </ListDetailDialog>
  </template>
</template>
<script setup lang="ts">
import {computed,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import api from '@/plugins/axios'
import {useAuthUser} from '@/composables/useAuthUser'
import {notify} from '@/composables/useNotifications'
import {apiCooldownRemaining} from '@/utils/apiCooldown'
import ListDetailDialog from '@/components/ListDetailDialog.vue'
type Item={id:number;title:string;message:string;created_at:string;read_at:string|null}
const {authUser}=useAuthUser(),isAdmin=computed(()=>['admin','masteradmin'].includes(authUser.value?.role||''))
const trigger=ref<HTMLButtonElement>(),show=ref(false),loading=ref(false),items=ref<Item[]>([]),unread=ref(0),hasMore=ref(false),marking=ref<number|null>(null)
let latest:number|null=null,disposed=false,timer:ReturnType<typeof setInterval>|undefined,generation=0
const dateTime=(value:string)=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})
async function refresh(before?:number){
  if(disposed||!isAdmin.value||loading.value||apiCooldownRemaining())return
  const version=generation;loading.value=true
  try{
    const {data}=await api.get('/notifications',{params:before?{before}:undefined})
    if(disposed||version!==generation)return
    const incoming:Item[]=Array.isArray(data.items)?data.items:[]
    if(!before){
      if(latest!==null&&incoming[0]?.id>latest&&!incoming[0].read_at)notify(incoming[0].message,'info')
      latest=incoming[0]?.id||latest||0
    }
    items.value=before?[...items.value,...incoming]:incoming;unread.value=Number(data.unread)||0;hasMore.value=Boolean(data.hasMore)
  }catch{if(show.value)notify('Não foi possível carregar as notificações. Tente novamente.','error')}
  finally{loading.value=false}
}
async function loadMore(){await refresh(items.value[items.value.length-1]?.id)}
async function markRead(item:Item){
  if(marking.value)return
  marking.value=item.id
  try{await api.post(`/notifications/${item.id}/read`);item.read_at=new Date().toISOString();unread.value=Math.max(0,unread.value-1)}
  catch{notify('Não foi possível marcar a notificação como lida.','error')}
  finally{marking.value=null}
}
function check(){if(!document.hidden&&!show.value)void refresh()}
watch(()=>authUser.value?.id,()=>{generation++;latest=null;items.value=[];unread.value=0;show.value=false;void refresh()},{immediate:true})
watch(show,value=>{if(!value)trigger.value?.focus()})
onMounted(()=>{timer=setInterval(check,30000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check)})
onBeforeUnmount(()=>{disposed=true;clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)})
</script>
<style scoped>
.notification-count{position:absolute;top:-7px;right:-7px;min-width:19px;padding:2px 4px;border-radius:10px;background:#b42318;color:white;font-size:10px;font-weight:700;line-height:15px;text-align:center}
</style>
