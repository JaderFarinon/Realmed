<template>
  <div class="mb-6 last:mb-0">
    <div class="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div class="w-full">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Informações pessoais
          </h4>

          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-20">
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">CPF</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ person?.cpf || '—' }}</p>
            </div>
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Data de nascimento</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ formattedBirthDate }}</p>
            </div>
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Gênero</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ person?.gender || '—' }}</p>
            </div>
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado civil</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ person?.marital_status || '—' }}</p>
            </div>
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Nacionalidade</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ person?.nationality || '—' }}</p>
            </div>
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Naturalidade</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ person?.birthplace || '—' }}</p>
            </div>
            <div>
              <p class="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Tipo sanguíneo</p>
              <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ person?.blood_type || '—' }}</p>
            </div>
          </div>
        </div>

        <button class="edit-button" @click="openModal" :disabled="!person">
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
          class="no-scrollbar relative w-full max-w-[680px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-10"
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
              Editar informações pessoais
            </h4>
            <p class="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Atualize seus dados pessoais conforme necessário.
            </p>
          </div>

          <form class="flex flex-col gap-6 px-2" @submit.prevent="submitForm">
            <div class="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">CPF</label>
                <input
                  v-model="form.cpf"
                  type="text"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Data de nascimento
                </label>
                <input
                  v-model="form.birth_date"
                  type="date"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gênero</label>
                <input
                  v-model="form.gender"
                  type="text"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Feminino, Masculino, ..."
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Estado civil</label>
                <input
                  v-model="form.marital_status"
                  type="text"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Solteiro(a), Casado(a), ..."
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nacionalidade</label>
                <input
                  v-model="form.nationality"
                  type="text"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Brasileira"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Naturalidade</label>
                <input
                  v-model="form.birthplace"
                  type="text"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="Cidade/UF"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo sanguíneo
                </label>
                <input
                  v-model="form.blood_type"
                  type="text"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
                  placeholder="O+, A-, ..."
                />
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:justify-end">
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
                :disabled="isSaving || !person"
              >
                <span v-if="isSaving">Salvando...</span>
                <span v-else>Salvar informações</span>
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
  cpf: string
  birth_date: string | null
  gender: string | null
  marital_status: string | null
  nationality: string | null
  birthplace: string | null
  blood_type: string | null
}

const props = defineProps<{
  person: (Person & { [key: string]: any }) | null
  isSaving: boolean
  updateToken: number
}>()

const emit = defineEmits<{
  (e: 'update-personal', payload: Partial<Person>): void
}>()

const isModalOpen = ref(false)

const form = reactive({
  cpf: '',
  birth_date: '',
  gender: '',
  marital_status: '',
  nationality: '',
  birthplace: '',
  blood_type: '',
})

const formattedBirthDate = computed(() => {
  if (!props.person?.birth_date) return '—'
  const date = new Date(props.person.birth_date)
  if (Number.isNaN(date.getTime())) {
    return props.person.birth_date
  }
  return new Intl.DateTimeFormat('pt-BR').format(date)
})

const syncForm = () => {
  form.cpf = props.person?.cpf ?? ''
  form.birth_date = props.person?.birth_date ? props.person.birth_date.substring(0, 10) : ''
  form.gender = props.person?.gender ?? ''
  form.marital_status = props.person?.marital_status ?? ''
  form.nationality = props.person?.nationality ?? ''
  form.birthplace = props.person?.birthplace ?? ''
  form.blood_type = props.person?.blood_type ?? ''
}

const openModal = () => {
  syncForm()
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  syncForm()
}

const submitForm = () => {
  emit('update-personal', {
    cpf: form.cpf.trim(),
    birth_date: form.birth_date ? form.birth_date : null,
    gender: form.gender.trim() || null,
    marital_status: form.marital_status.trim() || null,
    nationality: form.nationality.trim() || null,
    birthplace: form.birthplace.trim() || null,
    blood_type: form.blood_type.trim() || null,
  })
}

watch(
  () => props.person,
  () => {
    syncForm()
  },
  { immediate: true }
)

watch(
  () => props.updateToken,
  () => {
    syncForm()
    isModalOpen.value = false
  }
)
</script>
