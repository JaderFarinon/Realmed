<template>
  <admin-layout>
    <PageBreadcrumb :pageTitle="currentPageTitle" />

    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6"
    >
      <div class="mb-5 flex items-center justify-between lg:mb-7">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Perfil</h3>
        <button
          v-if="!isLoadingProfile"
          type="button"
          class="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          @click="reloadProfile"
        >
          Recarregar dados
        </button>
      </div>

      <div
        v-if="isLoadingProfile && (!profile.user || !profile.person)"
        class="flex items-center justify-center rounded-xl border border-dashed border-gray-200 p-10 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        Carregando informações do perfil...
      </div>

      <div
        v-else-if="!profile.user || !profile.person"
        class="flex items-center justify-center rounded-xl border border-dashed border-gray-200 p-10 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        Não foi possível carregar os dados do perfil.
      </div>

      <template v-else>
        <profile-card
          :user="profile.user"
          :person="profile.person"
          :avatar-url="avatarUrl"
          :is-loading="isLoadingProfile"
          :is-saving-account="isSavingAccount"
          :is-saving-password="isSavingPassword"
          :account-update-token="accountUpdateToken"
          :password-update-token="passwordUpdateToken"
          @save-account="handleSaveAccount"
          @change-password="handleChangePassword"
        />
        <personal-info-card
          :person="profile.person"
          :is-saving="isSavingPersonalInfo"
          :update-token="personalInfoUpdateToken"
          @update-personal="handleUpdatePersonalInfo"
        />
        <address-card
          :person="profile.person"
          :is-saving="isSavingAddress"
          :update-token="addressUpdateToken"
          @update-address="handleUpdateAddress"
        />
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ProfileCard from '@/components/profile/ProfileCard.vue'
import PersonalInfoCard from '@/components/profile/PersonalInfoCard.vue'
import AddressCard from '@/components/profile/AddressCard.vue'
import api from '@/plugins/axios'
import { useAuthUser } from '@/composables/useAuthUser'
import { useToast } from '@/composables/useToast'

interface Person {
  id: number
  cpf: string
  full_name: string
  email: string
  birth_date: string | null
  phone: string | null
  blood_type: string | null
  zip_code: string | null
  street: string | null
  number: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  gender: string | null
  marital_status: string | null
  nationality: string | null
  birthplace: string | null
  avatar_url: string | null
}

interface UserAccount {
  id: number
  username: string
  status: string
  role: string
  person_id: number
  created_at: string | null
  updated_at: string | null
  last_login: string | null
}

interface UserApiResponse extends UserAccount {
  person: Person
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

const currentPageTitle = ref('Perfil do Usuário')

const { loadUser, refreshUser } = useAuthUser()
const toast = useToast()

const profile = reactive<{ user: UserAccount | null; person: Person | null }>({
  user: null,
  person: null,
})

const isLoadingProfile = ref(false)
const isSavingAccount = ref(false)
const isSavingPassword = ref(false)
const isSavingPersonalInfo = ref(false)
const isSavingAddress = ref(false)

const accountUpdateToken = ref(0)
const passwordUpdateToken = ref(0)
const personalInfoUpdateToken = ref(0)
const addressUpdateToken = ref(0)

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3002'
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '')
const assetBaseUrl = normalizedApiUrl.replace(/\/api$/i, '')

const avatarUrl = computed(() => {
  const avatarPath = profile.person?.avatar_url
  if (!avatarPath) return null
  if (/^https?:\/\//i.test(avatarPath)) {
    return avatarPath
  }
  return `${assetBaseUrl}/${avatarPath.replace(/^\/+/, '')}`
})

const handleError = (defaultMessage: string, error: unknown) => {
  const message =
    // @ts-expect-error - axios error structure
    error?.response?.data?.error ||
    // @ts-expect-error - axios error structure
    error?.response?.data?.mensagem ||
    (error instanceof Error ? error.message : null) ||
    defaultMessage

  toast.error(message)
   
  console.error(defaultMessage, error)
}

