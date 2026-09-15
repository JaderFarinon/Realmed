<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white p-5 transition-transform dark:border-gray-800 dark:bg-gray-900',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      ]"
    >
      <RouterLink
        to="/dashboard"
        class="mb-8 flex items-center gap-3 font-semibold text-gray-900 dark:text-white"
      >
        <img src="/images/logo/logo-icon.svg" class="h-8 w-8" alt="Realmed" /> REALMED
      </RouterLink>
      <nav class="space-y-2">
        <RouterLink to="/dashboard" class="menu-link">Dashboard</RouterLink>
        <RouterLink to="/central-de-guias" class="menu-link">Central de Guias</RouterLink>
        <RouterLink to="/pacientes" class="menu-link">Pacientes</RouterLink>
        <p class="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Cadastros</p>
        <RouterLink to="/cadastros/convenios" class="menu-link sub">Convênios</RouterLink>
        <RouterLink to="/cadastros/profissionais" class="menu-link sub">Profissionais</RouterLink>
        <RouterLink to="/cadastros/procedimentos" class="menu-link sub">Procedimentos</RouterLink>
        <RouterLink to="/cadastros/modelos-documentos" class="menu-link sub">Modelos de Documentos</RouterLink>
        <RouterLink v-if="isAdmin" to="/usuarios" class="menu-link">Usuários</RouterLink>
        <p v-if="isAdmin" class="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Integrações</p>
        <RouterLink v-if="isAdmin" to="/integracoes/stenci" class="menu-link sub">Stenci</RouterLink>
      </nav>
    </aside>
    <div class="lg:pl-64">
      <header
        class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6"
      >
        <button class="rounded-lg p-2 lg:hidden" aria-label="Abrir menu" @click="open = !open">
          ☰
        </button>
        <span class="ml-auto text-sm text-gray-600 dark:text-gray-300">{{
          authUser?.name || authUser?.username
        }}</span>
        <button
          class="ml-4 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:text-white"
          @click="logout"
        >
          Sair
        </button>
      </header>
      <main class="p-4 sm:p-6"><slot /></main>
    </div>
    <button
      v-if="open"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      aria-label="Fechar menu"
      @click="open = false"
    />
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthUser } from '@/composables/useAuthUser'
const open = ref(false)
const router = useRouter()
const { authUser, clearUser } = useAuthUser()
const isAdmin = computed(() => ['masteradmin', 'admin'].includes(authUser.value?.role || ''))
const logout = () => {
  localStorage.removeItem('token')
  clearUser()
  router.push('/login')
}
;</script>
<style scoped>
.menu-link {
  display: block;
  border-radius: 0.5rem;
  padding: 0.7rem 1rem;
  color: #475467;
}
.menu-link:hover,
.router-link-active {
  background: #ecf3ff;
  color: #465fff;
}
.dark .menu-link {
  color: #d0d5dd;
}
.menu-link.sub { padding-left: 2rem; font-size: .9rem; }
</style>
