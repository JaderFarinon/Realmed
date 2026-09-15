<template>
  <FullScreenLayout>
    <div class="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <header class="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
        <div class="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <router-link
            to="/login"
            class="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
          >
            <ArrowLeft class="h-4 w-4" />
            Voltar para o login
          </router-link>
          <router-link to="/" class="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-gray-200">
            <img src="/images/logo/logo-icon.svg" alt="Artro" class="h-8 w-8" />
            <span class="text-sm font-semibold tracking-wide">Grupo NM</span>
          </router-link>
        </div>
      </header>

      <main class="flex flex-1 justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div class="flex w-full max-w-5xl flex-col gap-6">
          <div class="space-y-3 text-center sm:text-left">
            <p class="text-xs uppercase tracking-[0.2em] text-brand-500">Notificações de incidentes</p>
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Registrar uma nova notificação</h1>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Utilize este formulário para comunicar um incidente assistencial mesmo sem estar autenticado.
            </p>
          </div>

          <transition name="fade">
            <div
              v-if="showSuccessMessage"
              class="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100"
            >
              <div class="flex items-start gap-2">
                <CheckCircle2 class="mt-0.5 h-5 w-5" />
                <p>
                  Notificação registrada com sucesso! Caso deseje informar outro incidente, utilize o formulário novamente.
                </p>
              </div>
            </div>
          </transition>

          <div
            v-if="loadError"
            class="rounded-xl border border-error-200 bg-error-50/90 px-4 py-3 text-sm text-error-700 shadow-sm dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-200"
          >
            <div class="flex items-start gap-2">
              <AlertCircle class="mt-0.5 h-5 w-5" />
              <div class="space-y-2">
                <p>Não foi possível carregar as opções de tipos de incidente.</p>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-lg bg-error-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-error-700"
                  @click="tentarNovamente"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
            <div v-if="isLoading" class="space-y-4">
              <div class="h-4 w-48 animate-pulse rounded bg-gray-200/70 dark:bg-gray-700"></div>
              <div class="grid gap-3 md:grid-cols-2">
                <div class="h-10 animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-700"></div>
                <div class="h-10 animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-700"></div>
              </div>
              <div class="h-24 animate-pulse rounded-lg bg-gray-200/70 dark:bg-gray-700"></div>
            </div>

            <NovaNotificacaoForm
              v-else
              ref="formRef"
              :tipos="tipos"
              show-cancel
              cancel-label="Voltar para o login"
              @cancel="voltarParaLogin"
              @created="handleCreated"
            />
          </div>
        </div>
      </main>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import NovaNotificacaoForm from './components/NovaNotificacaoForm.vue'
import type { NotificacaoTipo } from '@/types/notIncidentes'
import { fetchTiposNotificacao } from '@/services/notIncidentes'

const router = useRouter()
const tipos = ref<NotificacaoTipo[]>([])
const isLoading = ref(true)
const loadError = ref('')
const showSuccessMessage = ref(false)
const formRef = ref<InstanceType<typeof NovaNotificacaoForm> | null>(null)
const successTimeout = ref<number | null>(null)

const carregarTipos = async () => {
  try {
    const tiposResposta = await fetchTiposNotificacao({ qualidade: true, pesquisa: true, incluirSubtipos: true })
    tipos.value = tiposResposta
    loadError.value = ''
  } catch (error) {
    console.error('Erro ao carregar tipos de notificação', error)
    loadError.value = 'Erro ao carregar tipos'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  isLoading.value = true
  await carregarTipos()
})

const voltarParaLogin = () => {
  router.push('/login')
}

const handleCreated = () => {
  showSuccessMessage.value = true
  formRef.value?.resetForm()

  if (successTimeout.value) {
    window.clearTimeout(successTimeout.value)
  }

  successTimeout.value = window.setTimeout(() => {
    showSuccessMessage.value = false
  }, 6000)
}

const tentarNovamente = async () => {
  loadError.value = ''
  isLoading.value = true
  await carregarTipos()
}

onBeforeUnmount(() => {
  if (successTimeout.value) {
    window.clearTimeout(successTimeout.value)
  }
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
