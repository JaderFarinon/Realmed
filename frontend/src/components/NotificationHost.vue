<template>
  <Teleport to="body">
    <div class="notification-stack" aria-label="Notificações">
      <TransitionGroup name="notification">
        <section v-for="notice in notifications" :key="notice.id" class="notification-card" :class="'notification-' + notice.tone" :role="notice.tone === 'error' || notice.tone === 'warning' ? 'alert' : 'status'" :aria-live="notice.tone === 'error' || notice.tone === 'warning' ? 'assertive' : 'polite'" aria-atomic="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="notification-icon" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path v-if="notice.tone === 'success'" d="m7 12 3 3 7-7" />
            <path v-else-if="notice.tone === 'error'" d="m9 9 6 6m-6 0 6-6" />
            <path v-else-if="notice.tone === 'warning'" d="M12 7v6m0 4h.01" />
            <path v-else d="M12 11v6m0-10h.01" />
          </svg>
          <div class="notification-copy"><strong>{{ titles[notice.tone] }}</strong><p>{{ notice.message }}</p></div>
          <button type="button" class="notification-close" :aria-label="'Fechar notificação: ' + notice.message" @click="dismissNotification(notice.id)">×</button>
          <span class="notification-timer" :style="{ animationDuration: notice.durationMs + 'ms' }" aria-hidden="true" />
        </section>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { notifications, dismissNotification } from '@/composables/useNotifications'
const titles = { success: 'Sucesso', info: 'Informação', warning: 'Atenção', error: 'Erro' }
</script>
<style scoped>
.notification-stack { position: fixed; top: max(1rem, env(safe-area-inset-top)); right: max(1rem, env(safe-area-inset-right)); z-index: 3000; width: min(26rem, calc(100vw - 2rem)); display: grid; gap: 0.75rem; pointer-events: none; }
.notification-card { position: relative; display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem 0.75rem 1rem 1rem; border: 1px solid #ffffff40; border-radius: 0.75rem; color: #fff; box-shadow: 0 8px 24px #10182840; overflow: hidden; pointer-events: auto; }
.notification-success { background: #067647; }
.notification-info { background: #175cd3; }
.notification-warning { background: #fdb022; color: #431407; }
.notification-error { background: #b42318; }
.notification-icon { width: 1.5rem; height: 1.5rem; flex-shrink: 0; }
.notification-copy { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.notification-copy strong { font-weight: var(--realmed-weight-emphasis); }
.notification-copy p { margin-top: 0.25rem; }
.notification-close { display: grid; place-items: center; width: 2rem; height: 2rem; flex-shrink: 0; border-radius: 0.375rem; color: inherit; font-size: var(--realmed-dialog-title-size); line-height: 1; }
.notification-close:hover { background: #ffffff26; }
.notification-close:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.notification-warning .notification-timer { background: #43140780; }
.notification-timer { position: absolute; bottom: 0; left: 0; height: 3px; width: 100%; background: #ffffff80; transform-origin: left; animation: notification-countdown 5s linear forwards; }
.notification-enter-active, .notification-leave-active { transition: opacity 0.16s ease, transform 0.16s ease; }
.notification-enter-from, .notification-leave-to { opacity: 0; transform: translateX(1rem); }
@keyframes notification-countdown { to { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) { .notification-enter-active, .notification-leave-active { transition: none; } .notification-timer { animation: none; } }
</style>
