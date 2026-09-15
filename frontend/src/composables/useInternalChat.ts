import { ref } from 'vue'

const isChatOpen = ref(false)

export const useInternalChat = () => {
  const open = () => {
    isChatOpen.value = true
  }

  const close = () => {
    isChatOpen.value = false
  }

  return {
    isOpen: isChatOpen,
    open,
    close,
  }
}
