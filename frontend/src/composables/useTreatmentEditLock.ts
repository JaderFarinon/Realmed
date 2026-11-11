import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api, { editorId } from '@/plugins/axios'

export function useTreatmentEditLock(processId: () => number | undefined, stage: () => string) {
  const lock = ref<{locked:boolean;owned:boolean;owner?:string;expiresAt?:number}>({locked:false,owned:false})
  const busy=ref(false), error=ref(''), lost=ref(false)
  const owned=computed(()=>lock.value.owned)
  let current='', sequence=0, timer:ReturnType<typeof setInterval> | undefined
  let deadline:ReturnType<typeof setTimeout> | undefined
  function apply(value: typeof lock.value) {
    clearTimeout(deadline)
    lock.value=value
    if(value.owned) deadline=setTimeout(()=>{
      lock.value={...lock.value,owned:false}; lost.value=true
      error.value='A edição perdeu a conexão. Seus dados não salvos continuam nesta tela.'
    },Math.max(0,Number(value.expiresAt)-Date.now()))
  }
  async function check() {
    const path=current, version=sequence
    if(!path || busy.value) return
    try {
      const response=await api.get(path)
      if(version!==sequence) return
      if(lock.value.owned && !response.data.owned) lost.value=true
      apply(response.data)
    } catch { /* Keep the known owner warning while the connection is unavailable. */ }
  }
  async function acquire(renew=false) {
    const path=current
    if(!path || busy.value) return false
    const version=++sequence
    busy.value=true; error.value=''
    try {
      const response=await api.post(path,{renew})
      if(version!==sequence) { releasePath(path); return false }
      apply(response.data); lost.value=false
      return true
    } catch(e:any) {
      if(version===sequence) {
        if(lock.value.owned) lost.value=true
        apply({...lock.value,owned:false})
        error.value=e.response?.data?.error || 'Não foi possível reservar esta aba para edição.'
      }
      return false
    } finally { busy.value=false; if(version===sequence && !lock.value.owned) void check() }
  }
  function releasePath(path:string) {
    const token=localStorage.getItem('token')
    if(path && token) void fetch(`${api.defaults.baseURL}${path}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`,'X-Realmed-Editor':editorId},keepalive:true}).catch(()=>{})
  }
  function release() {
    sequence++
    if(lock.value.owned) releasePath(current)
    clearTimeout(deadline)
    lock.value={locked:false,owned:false}
    lost.value=false
  }
  watch([processId,stage],([id,tab])=>{
    release(); sequence++; error.value=''
    current=id && tab!=='history'?`/guide-processes/${id}/edit-lock/${tab}`:''
    void check()
  },{immediate:true})
  onMounted(()=>{
    timer=setInterval(()=>{if(owned.value) void acquire(true);else void check()},15000)
    window.addEventListener('pagehide',release)
  })
  onBeforeUnmount(()=>{sequence++;release();clearInterval(timer);window.removeEventListener('pagehide',release)})
  return {lock,owned,busy,error,lost,check,acquire,release}
}
