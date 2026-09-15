<template>
  <Modal v-if="aberto" @close="emit('fechar', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-theme-lg ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800"
      >
        <header class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white/90">
              Configurações da Inteligência Artificial
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Defina o modelo e a chave de acesso à OpenAI para habilitar o chat.
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            @click="emit('fechar', false)"
          >
            Fechar
          </button>
        </header>

        <form class="space-y-4" @submit.prevent="salvar">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="ia-model">
              Modelo
            </label>
            <select
              id="ia-model"
              v-model="form.model"
              class="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-brand-500"
              :disabled="carregando || salvando"
            >
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              <option value="gpt-4">gpt-4</option>
              <option value="gpt-4o">gpt-4o</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="ia-api-key">
              API Key
            </label>
            <input
              id="ia-api-key"
              v-model="form.api_key"
              :type="mostrarChave ? 'text' : 'password'"
              class="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-brand-500"
              :disabled="carregando || salvando"
              placeholder="sk-..."
              autocomplete="off"
            />
            <button
              type="button"
              class="text-xs font-medium text-brand-500 hover:text-brand-600"
              @click="mostrarChave = !mostrarChave"
            >
              {{ mostrarChave ? 'Ocultar chave' : 'Mostrar chave' }}
            </button>
          </div>

          <Alert
            v-if="feedback"
            :variant="feedback.tipo"
            :title="feedback.titulo"
            :message="feedback.mensagem"
          />

          <div class="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              :disabled="salvando"
              @click="emit('fechar', false)"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="salvando"
            >
              <span v-if="salvando" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
              Salvar
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import Alert from '@/components/ui/Alert.vue'
import Modal from '@/components/profile/Modal.vue'
import { fetchIaSettings, saveIaSettings, type IaSettings, type SaveIaSettingsPayload } from '@/services/ia'

const props = defineProps<{ aberto: boolean }>()

const emit = defineEmits<{
  (e: 'fechar', atualizado: boolean): void
  (e: 'sucesso', payload: IaSettings): void
  (e: 'erro', mensagem: string): void
}>()

const form = reactive<SaveIaSettingsPayload>({ model: 'gpt-3.5-turbo', api_key: '' })
const carregando = ref(false)
const salvando = ref(false)
const mostrarChave = ref(false)
const feedback = ref<null | { tipo: 'success' | 'error'; titulo: string; mensagem: string }>(null)

const carregar = async () => {
  try {
    carregando.value = true
    feedback.value = null
    const dados = await fetchIaSettings()
    if (dados) {
      form.model = dados.model
      form.api_key = dados.api_key
    }
  } catch (error) {
    console.error('[IA] Erro ao carregar configurações no modal', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao carregar configurações',
      mensagem: 'Não foi possível carregar as configurações atuais. Tente novamente.',
    }
    emit('erro', 'Não foi possível carregar as configurações de IA.')
  } finally {
    carregando.value = false
  }
}

const salvar = async () => {
  if (salvando.value) {
    return
  }

  try {
    salvando.value = true
    feedback.value = null
    const saved = await saveIaSettings({ ...form })
    feedback.value = {
      tipo: 'success',
      titulo: 'Configurações salvas',
      mensagem: 'As configurações de IA foram atualizadas com sucesso.',
    }
    emit('sucesso', saved)
    emit('fechar', true)
  } catch (error) {
    console.error('[IA] Erro ao salvar configurações no modal', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao salvar',
      mensagem: 'Não foi possível salvar as configurações. Verifique os dados e tente novamente.',
    }
    emit('erro', 'Não foi possível salvar as configurações de IA.')
  } finally {
    salvando.value = false
  }
}

watch(
  () => props.aberto,
  (abriu) => {
    if (abriu) {
      mostrarChave.value = false
      carregar()
    } else {
      feedback.value = null
    }
  }
)

onMounted(() => {
  if (props.aberto) {
    carregar()
  }
})
</script>
