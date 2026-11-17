import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api, { editorId } from '@/plugins/axios'

export function useTreatmentEditLock(processId: () => number | undefined, stage: () => string) {
  const lock = ref<{locked:boolean;owned:boolean;sameUser?:boolean;recoverFrom?:string;owner?:string;expiresAt?:number;serverTime?:number}>({locked:false,owned:false})
  const busy=ref(false), error=ref(''), lost=ref(false)
  const owned=computed(()=>lock.value.owned)
  let current='', sequence=0, checkSequence=0, timer:ReturnType<typeof setInterval> | undefined
  let deadline:ReturnType<typeof setTimeout> | undefined
  function expire() {
    lock.value={...lock.value,owned:false}; lost.value=true
    error.value='Não foi possível confirmar a reserva de edição. Seus dados não salvos continuam nesta tela.'
  }
  function apply(value: typeof lock.value, elapsed=0) {
    clearTimeout(deadline)
    lock.value=value
    if(!value.owned) return false
    // Both timestamps originate on the server. The PC's wall clock cannot expire or extend a lease.
    // Discount the whole round trip conservatively; timers use the browser's monotonic clock.
    const remaining=typeof value.serverTime==='number' && Number.isFinite(value.serverTime) && typeof value.expiresAt==='number' && Number.isFinite(value.expiresAt)
      ? Math.min(60000,value.expiresAt-value.serverTime)-Math.max(0,elapsed) : 0
    if(remaining<=0) { expire(); return false }
    lost.value=false; error.value=''
    deadline=setTimeout(()=>{expire();void check()},remaining)
    return true
  }
  async function check() {
    const path=current, version=sequence, checkVersion=++checkSequence
    if(!path || busy.value) return
    try {
      const started=performance.now()
      const response=await api.get(path)
      if(version!==sequence || checkVersion!==checkSequence) return
      if(lock.value.owned && !response.data.owned) {
        lost.value=true
        error.value='Sua reserva de edição terminou ou foi recuperada em outra janela. Os dados não salvos continuam nesta tela.'
      }
      apply(response.data,performance.now()-started)
    } catch { /* Keep the known owner warning while the connection is unavailable. */ }
  }
  async function acquire(renew=false,recoverFrom?:string) {
    const path=current
    if(!path || busy.value) return false
    const version=++sequence
    busy.value=true; error.value=''
    try {
      const started=performance.now()
      const response=await api.post(path,{renew,...(recoverFrom ? {recoverFrom} : {})})
      if(version!==sequence) { releasePath(path); return false }
      return apply(response.data,performance.now()-started)
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
  function onVisibility() { if(!document.hidden) void check() }
  onMounted(()=>{
    timer=setInterval(()=>{if(owned.value) void acquire(true);else void check()},15000)
    window.addEventListener('pagehide',release)
    window.addEventListener('online',check)
    window.addEventListener('focus',check)
    document.addEventListener('visibilitychange',onVisibility)
  })
  onBeforeUnmount(()=>{
    sequence++;release();clearInterval(timer)
    window.removeEventListener('pagehide',release)
    window.removeEventListener('online',check)
    window.removeEventListener('focus',check)
    document.removeEventListener('visibilitychange',onVisibility)
  })
  return {lock,owned,busy,error,lost,check,acquire,release}
}
