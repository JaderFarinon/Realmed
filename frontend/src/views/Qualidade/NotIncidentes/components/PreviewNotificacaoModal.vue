<template>
  <Modal :fullScreenBackdrop="true" @close="emit('close')">
    <div class="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
      <header class="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notificação #{{ notificacao?.id ?? notificacaoId }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Visualização completa da notificação de incidente.</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600" type="button" @click="emit('close')">×</button>
      </header>

      <section v-if="isLoading" class="py-12 text-center text-sm text-gray-500">
        Carregando detalhes da notificação...
      </section>

      <section v-else class="mt-6 space-y-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <span class="detail-label">Paciente</span>
            <p class="detail-value">{{ notificacao?.nmPaciente ?? 'Não informado' }}</p>
          </div>
          <div>
            <span class="detail-label">Profissional</span>
            <p class="detail-value">{{ notificacao?.nmMedico ?? 'Não informado' }}</p>
          </div>
          <div>
            <span class="detail-label">Setor</span>
            <p class="detail-value">{{ notificacao?.dsSetor ?? 'Não informado' }}</p>
          </div>
          <div>
            <span class="detail-label">Incidente</span>
            <p class="detail-value">{{ notificacao?.dsIncidente ?? 'Não informado' }}</p>
          </div>
        </div>

        <div>
          <span class="detail-label">Descrição do Fato</span>
          <p class="detail-value">{{ notificacao?.dsFato ?? '—' }}</p>
        </div>
        <div>
          <span class="detail-label">Consequência Imediata</span>
          <p class="detail-value">{{ notificacao?.dsConseq ?? '—' }}</p>
        </div>
        <div>
          <span class="detail-label">Ação Imediata</span>
          <p class="detail-value">{{ notificacao?.dsAcao ?? '—' }}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <span class="detail-label">Classificação</span>
            <StatusBadge :status="notificacao?.preProcessamento?.dsClass ?? 'Não Processado'" />
          </div>
          <div>
            <span class="detail-label">Responsável</span>
            <p class="detail-value">{{ notificacao?.preProcessamento?.dsResponsavel ?? 'Não definido' }}</p>
          </div>
        </div>

        <div class="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button variant="outline" @click="() => emit('close')">Fechar</Button>
        </div>
      </section>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import StatusBadge from './StatusBadge.vue'
import type { NotificacaoIncidente } from '@/types/notIncidentes'
import { fetchNotificacaoById } from '@/services/notIncidentes'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  notificacaoId: number
}>()

const emit = defineEmits(['close'])

const notificacao = ref<NotificacaoIncidente | null>(null)
const isLoading = ref<boolean>(false)
const toast = useToast()

const carregar = async () => {
  isLoading.value = true
  try {
    notificacao.value = await fetchNotificacaoById(props.notificacaoId)
  } catch (error) {
    console.error('Erro ao carregar notificação', error)
    toast.error('Não foi possível carregar a notificação selecionada')
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.notificacaoId,
  async () => {
    if (props.notificacaoId) {
      await carregar()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (props.notificacaoId) {
    await carregar()
  }
})
</script>

<style scoped>
.detail-label {
  @apply text-xs font-semibold uppercase tracking-wide text-gray-400;
}
.detail-value {
  @apply mt-1 text-sm text-gray-700 dark:text-gray-300;
}
</style>
