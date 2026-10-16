<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <aside
      id="realmed-menu"
      class="realmed-sidebar fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
      :class="{ 'is-open': open, 'is-collapsed': collapsed }"
      :inert="!menuVisible"
      @keydown.esc="open = false"
    >
      <div class="mb-8 flex items-center justify-between gap-2">
        <RouterLink
          to="/dashboard"
          class="flex items-center gap-3 font-semibold text-gray-900 dark:text-white"
        >
          <img src="/images/logo/logo-icon.svg" class="h-8 w-8" alt="Realmed" /> REALMED
        </RouterLink>
        <button
          class="table-action-button lg:hidden"
          aria-label="Fechar menu"
          title="Fechar menu"
          aria-controls="realmed-menu"
          :aria-expanded="menuVisible"
          @click="open = false"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>
      <nav class="space-y-2">
        <RouterLink to="/dashboard" class="menu-link">Dashboard</RouterLink>
        <MenuGroup
          id="guides"
          label="Central de Guias"
          :active="route.path.startsWith('/central-de-guias/')"
        >
          <RouterLink to="/central-de-guias/novo" class="menu-link sub">Novo Tratamento</RouterLink>
          <RouterLink to="/central-de-guias/tratamentos" class="menu-link sub"
            >Gestão de Tratamentos</RouterLink
          >
        </MenuGroup>
        <RouterLink to="/pacientes" class="menu-link">Pacientes</RouterLink>
        <MenuGroup id="inventory" label="Estoque" :active="route.path.startsWith('/estoque/')">
          <RouterLink
            v-for="item in inventoryMenu"
            :key="item[0]"
            :to="`/estoque/${item[0]}`"
            class="menu-link sub"
            >{{ item[1] }}</RouterLink
          >
        </MenuGroup>
        <MenuGroup id="catalog" label="Cadastros" :active="route.path.startsWith('/cadastros/')">
          <RouterLink to="/cadastros/convenios" class="menu-link sub">Convênios</RouterLink>
          <RouterLink to="/cadastros/profissionais" class="menu-link sub">Profissionais</RouterLink>
          <RouterLink to="/cadastros/procedimentos" class="menu-link sub">Procedimentos</RouterLink>
          <RouterLink to="/cadastros/modelos-documentos" class="menu-link sub"
            >Modelos de Documentos</RouterLink
          >
        </MenuGroup>
        <MenuGroup
          id="settings"
          label="Configurações"
          :active="route.path === '/usuarios' || route.path.startsWith('/configuracoes/')"
        >
          <RouterLink to="/usuarios" class="menu-link sub">Usuários</RouterLink>
          <RouterLink to="/configuracoes/permissoes" class="menu-link sub">Permissões</RouterLink>
        </MenuGroup>
        <MenuGroup
          id="integrations"
          label="Integrações"
          :active="route.path.startsWith('/integracoes/')"
        >
          <RouterLink to="/integracoes/stenci" class="menu-link sub">Stenci</RouterLink>
        </MenuGroup>
      </nav>
    </aside>
    <div class="realmed-content" :class="{ 'menu-collapsed': collapsed }">
      <header
        class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6"
      >
        <button
          v-show="desktop || !open"
          class="table-action-button"
          :aria-label="menuToggleLabel"
          :title="menuToggleLabel"
          aria-controls="realmed-menu"
          :aria-expanded="menuVisible"
          @click="toggleMenu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
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
    <StenciRefreshDialog />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthUser } from '@/composables/useAuthUser'
import api from '@/plugins/axios'
import StenciRefreshDialog from '@/components/StenciRefreshDialog.vue'
import MenuGroup from '@/components/layout/MenuGroup.vue'
const open = ref(false)
const desktopQuery = window.matchMedia('(min-width: 1024px)')
const desktop = ref(desktopQuery.matches)
const collapsed = ref(localStorage.getItem('realmed_menu_collapsed') === 'true')
const menuVisible = computed(() => (desktop.value ? !collapsed.value : open.value))
const menuToggleLabel = computed(() =>
  desktop.value
    ? collapsed.value
      ? 'Expandir menu'
      : 'Recolher menu'
    : open.value
      ? 'Fechar menu'
      : 'Abrir menu',
)
const updateViewport = () => {
  desktop.value = desktopQuery.matches
  open.value = false
}
desktopQuery.addEventListener('change', updateViewport)
onBeforeUnmount(() => desktopQuery.removeEventListener('change', updateViewport))
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)
function toggleMenu() {
  if (desktop.value) {
    collapsed.value = !collapsed.value
    localStorage.setItem('realmed_menu_collapsed', String(collapsed.value))
  } else open.value = !open.value
}
const router = useRouter()
const { authUser, clearUser } = useAuthUser()
const inventoryMenu = [
  ['resumo', 'Resumo'],
  ['saldos', 'Saldos e ajustes'],
  ['pedidos', 'Pedidos'],
  ['notas-fiscais', 'Notas fiscais'],
  ['produtos', 'Produtos'],
  ['fornecedores', 'Fornecedores'],
  ['setores', 'Setores'],
  ['categorias', 'Categorias'],
  ['apresentacoes', 'Apresentações'],
  ['relatorios', 'Relatórios'],
]
const logout = async () => {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('token')
    clearUser()
    await router.push('/login')
  }
}
</script>
<style scoped>
.realmed-sidebar {
  transform: translateX(-100%);
  transition: transform 180ms ease;
}
.realmed-sidebar.is-open {
  transform: translateX(0);
}
.realmed-content {
  transition: padding-left 180ms ease;
}
@media (min-width: 1024px) {
  .realmed-sidebar {
    transform: translateX(0);
  }
  .realmed-sidebar.is-collapsed {
    transform: translateX(-100%);
  }
  .realmed-content {
    padding-left: 16rem;
  }
  .realmed-content.menu-collapsed {
    padding-left: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .realmed-sidebar,
  .realmed-content {
    transition: none;
  }
}
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
.menu-link.sub {
  padding-left: 2rem;
  font-size: 0.9rem;
}
</style>
