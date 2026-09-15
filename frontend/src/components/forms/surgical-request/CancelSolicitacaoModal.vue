<template>
  <Modal v-if="isOpen" fullScreenBackdrop @close="onClose">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-900"
      >
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">
          Cancelar solicitação
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Deseja realmente cancelar
          <span class="font-medium text-gray-900 dark:text-white/90">
            {{ solicitacaoDescricao }}
          </span>
          ? Ao confirmar, todas as tarefas associadas serão atualizadas para o status Cancelado e a solicitação ficará como
          Cancelada.
        </p>

        <form class="mt-6 flex flex-col gap-4" @submit.prevent="emitConfirm">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300" for="motivo-cancelamento">
              Informe o motivo do cancelamento
            </label>
            <textarea
              id="motivo-cancelamento"
              v-model="motivo"
              :maxlength="1000"
              rows="4"
              class="h-32 w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-700"
              :disabled="loading"
              @input="limparErro"
            ></textarea>
            <p v-if="erro" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ erro }}
            </p>
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Máximo de 1000 caracteres.
            </p>
          </div>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.04] sm:w-auto"
              @click="onClose"
              :disabled="loading"
            >
              Voltar
            </button>
            <button
              type="submit"
              class="flex w-full justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              :disabled="loading || !motivoValido"
            >
              {{ loading ? 'Cancelando...' : 'Confirmar cancelamento' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import { extractSurgicalRequestId } from '@/utils/surgicalRequests'

interface Props {
  isOpen: boolean
  solicitacao: Record<string, unknown> | null
  loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', motivo: string): void
}>()

const motivo = ref('')
const erro = ref('')

const limparErro = () => {
  if (erro.value) {
    erro.value = ''
  }
}

watch(
  () => props.isOpen,
  (aberto) => {
    if (aberto) {
      motivo.value = ''
      erro.value = ''
    }
  },
)

watch(
  () => props.solicitacao,
  () => {
    motivo.value = ''
    erro.value = ''
  },
)

const motivoValido = computed(() => motivo.value.trim().length > 0)

const extrairCampo = (chaves: string[]) => {
  if (!props.solicitacao) {
    return ''
  }

  for (const chave of chaves) {
    if (Object.prototype.hasOwnProperty.call(props.solicitacao, chave)) {
      const valor = props.solicitacao[chave]
      if (valor !== undefined && valor !== null) {
        const texto = String(valor).trim()
        if (texto.length) {
          return texto
        }
      }
    }
  }

  return ''
}

const numeroSolicitacao = computed(() => {
  const identificador = extractSurgicalRequestId(props.solicitacao ?? {})
  if (identificador) {
    return identificador
  }

  return (
    extrairCampo([
      'numero_liberacao',
      'numero',
      'codigo',
      'id',
    ]) || 'solicitação selecionada'
  )
})

const pacienteSolicitacao = computed(() =>
  extrairCampo([
    'nome_paciente',
    'paciente',
    'patient',
    'patient_name',
  ]),
)

const solicitacaoDescricao = computed(() => {
  const paciente = pacienteSolicitacao.value
  if (paciente) {
    return `a solicitação ${numeroSolicitacao.value} do paciente ${paciente}`
  }
  return `a solicitação ${numeroSolicitacao.value}`
})

const onClose = () => {
  if (props.loading) {
    return
  }
  emit('close')
}

const emitConfirm = () => {
  const texto = motivo.value.trim()
  if (!texto) {
    erro.value = 'Informe o motivo do cancelamento.'
    return
  }

  emit('confirm', texto)
}
</script>
