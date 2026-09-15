<template>
  <div class="mb-6 last:mb-0">
    <div class="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex w-full flex-col items-center gap-5 xl:flex-row xl:items-center">
          <div class="relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              alt="Foto do usuário"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              {{ initials }}
            </div>
          </div>

          <div class="text-center xl:text-left">
            <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              {{ displayName }}
            </h4>
            <div class="mt-1 flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span v-if="user?.username">Usuário: {{ user.username }}</span>
              <span v-if="person?.email">E-mail: {{ person.email }}</span>
              <span v-if="person?.phone">Telefone: {{ person.phone }}</span>
            </div>
          </div>
        </div>

        <button class="edit-button" @click="openModal" :disabled="!user || !person">
          <svg
            class="fill-current"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.81583 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
              fill=""
            />
          </svg>
          Editar
        </button>
      </div>
    </div>

    <Modal v-if="isModalOpen" @close="closeModal">
      <template #body>
        <div
          class="no-scrollbar relative w-full max-w-[720px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10"
        >
          <button
            @click="closeModal"
            class="transition-color absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.07] dark:hover:text-gray-300"
            type="button"
          >
            <svg
              class="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M6.04289 16.5418C5.65237 16.9323 5.65237 17.5655 6.04289 17.956C6.43342 18.3465 7.06658 18.3465 7.45711 17.956L11.9987 13.4144L16.5408 17.9565C16.9313 18.347 17.5645 18.347 17.955 17.9565C18.3455 17.566 18.3455 16.9328 17.955 16.5423L13.4129 12.0002L17.955 7.45808C18.3455 7.06756 18.3455 6.43439 17.955 6.04387C17.5645 5.65335 16.9313 5.65335 16.5408 6.04387L11.9987 10.586L7.45711 6.04439C7.06658 5.65386 6.43342 5.65386 6.04289 6.04439C5.65237 6.43491 5.65237 7.06808 6.04289 7.4586L10.5845 12.0002L6.04289 16.5418Z"
                fill=""
              />
            </svg>
          </button>

          <div class="px-2 pr-14">
            <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Editar dados da conta
            </h4>
            <p class="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Atualize sua foto, informações de contato e credenciais de acesso.
            </p>
          </div>

          <form class="flex flex-col gap-8" @submit.prevent="submitAccount">
            <section class="space-y-4 px-2">
              <h5 class="text-base font-semibold text-gray-800 dark:text-white/90">
                Foto de perfil
              </h5>
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div class="relative h-24 w-24 overflow-hidden rounded-full border border-dashed border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                  <img
                    v-if="avatarPreview"
                    :src="avatarPreview"
                    alt="Pré-visualização da foto"
                    class="h-full w-full object-cover"
                  />
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center bg-gray-200 text-sm font-semibold uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {{ initials }}
                  </div>
                </div>
                <div class="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <label class="inline-flex cursor-pointer items-center gap-2 text-brand-600 hover:text-brand-500">
                    <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="handleFileChange" />
                    <span class="rounded-lg border border-brand-200 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10">
                      Selecionar arquivo
                    </span>
                  </label>
                  <button
                    v-if="showRemoveAvatarButton"
                    class="text-left text-sm text-error-500 hover:text-error-600"
                    type="button"
                    @click="handleRemoveAvatar"
                  >
                    Remover foto
                  </button>
                  <p class="text-xs text-gray-500 dark:text-gray-500">
                    Formatos suportados: PNG, JPG ou GIF. Tamanho máximo de 5 MB.
                  </p>
                </div>
              </div>
            </section>

            <section class="px-2">
              <h5 class="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Informações básicas
              </h5>
              <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div class="col-span-2">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome completo
                  </label>
                  <input
                    v-model="accountForm.full_name"
                    type="text"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                    placeholder="Informe seu nome completo"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    E-mail
                  </label>
                  <input
                    v-model="accountForm.email"
                    type="email"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                    placeholder="nome@empresa.com"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefone
                  </label>
                  <input
                    v-model="accountForm.phone"
                    type="text"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome de usuário
                  </label>
                  <input
                    v-model="accountForm.username"
                    type="text"
                    class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                    placeholder="usuario"
                  />
                </div>
              </div>
            </section>

            <div class="flex flex-col gap-3 px-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05] sm:w-auto"
                @click="closeModal"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300 sm:w-auto"
                :disabled="isSavingAccount"
              >
                <span v-if="isSavingAccount">Salvando...</span>
                <span v-else>Salvar alterações</span>
              </button>
            </div>
          </form>

          <hr class="my-8 border-gray-200 dark:border-gray-700" />

          <form class="flex flex-col gap-4 px-2" @submit.prevent="submitPassword">
            <div>
              <h5 class="text-base font-semibold text-gray-800 dark:text-white/90">Alterar senha</h5>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Defina uma nova senha para acessar o sistema.
              </p>
            </div>
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Senha atual
                </label>
                <input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  autocomplete="current-password"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Digite sua senha atual"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nova senha
                </label>
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Informe a nova senha"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmar nova senha
                </label>
                <input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
            <p v-if="passwordError" class="text-sm text-error-500">{{ passwordError }}</p>
            <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="submit"
                class="flex w-full justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-600 dark:bg-brand-600 dark:hover:bg-brand-500 sm:w-auto"
                :disabled="isSavingPassword"
              >
                <span v-if="isSavingPassword">Atualizando...</span>
                <span v-else>Atualizar senha</span>
              </button>
            </div>
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import Modal from './Modal.vue'

