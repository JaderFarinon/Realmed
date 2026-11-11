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
          to="/inicio"
          class="flex items-center gap-3 text-base font-semibold text-gray-900 dark:text-white"
        >
          <img src="/images/logo/logo-icon.svg" class="h-8 w-8" alt="Realmed" /> REALMED
        </RouterLink>
      </div>
      <nav class="space-y-2">
        <MenuGroup id="catalog" label="Cadastros" :active="route.path.startsWith('/cadastros/')">
          <RouterLink to="/cadastros/convenios" class="menu-link sub">Convênios</RouterLink>
          <RouterLink to="/cadastros/profissionais" class="menu-link sub">Profissionais</RouterLink>
          <RouterLink to="/cadastros/modelos-documentos" class="menu-link sub"
            >Modelos de Documentos</RouterLink
          >
        </MenuGroup>
        <MenuGroup id="inventory" label="Estoque" :active="route.path.startsWith('/estoque/')">
          <RouterLink
            v-for="item in inventoryMenu"
            :key="item[0]"
            :to="`/estoque/${item[0]}`"
            class="menu-link sub"
            >{{ item[1] }}</RouterLink
          >
        </MenuGroup>
        <MenuGroup
          id="billing"
          label="Faturamento"
          :active="route.path.startsWith('/faturamento/')"
        >
          <RouterLink to="/faturamento/dashboard" class="menu-link sub">Dashboard</RouterLink>
          <RouterLink to="/faturamento/relatorios" class="menu-link sub">Relatórios</RouterLink>
        </MenuGroup>
        <MenuGroup
          id="integrations"
          label="Integrações"
          :active="route.path.startsWith('/integracoes/')"
        >
          <RouterLink to="/integracoes/stenci" class="menu-link sub">Stenci</RouterLink>
        </MenuGroup>
        <RouterLink to="/pacientes" class="menu-link">Pacientes</RouterLink>
        <MenuGroup
          id="guides"
          label="Tratamentos"
          :active="route.path.startsWith('/central-de-guias/')"
        >
          <RouterLink to="/central-de-guias/dashboard" class="menu-link sub">Dashboard</RouterLink>
          <RouterLink to="/central-de-guias/novo" class="menu-link sub">Novo Tratamento</RouterLink>
          <RouterLink to="/central-de-guias/tratamentos" class="menu-link sub"
            >Gestão de Tratamentos</RouterLink
          >
          <RouterLink to="/modo-fisio" class="menu-link sub">Modo Fisioterapeuta</RouterLink>
        </MenuGroup>
      </nav>
    </aside>
    <div class="realmed-content" :class="{ 'menu-collapsed': collapsed }">
      <header
        class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6"
      >
        <button
          id="realmed-menu-toggle"
          class="table-action-button"
          :class="{ 'menu-toggle-overlay': !desktop && open }"
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
        <div ref="accountMenu" class="account-menu ml-auto" @keydown.esc.stop.prevent="closeAccountMenu(true)" @focusout="accountFocusOut">
          <button ref="accountTrigger" id="realmed-account-button" type="button" class="account-trigger" :aria-label="'Menu de ' + (authUser?.name || authUser?.username || 'usuário')" aria-haspopup="menu" aria-controls="realmed-account-menu" :aria-expanded="accountOpen" @click="accountOpen = !accountOpen" @keydown.down.prevent="openAccountMenu()" @keydown.up.prevent="openAccountMenu(true)">
            <span class="account-avatar" aria-hidden="true">{{ (authUser?.name || authUser?.username || 'U').slice(0, 1).toLocaleUpperCase('pt-BR') }}</span>
            <span class="account-name">{{ authUser?.name || authUser?.username || 'Minha conta' }}</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div v-if="accountOpen" id="realmed-account-menu" role="menu" aria-labelledby="realmed-account-button" class="account-dropdown" @keydown.down.prevent="moveAccountFocus(1)" @keydown.up.prevent="moveAccountFocus(-1)" @keydown.home.prevent="openAccountMenu()" @keydown.end.prevent="openAccountMenu(true)">
            <RouterLink to="/meu-perfil" role="menuitem" class="account-item" @click="closeAccountMenu()">Meu Perfil</RouterLink>
            <RouterLink to="/configuracoes" role="menuitem" class="account-item" @click="closeAccountMenu()">Configurações</RouterLink>
            <button type="button" role="menuitem" class="account-item account-logout" @click="closeAccountMenu(); logout()">Sair</button>
          </div>
        </div>
      </header>
      <main tabindex="-1" class="p-4 focus:outline-none sm:p-6"><slot /></main>
    </div>
    <button
      v-if="open"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      aria-label="Fechar menu pela área externa"
      @click="open = false"
    />
    <BackToTop />
    <StenciRefreshDialog />
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthUser } from '@/composables/useAuthUser'
import api from '@/plugins/axios'
import StenciRefreshDialog from '@/components/StenciRefreshDialog.vue'
import MenuGroup from '@/components/layout/MenuGroup.vue'
import BackToTop from '@/components/BackToTop.vue'
const accountOpen = ref(false), accountMenu = ref<HTMLElement>(), accountTrigger = ref<HTMLButtonElement>()
function closeAccountMenu(restoreFocus = false) {
  accountOpen.value = false
  if (restoreFocus) accountTrigger.value?.focus()
}
async function openAccountMenu(last = false) {
  accountOpen.value = true
  await nextTick()
  const items = accountMenu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]')
  items?.[last ? items.length - 1 : 0]?.focus()
}
function moveAccountFocus(direction: number) {
  const items = Array.from(accountMenu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [])
  const index = items.findIndex(item => item === document.activeElement)
  items[(index + direction + items.length) % items.length]?.focus()
}
function accountFocusOut(event: FocusEvent) {
  if (!accountMenu.value?.contains(event.relatedTarget as Node | null)) closeAccountMenu()
}
function outsideAccountMenu(event: PointerEvent) {
  if (!accountMenu.value?.contains(event.target as Node)) closeAccountMenu()
}
onMounted(() => document.addEventListener('pointerdown', outsideAccountMenu))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outsideAccountMenu))
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
    closeAccountMenu()
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
  ['saldos', 'Saldos e Ajustes'],
  ['requisicoes', 'Requisições para Consumo'],
  ['pedidos', 'Pedidos de Compra'],
  ['requisicoes-anteriores', 'Requisições Anteriores'],
  ['notas-fiscais', 'Notas Fiscais'],
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
.account-menu { position: relative; min-width: 0; }
.account-trigger { display: flex; align-items: center; gap: 0.5rem; border: 1px solid #e4e7ec; border-radius: 0.75rem; padding: 0.4rem 0.65rem; background: white; color: #344054; }
.account-trigger:hover, .account-trigger[aria-expanded="true"] { background: #f9fafb; border-color: #c7d7fe; }
.account-trigger:focus-visible, .account-item:focus-visible { outline: 2px solid #465fff; outline-offset: 2px; }
.account-avatar { display: grid; place-items: center; width: 2rem; height: 2rem; flex-shrink: 0; border-radius: 50%; background: #eef4ff; color: #3641f5; font-weight: 600; }
.account-name { max-width: min(18rem, 48vw); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-dropdown { position: absolute; top: calc(100% + 0.5rem); right: 0; z-index: 60; width: min(16rem, calc(100vw - 2rem)); padding: 0.35rem; border: 1px solid #e4e7ec; border-radius: 0.75rem; background: #fff; box-shadow: 0 8px 24px #10182826; }
.account-item { display: block; width: 100%; padding: 0.7rem 0.8rem; border-radius: 0.5rem; text-align: left; color: #344054; }
.account-item:hover, .account-item:focus { background: #f2f4f7; }
.account-logout { color: #b42318; border-top: 1px solid #f2f4f7; }

.menu-toggle-overlay {
  position: fixed;
  top: 0.75rem;
  left: calc(16rem + 0.75rem);
  z-index: 50;
  background: white;
}
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
}
</style>
