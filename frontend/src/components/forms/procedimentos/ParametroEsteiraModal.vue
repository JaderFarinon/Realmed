<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[420px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ titulo }}
        </h2>
        <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ dados?.label || 'Parâmetro' }}
            </label>
            <input
              v-model="form.valor"
              :type="inputType"
              :min="inputType === 'number' ? 0 : undefined"
              :inputmode="inputType === 'number' ? 'numeric' : undefined"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{ inputPlaceholder }}
            </p>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button
              type="button"
              @click="emit('close', false)"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import api from '@/plugins/axios'
import Modal from '@/components/profile/Modal.vue'
import type { ParametroEsteira } from '@/types/parametrosEsteira'

const props = defineProps<{ isOpen: boolean; dados: ParametroEsteira | null }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const form = ref({ parametro: '', valor: '' })

const inputType = computed<'number' | 'text'>(() => {
  if (props.dados?.tipo === 'integer') {
    return 'number'
  }
  return 'text'
})

const inputPlaceholder = computed(() => {
  if (inputType.value === 'number') {
    return 'Informe o número mínimo de dias de antecedência exigidos.'
  }
  return 'Informe o valor desejado para este parâmetro.'
})

const titulo = computed(() => props.dados?.label || 'Editar parâmetro')

watch(
  () => props.dados,
  (parametro) => {
    if (!parametro) {
      form.value = { parametro: '', valor: '' }
      return
    }
    const valorPadrao = parametro.valor ?? (parametro.tipo === 'integer' ? '0' : '')
    form.value = {
      parametro: parametro.parametro,
      valor: valorPadrao,
    }
  },
  { immediate: true },
)

const salvar = async () => {
  if (!form.value.parametro) {
    emit('erro', { tipo: 'error', mensagem: 'Parâmetro inválido' })
    return
  }

  try {
    const payload = { valor: form.value.valor }
    await api.put(`/parametros-esteira-procedimento/${form.value.parametro}`, payload)
    emit('sucesso', { tipo: 'success', mensagem: 'Parâmetro atualizado com sucesso' })
    emit('close', true)
  } catch (err: any) {
    console.error('Erro ao salvar parâmetro da esteira', err)
    const mensagem = err?.response?.data?.error || 'Erro ao salvar parâmetro da esteira'
    emit('erro', { tipo: 'error', mensagem })
  }
}
</script>
