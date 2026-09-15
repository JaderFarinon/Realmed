<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="handleClose">
    <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-theme-lg dark:bg-gray-900">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col items-center gap-2 text-center">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Acesso restrito</h2>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            {{ permissionDeniedMessage }}
          </p>
        </div>
        <div class="flex justify-center">
          <Button @click="handleClose">Ok</Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import {
  PERMISSION_DENIED_MESSAGE,
  hidePermissionDeniedModal,
  usePermissionDeniedModalState,
} from '@/composables/usePermissionDeniedModal'

const { isOpen } = usePermissionDeniedModalState()

const permissionDeniedMessage = PERMISSION_DENIED_MESSAGE

const handleClose = () => {
  hidePermissionDeniedModal()
}
</script>