const normalizeOptional = (value: string | null | undefined) => {
  if (typeof value !== 'string') {
    return value ?? null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const mapPersonPayload = (person: Person) => ({
  cpf: (person.cpf || '').trim(),
  full_name: (person.full_name || '').trim(),
  email: (person.email || '').trim(),
  birth_date: person.birth_date ? person.birth_date.substring(0, 10) : null,
  phone: normalizeOptional(person.phone),
  blood_type: normalizeOptional(person.blood_type),
  zip_code: normalizeOptional(person.zip_code),
  street: normalizeOptional(person.street),
  number: normalizeOptional(person.number),
  neighborhood: normalizeOptional(person.neighborhood),
  city: normalizeOptional(person.city),
  state: normalizeOptional(person.state),
  gender: normalizeOptional(person.gender),
  marital_status: normalizeOptional(person.marital_status),
  nationality: normalizeOptional(person.nationality),
  birthplace: normalizeOptional(person.birthplace),
  avatar_url: normalizeOptional(person.avatar_url),
})

const loadProfile = async (showLoader = true) => {
  if (showLoader) {
    isLoadingProfile.value = true
  }

  try {
    const user = await loadUser()
    if (!user?.id) {
      throw new Error('Usuário não autenticado.')
    }

    const { data } = await api.get<UserApiResponse>(`/users/${user.id}`)

    profile.user = {
      id: data.id,
      username: data.username,
      status: data.status,
      role: data.role,
      person_id: data.person_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      last_login: data.last_login,
    }

    profile.person = data.person
  } catch (error) {
    handleError('Não foi possível carregar os dados do perfil.', error)
  } finally {
    if (showLoader) {
      isLoadingProfile.value = false
    }
  }
}

const reloadProfile = () => {
  loadProfile()
}

const handleSaveAccount = async (payload: AccountUpdatePayload) => {
  if (!profile.person || !profile.user) return

  isSavingAccount.value = true
  try {
    const updatedPerson: Person = {
      ...profile.person,
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone.trim() ? payload.phone.trim() : null,
    }

    await api.put(`/people/${profile.person.id}`, mapPersonPayload(updatedPerson))

    if (payload.username && payload.username !== profile.user.username) {
      await api.put(`/users/${profile.user.id}`, { username: payload.username })
    }

    if (payload.avatarFile) {
      const formData = new FormData()
      formData.append('avatar', payload.avatarFile)
      await api.post(`/people/${profile.person.id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    } else if (payload.removeAvatar) {
      await api.delete(`/people/${profile.person.id}/avatar`)
    }

    toast.success('Informações da conta atualizadas com sucesso.')

    await loadProfile(false)
    await refreshUser()
    accountUpdateToken.value = Date.now()
  } catch (error) {
    handleError('Não foi possível atualizar as informações da conta.', error)
  } finally {
    isSavingAccount.value = false
  }
}

const handleChangePassword = async ({ currentPassword, newPassword }: PasswordUpdatePayload) => {
  if (!profile.user) return

  isSavingPassword.value = true
  try {
    await api.put(`/users/${profile.user.id}/password`, {
      currentPassword,
      newPassword,
    })

    toast.success('Senha atualizada com sucesso.')
    passwordUpdateToken.value = Date.now()
  } catch (error) {
    handleError('Não foi possível atualizar a senha.', error)
  } finally {
    isSavingPassword.value = false
  }
}

const handleUpdatePersonalInfo = async (payload: Partial<Person>) => {
  if (!profile.person) return

  isSavingPersonalInfo.value = true
  try {
    const updatedPerson: Person = {
      ...profile.person,
      ...payload,
    }

    await api.put(`/people/${profile.person.id}`, mapPersonPayload(updatedPerson))

    toast.success('Informações pessoais atualizadas com sucesso.')
    await loadProfile(false)
    personalInfoUpdateToken.value = Date.now()
  } catch (error) {
    handleError('Não foi possível atualizar as informações pessoais.', error)
  } finally {
    isSavingPersonalInfo.value = false
  }
}

const handleUpdateAddress = async (payload: Partial<Person>) => {
  if (!profile.person) return

  isSavingAddress.value = true
  try {
    const updatedPerson: Person = {
      ...profile.person,
      ...payload,
    }

    await api.put(`/people/${profile.person.id}`, mapPersonPayload(updatedPerson))

    toast.success('Endereço atualizado com sucesso.')
    await loadProfile(false)
    addressUpdateToken.value = Date.now()
  } catch (error) {
    handleError('Não foi possível atualizar o endereço.', error)
  } finally {
    isSavingAddress.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>
