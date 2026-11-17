import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { notify } from '@/composables/useNotifications'
export function usePatientApp() {
  const route = useRoute()
  let prompt: any, stopped = false
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]') || document.createElement('link')
  const previous = manifest.getAttribute('href')
  manifest.rel = 'manifest'; manifest.removeAttribute('href'); document.head.appendChild(manifest)
  const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow, noarchive'; document.head.appendChild(robots)
  const referrer = document.createElement('meta'); referrer.name = 'referrer'; referrer.content = 'no-referrer'; document.head.appendChild(referrer)
  function setManifest() {
    const path = window.location.pathname
    if (!stopped && /^\/paciente\/[A-Za-z0-9_-]{43}$/.test(path) && navigator.serviceWorker?.controller) manifest.href = path + '/manifest.webmanifest'
  }
  const capture = (event: Event) => { event.preventDefault(); prompt = event }
  watch(() => route.path, setManifest)
  onMounted(() => {
    window.addEventListener('beforeinstallprompt', capture)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', setManifest)
      setManifest(); void navigator.serviceWorker.ready.then(setManifest)
    }
  })
  onBeforeUnmount(() => {
    stopped = true; window.removeEventListener('beforeinstallprompt', capture)
    navigator.serviceWorker?.removeEventListener('controllerchange', setManifest)
    if (previous) manifest.href = previous; else manifest.remove()
    robots.remove(); referrer.remove(); prompt = null
  })
  async function saveOnPhone() {
    if (prompt) { const current = prompt; prompt = null; await current.prompt(); return }
    notify('No menu do navegador, escolha Adicionar à tela inicial ou Adicionar aos favoritos para guardar seu acesso.', 'info', 10000)
  }
  return { saveOnPhone }
}
