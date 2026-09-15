<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[900px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ somenteLeitura ? 'Visualizar Convênio' : dados?.id ? 'Editar Convênio' : 'Novo Convênio' }}
        </h2>
        <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <fieldset :disabled="somenteLeitura" class="contents">
            <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome</label>
            <input
              v-model="form.nome"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Registro ANS</label>
            <input
              v-model="form.registro_ans"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">CNPJ</label>
            <IMaskComponent
              v-model="form.cnpj"
              :mask="'00.000.000/0000-00'"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Telefone</label>
            <IMaskComponent
              v-model="form.telefone"
              :mask="['(00) 0000-0000', '(00) 00000-0000']"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">E-mail</label>
            <input
              v-model="form.email"
              type="email"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div class="flex items-center gap-2 h-11 md:col-span-2">
            <input
              v-model="form.ativo"
              type="checkbox"
              id="ativo"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="ativo" class="text-sm text-gray-700 dark:text-gray-400">Ativo</label>
          </div>
          </fieldset>
          <div class="flex justify-end gap-2 mt-4 md:col-span-2">
            <button
              type="button"
              @click="emit('close', false)"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              {{ somenteLeitura ? 'Fechar' : 'Cancelar' }}
            </button>
            <button
              v-if="!somenteLeitura"
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
import { computed, ref, watch } from 'vue'
import api from '@/plugins/axios'
import Modal from '@/components/profile/Modal.vue'
import { IMaskComponent } from 'vue-imask'

interface ConvenioForm {
  id?: number
  nome: string
  registro_ans?: string
  cnpj?: string
  telefone?: string
  email?: string
  ativo: boolean
}

const props = defineProps<{ isOpen: boolean; dados: ConvenioForm | null; somenteLeitura?: boolean }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const form = ref<ConvenioForm>({ nome: '', registro_ans: '', cnpj: '', telefone: '', email: '', ativo: true })

const somenteLeitura = computed(() => Boolean(props.somenteLeitura))

watch(() => props.dados, (val) => {
  form.value = val ? { ...val } : { nome: '', registro_ans: '', cnpj: '', telefone: '', email: '', ativo: true }
}, { immediate: true })

const salvar = async () => {
  if (somenteLeitura.value) {
    emit('close', false)
    return
  }
  try {
    if (props.dados && props.dados.id) {
      await api.put(`/convenios/${props.dados.id}`, form.value)
      emit('sucesso', { tipo: 'success', mensagem: 'Convênio atualizado com sucesso' })
    } else {
      await api.post('/convenios', form.value)
      emit('sucesso', { tipo: 'success', mensagem: 'Convênio criado com sucesso' })
    }
    emit('close', true)
  } catch (err) {
    console.error(err)
    emit('erro', { tipo: 'error', mensagem: 'Erro ao salvar Convênio' })
  }
}
</script>
