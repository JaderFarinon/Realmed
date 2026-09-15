<template>
  <div class="relative" ref="dropdownRef">
    <button class="flex items-center text-gray-700 dark:text-gray-400" @click.prevent="toggleDropdown">
      <span class="mr-3 h-11 w-11 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
        <img :src="avatarSrc" alt="Foto do usuário" class="h-full w-full object-cover" />
      </span>

      <span class="block mr-1 font-medium text-theme-sm">{{ displayName }}</span>

      <ChevronDownIcon :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <!-- Dropdown Start -->
    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div>
        <span class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
          {{ displayName }}
        </span>
        <span v-if="displayEmail" class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {{ displayEmail }}
        </span>
      </div>

      <ul class="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <li v-for="item in menuItems" :key="item.text">
          <router-link
            v-if="item.href"
            :to="item.href"
            class="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            @click="closeDropdown()"
          >
            <component :is="item.icon" class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            {{ item.text }}
          </router-link>
          <button
            v-else
            type="button"
            class="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-gray-700 text-theme-sm transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            @click="item.onClick?.()"
          >
            <component :is="item.icon" class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
            {{ item.text }}
          </button>
        </li>
      </ul>
      <button
        type="button"
        @click="signOut"
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
      >
        <LogoutIcon class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
        Sair
      </button>
    </div>
    <!-- Dropdown End -->
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { ChevronDownIcon, ChatIcon, LogoutIcon, MailIcon, UserCircleIcon } from '@/icons'
import { useAuthUser } from '@/composables/useAuthUser'
import { useInternalChat } from '@/composables/useInternalChat'

const dropdownOpen = ref(false)
const dropdownRef = ref(null)

const router = useRouter()

const { authUser, clearUser } = useAuthUser()
const { open: openInternalChat } = useInternalChat()

const rawApiUrl =
  typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL.trim() !== ''
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:3002'
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '')
const assetBaseUrl = normalizedApiUrl.replace(/\/api$/i, '')

const avatarSrc = computed(() => {
  const avatarUrl = authUser.value?.avatarUrl
  if (!avatarUrl) {
    return '/images/user/owner.jpg'
  }

  if (/^https?:\/\//i.test(avatarUrl)) {
    return avatarUrl
  }

  return `${assetBaseUrl}/${avatarUrl.replace(/^\/+/, '')}`
})

const displayName = computed(() => {
  const name = authUser.value?.name?.trim()
  if (name) {
    return name
  }

  const username = authUser.value?.username?.trim()
  if (username) {
    return username
  }

  return 'Usuário'
})

const displayEmail = computed(() => {
  const email = authUser.value?.email?.trim()
  if (email) {
    return email
  }

  const username = authUser.value?.username?.trim()
  return username ?? ''
})

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const openChatModal = () => {
  openInternalChat()
  closeDropdown()
}

const menuItems = [
  { href: '/profile', icon: UserCircleIcon, text: 'Perfil' },
  { icon: ChatIcon, text: 'Chat Interno', onClick: openChatModal },
  { href: '/suporte', icon: MailIcon, text: 'Suporte' },
]

const signOut = () => {
  sessionStorage.clear()
  localStorage.removeItem('token')
  clearUser()
  closeDropdown()
  router.push('/login')
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
