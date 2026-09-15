<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ dados?.id ? 'Editar Tipo de Procedimento' : 'Novo Tipo de Procedimento' }}
        </h2>
        <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome</label>
            <input
              v-model="form.nome"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
          </div>
          <div class="flex items-center gap-2 h-11">
            <input
              v-model="form.ativo"
              type="checkbox"
              id="tipo-ativo"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="tipo-ativo" class="text-sm text-gray-700 dark:text-gray-400">Ativo</label>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              type="button"
              @click="emit('close', false)"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
            >
              {{ dados?.id ? 'Atualizar' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '@/plugins/axios'
import Modal from '@/components/profile/Modal.vue'

interface TipoForm {
  id?: number
  nome: string
  ativo: boolean
}

const props = defineProps<{ isOpen: boolean; dados: TipoForm | null }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const form = ref<TipoForm>({ nome: '', ativo: true })

watch(
  () => props.dados,
  (val) => {
    form.value = val ? { ...val } : { nome: '', ativo: true }
  },
  { immediate: true }
)

const salvar = async () => {
  try {
    if (props.dados?.id) {
      await api.put(`/procedimento-tipos/${props.dados.id}`, form.value)
      emit('sucesso', { tipo: 'success', mensagem: 'Tipo de procedimento atualizado com sucesso' })
    } else {
      await api.post('/procedimento-tipos', form.value)
      emit('sucesso', { tipo: 'success', mensagem: 'Tipo de procedimento criado com sucesso' })
    }
    emit('close', true)
  } catch (err) {
    console.error(err)
    emit('erro', { tipo: 'error', mensagem: 'Erro ao salvar tipo de procedimento' })
  }
}
</script>