interface Person {
  id: number
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
}

interface UserAccount {
  id: number
  username: string
}

interface AccountUpdatePayload {
  fullName: string
  email: string
  phone: string
  username: string
  avatarFile?: File | null
  removeAvatar?: boolean
}

interface PasswordUpdatePayload {
  currentPassword: string
  newPassword: string
}

const props = defineProps<{
  person: Person | null
  user: UserAccount | null
  avatarUrl: string | null
  isLoading: boolean
  isSavingAccount: boolean
  isSavingPassword: boolean
  accountUpdateToken: number
  passwordUpdateToken: number
}>()

const emit = defineEmits<{
  (e: 'save-account', payload: AccountUpdatePayload): void
  (e: 'change-password', payload: PasswordUpdatePayload): void
}>()

const isModalOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const accountForm = reactive({
  full_name: '',
  email: '',
  phone: '',
  username: '',
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordError = ref<string | null>(null)

const selectedFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const previewObjectUrl = ref<string | null>(null)
const removeAvatar = ref(false)

const showRemoveAvatarButton = computed(() => {
  if (removeAvatar.value) {
    return false
  }

  if (selectedFile.value) {
    return true
  }

  if (avatarPreview.value) {
    return true
  }

  return Boolean(props.avatarUrl)
})

const displayName = computed(
  () => accountForm.full_name || props.person?.full_name || props.user?.username || 'Usuário'
)

const initials = computed(() => {
  const name = (props.person?.full_name || props.user?.username || 'Usuário').trim()
  if (!name) return 'U'
  const parts = name.split(/\s+/).filter(Boolean)
  const [first, second] = [parts[0], parts[parts.length - 1]]
  return ((first?.[0] || '') + (second && second !== first ? second[0] : '')).toUpperCase() || 'U'
})

const syncAccountForm = () => {
  accountForm.full_name = props.person?.full_name ?? ''
  accountForm.email = props.person?.email ?? ''
  accountForm.phone = props.person?.phone ?? ''
  accountForm.username = props.user?.username ?? ''
}

const clearPreviewObjectUrl = () => {
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value)
    previewObjectUrl.value = null
  }
}

const resetAccountState = () => {
  syncAccountForm()
  selectedFile.value = null
  removeAvatar.value = false
  clearPreviewObjectUrl()
  avatarPreview.value = props.avatarUrl ?? null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const resetPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordError.value = null
}

const openModal = () => {
  resetAccountState()
  resetPasswordForm()
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  resetAccountState()
  resetPasswordForm()
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    return
  }
  selectedFile.value = file
  removeAvatar.value = false
  clearPreviewObjectUrl()
  const objectUrl = URL.createObjectURL(file)
  previewObjectUrl.value = objectUrl
  avatarPreview.value = objectUrl
}

const handleRemoveAvatar = () => {
  removeAvatar.value = true
  selectedFile.value = null
  clearPreviewObjectUrl()
  avatarPreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const submitAccount = () => {
  emit('save-account', {
    fullName: accountForm.full_name.trim(),
    email: accountForm.email.trim(),
    phone: accountForm.phone.trim(),
    username: accountForm.username.trim(),
    avatarFile: selectedFile.value,
    removeAvatar: removeAvatar.value,
  })
}

const submitPassword = () => {
  passwordError.value = null

  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    passwordError.value = 'A nova senha deve conter ao menos 6 caracteres.'
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = 'As senhas informadas não conferem.'
    return
  }

  emit('change-password', {
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword,
  })
}

watch(
  () => props.person,
  () => {
    syncAccountForm()
    if (!selectedFile.value && !removeAvatar.value) {
      avatarPreview.value = props.avatarUrl ?? null
    }
  },
  { immediate: true }
)

watch(
  () => props.user,
  () => {
    accountForm.username = props.user?.username ?? ''
  },
  { immediate: true }
)

watch(
  () => props.avatarUrl,
  (value) => {
    if (!selectedFile.value && !removeAvatar.value) {
      avatarPreview.value = value ?? null
    }
  },
  { immediate: true }
)

watch(
  () => props.accountUpdateToken,
  () => {
    resetAccountState()
    isModalOpen.value = false
  }
)

watch(
  () => props.passwordUpdateToken,
  () => {
    resetPasswordForm()
  }
)

watch(isModalOpen, (open) => {
  if (!open) {
    clearPreviewObjectUrl()
  }
})
</script>
