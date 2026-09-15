<template>
  <Modal v-if="aberta" full-screen-backdrop @close="emitFechar">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ titulo }}
        </h2>

        <form class="flex flex-col gap-4" @submit.prevent="salvar">
          <fieldset :disabled="salvando" class="contents">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da unidade<span class="text-error-500">*</span>
              </label>
              <input
                v-model="form.nome"
                type="text"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                required
                maxlength="150"
              />
            </div>
          </fieldset>

          <div class="mt-2 flex justify-end gap-2">
            <button
              type="button"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06] sm:w-auto"
              @click="emitFechar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              :disabled="salvando"
            >
              <span
                v-if="salvando"
                class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              {{ salvando ? 'Salvando...' : isEdicao ? 'Atualizar' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import { useToast } from '@/composables/useToast'
import {
  atualizarUnidade,
  criarUnidade,
  type Unidade,
  type UnidadePayload,
} from '@/services/unidades'

const props = defineProps<{
  aberta: boolean
  unidade: Unidade | null
}>()

const emit = defineEmits<{
  (event: 'fechar'): void
  (event: 'sucesso', unidade: Unidade): void
}>()

const form = reactive<{
  id: number | null
  nome: string
}>({
  id: null,
  nome: '',
})

const salvando = ref(false)
const toast = useToast()

const isEdicao = computed(() => form.id !== null)
const titulo = computed(() => (isEdicao.value ? 'Editar unidade' : 'Nova unidade'))

const atualizarFormulario = (unidade: Unidade | null) => {
  form.id = unidade?.id ?? null
  form.nome = unidade?.nome ?? ''
}

watch(
  () => props.unidade,
  (novaUnidade) => {
    if (props.aberta) {
      atualizarFormulario(novaUnidade)
    }
  },
)

watch(
  () => props.aberta,
  (aberta) => {
    if (aberta) {
      atualizarFormulario(props.unidade)
    }
  },
)

const salvar = async () => {
  const nome = form.nome.trim()

  if (!nome) {
    toast.error('Informe o nome da unidade.')
    return
  }

  salvando.value = true
  try {
    const payload: UnidadePayload = { nome }
    let resultado: Unidade

    if (isEdicao.value && form.id) {
      resultado = await atualizarUnidade(form.id, payload)
    } else {
      resultado = await criarUnidade(payload)
    }

    emit('sucesso', resultado)
    emitFechar()
  } catch (error: any) {
    const mensagem = error?.response?.data?.error || 'Não foi possível salvar a unidade.'
    toast.error(mensagem)
  } finally {
    salvando.value = false
  }
}

const emitFechar = () => {
  emit('fechar')
}

</script>
