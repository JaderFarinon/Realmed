<template>
  <main
    class="realmed-standalone flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950"
  >
    <section
      class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mb-8 text-center">
        <img src="/images/logo/logo-icon.svg" class="mx-auto h-14 w-14" alt="Realmed" />
        <h1 class="mt-4 text-2xl font-bold dark:text-white">REALMED</h1>
        <p class="mt-1 text-sm text-gray-500">Entre com sua conta Stenci ou Realmed.</p>
      </div>
      <form class="space-y-5" @submit.prevent="submit">
        <label class="block text-sm font-medium dark:text-gray-200"
          ><FieldLabel :required="true">Usuário</FieldLabel
          ><input
            v-model="username"
            autocomplete="username"
            required
            class="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950" /></label
        ><label class="block text-sm font-medium dark:text-gray-200"
          ><FieldLabel :required="true">Senha</FieldLabel
          ><input
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            class="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 dark:border-gray-700 dark:bg-gray-950"
        /></label>
        
        <button
          :disabled="loading"
          class="w-full rounded-lg bg-brand-500 px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
      <RouterLink to="/modo-fisio/entrar" class="mt-5 block rounded-lg border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
        Entrar pelo modo fisioterapeuta
      </RouterLink>
    </section>
  </main>
</template>
<script setup lang="ts">
import { unref as unwrapNoticeValue } from 'vue'
import { useFeedback } from '@/composables/useNotifications'
import FieldLabel from '@/components/FieldLabel.vue'
defineOptions({ name: 'LoginView' })
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
const username = ref('')
const password = ref('')
const error = ref(sessionStorage.getItem('auth_message') || '')
sessionStorage.removeItem('auth_message')
const loading = ref(false)
const router = useRouter()
const route = useRoute()
const submit = async () => {
  error.value = ''
  loading.value = true
  localStorage.removeItem('token')
  useAuthUser().clearUser()
  try {
    const { data } = await api.post('/auth/login', {
      username: username.value,
      password: password.value,
    })
    localStorage.setItem('token', data.token)
    const authenticatedUser = await useAuthUser().loadUser()
    if (!authenticatedUser) throw new Error('Não foi possível carregar o usuário autenticado.')
    await router.push(
      typeof route.query.redirect === 'string' ? route.query.redirect : '/inicio',
    )
  } catch (errorCaught: unknown) {
    localStorage.removeItem('token')
    useAuthUser().clearUser()
    const response = (errorCaught as { response?: { data?: { error?: string } } }).response
    error.value = response?.data?.error || 'Não foi possível entrar.'
  } finally {
    loading.value = false
  }
}

useFeedback(() => unwrapNoticeValue(error), () => 'error')
</script>
