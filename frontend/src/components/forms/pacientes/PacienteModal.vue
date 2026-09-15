<template>
  <div v-if="isOpen" class="fixed inset-0 bg-gray-300/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-900 rounded shadow w-[96vw] sm:w-[90vw] max-w-7xl p-6 md:p-8 max-h-[80vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-4 mb-4">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ titulo }}</h2>
        <button type="button" class="text-sm text-gray-500 hover:text-gray-700" @click="handleClose(false)">
          Fechar
        </button>
      </div>

      <div v-if="!somenteLeitura" class="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded border"
          :class="modo === 'completo' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'"
          @click="setModo('completo')"
        >
          Cadastro completo
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded border"
          :class="modo === 'simplificado' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'"
          @click="setModo('simplificado')"
        >
          Cadastro simplificado
        </button>
      </div>

      <PacienteFormCompleto
        v-show="modo === 'completo'"
        :dados="dados"
        :somenteLeitura="somenteLeitura"
        @close="handleClose"
        @sucesso="forwardSucesso"
        @erro="forwardErro"
      />
      <PacienteFormSimplificado
        v-show="modo === 'simplificado'"
        :dados="dados"
        :somenteLeitura="somenteLeitura"
        @close="handleClose"
        @sucesso="forwardSucesso"
        @erro="forwardErro"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PacienteFormCompleto from './PacienteFormCompleto.vue'
import PacienteFormSimplificado from './PacienteFormSimplificado.vue'

type ModoFormulario = 'completo' | 'simplificado'

const props = defineProps<{
  isOpen: boolean
  dados: Record<string, unknown> | null
  somenteLeitura?: boolean
}>()

const emit = defineEmits<{
  (e: 'close', shouldRefresh: boolean): void
  (e: 'sucesso', payload: { tipo: string; mensagem: string }): void
  (e: 'erro', payload: { tipo: string; mensagem: string }): void
}>()

const modo = ref<ModoFormulario>('completo')

const somenteLeitura = computed(() => Boolean(props.somenteLeitura))
const isEdit = computed(() => {
  const id = props.dados && (props.dados as { id?: unknown }).id
  return id !== null && id !== undefined
})

watch(
  () => props.isOpen,
  (aberto) => {
    if (!aberto) {
      modo.value = 'completo'
      return
    }
    if (somenteLeitura.value) {
      modo.value = 'completo'
    }
  },
)

watch(
  () => props.somenteLeitura,
  (novo) => {
    if (novo) modo.value = 'completo'
  },
)

const titulo = computed(() => {
  if (somenteLeitura.value) {
    return 'Visualizar Paciente'
  }
  if (modo.value === 'simplificado') {
    return isEdit.value ? 'Editar Paciente (Simplificado)' : 'Novo Paciente (Simplificado)'
  }
  return isEdit.value ? 'Editar Paciente (Completo)' : 'Novo Paciente (Completo)'
})

const handleClose = (shouldRefresh: boolean) => {
  emit('close', shouldRefresh)
}

const forwardSucesso = (payload: { tipo: string; mensagem: string }) => {
  emit('sucesso', payload)
}

const forwardErro = (payload: { tipo: string; mensagem: string }) => {
  emit('erro', payload)
}

const setModo = (novo: ModoFormulario) => {
  if (somenteLeitura.value) return
  modo.value = novo
}
</script>
