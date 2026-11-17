const CACHE_NAME = 'realmed-shell-v1'
const APP_SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) return

  // The patient's install target keeps the same opaque link. Never cache this manifest or token URL.
  const patientManifest = url.pathname.match(/^\/paciente\/([A-Za-z0-9_-]{43})\/manifest\.webmanifest$/)
  if (patientManifest) {
    const path = '/paciente/' + patientManifest[1]
    event.respondWith(Promise.resolve(new Response(JSON.stringify({
      id: path, name: 'Realmed — Meu cuidado', short_name: 'Meu Realmed', lang: 'pt-BR',
      start_url: path, scope: '/paciente/', display: 'standalone', orientation: 'any',
      theme_color: '#f8fafc', background_color: '#f8fafc',
      icons: [192, 512].map(size => ({ src: '/icons/realmed-' + size + '.png', sizes: size + 'x' + size, type: 'image/png', purpose: 'any' })),
    }), { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } })))
    return
  }
  if (url.pathname.startsWith('/paciente/')) {
    event.respondWith(fetch(request).catch(async () => (await (await caches.open(CACHE_NAME)).match(APP_SHELL)) || Response.error()))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME)
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.put(APP_SHELL, response.clone())
          await cache.put(request, response.clone())
        }
        return response
      } catch {
        return await cache.match(request) || await cache.match(APP_SHELL) || Response.error()
      }
    })())
    return
  }

  const isAppAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico'
  if (!isAppAsset) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    try {
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    } catch {
      return await cache.match(request) || Response.error()
    }
  })())
})
