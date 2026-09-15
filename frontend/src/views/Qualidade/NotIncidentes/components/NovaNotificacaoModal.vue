<template>
  <Modal v-if="open" :fullScreenBackdrop="true" @close="emit('close')">
    <div class="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
      <header class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Nova notificação de incidente</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Registre uma nova ocorrência preenchendo os dados abaixo.</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600" type="button" @click="emit('close')">×</button>
      </header>

      <section class="mt-6">
        <NovaNotificacaoForm
          ref="formRef"
          :tipos="tipos"
          show-cancel
          @cancel="emit('close')"
          @created="handleCreated"
        />
      </section>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import type { NotificacaoTipo } from '@/types/notIncidentes'
import NovaNotificacaoForm from './NovaNotificacaoForm.vue'

const props = defineProps<{
  open: boolean
  tipos: NotificacaoTipo[]
}>()

const emit = defineEmits(['close', 'created'])

const formRef = ref<InstanceType<typeof NovaNotificacaoForm> | null>(null)

const handleCreated = () => {
  emit('created')
}

watch(
  () => props.open,
  (aberto) => {
    if (aberto) {
      formRef.value?.resetForm()
    }
  },
)
</script>
