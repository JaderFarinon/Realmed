import { readonly, ref } from 'vue'

export const PERMISSION_DENIED_MESSAGE = 'Você não tem permissão para utilizar esse recurso.'

const isModalOpen = ref(false)

export const usePermissionDeniedModalState = () => ({
  isOpen: readonly(isModalOpen),
})

export const showPermissionDeniedModal = () => {
  isModalOpen.value = true
}

export const hidePermissionDeniedModal = () => {
  isModalOpen.value = false
}
