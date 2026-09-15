<template>
  <AdminLayout>
    <PageBreadcrumbIcons :page-title="pageTitle" />

    <div class="flex flex-col min-h-[calc(100vh-180px)]">
      <ComponentCard
        title="Configuração da Inteligência Artificial"
        class-name="flex flex-col flex-1 mb-[15px]"
        body-class="flex flex-col flex-1 min-h-0"
        content-class="flex flex-col flex-1 min-h-0"
      >
        <div class="flex flex-col gap-6">
          <Alert
            v-if="feedback"
            :variant="feedback.tipo"
            :title="feedback.titulo"
            :message="feedback.mensagem"
          />

          <form class="grid grid-cols-1 gap-5 md:grid-cols-2" @submit.prevent="salvar">
            <fieldset :disabled="!editando || salvando" class="contents">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300" for="ia-model-select">
                  Modelo
                </label>
                <select
                  id="ia-model-select"
                  v-model="form.model"
                  class="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-brand-500"
                >
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  <option value="gpt-4">gpt-4</option>
                  <option value="gpt-4o">gpt-4o</option>
                </select>
              </div>

              <div class="relative md:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300" for="ia-api-key-input">
                  API Key
                </label>
                <input
                  id="ia-api-key-input"
                  v-model="form.api_key"
                  :type="mostrarChave ? 'text' : 'password'"
                  class="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-brand-500"
                  placeholder="sk-..."
                  autocomplete="off"
                />
                <button
                  type="button"
                  class="absolute right-3 top-9 text-xs font-medium text-brand-500 hover:text-brand-600"
                  @click="mostrarChave = !mostrarChave"
                >
                  {{ mostrarChave ? 'Ocultar chave' : 'Mostrar chave' }}
                </button>
              </div>
            </fieldset>

            <div class="md:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-4">
              <button
                v-if="editando"
                type="button"
                class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                :disabled="salvando"
                @click="cancelar"
              >
                Cancelar
              </button>
              <button
                v-else
                type="button"
                class="rounded-xl border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-brand-500 dark:text-brand-300 dark:hover:bg-brand-500/10"
                @click="editar"
                :disabled="carregando"
              >
                Editar
              </button>
              <button
                v-if="editando"
                type="submit"
                class="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="salvando"
              >
                <span v-if="salvando" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                Salvar
              </button>
            </div>
          </form>

          <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            <p class="font-medium text-gray-600 dark:text-gray-300">Dicas de uso</p>
            <ul class="mt-2 list-disc space-y-1 pl-5">
              <li>Guarde a chave da OpenAI com segurança. Ela será utilizada em todas as requisições ao chat.</li>
              <li>Utilize o modelo adequado ao seu caso de uso para balancear custo e qualidade da resposta.</li>
              <li>Você pode atualizar estas configurações também a partir do chat clicando no ícone de configurações.</li>
            </ul>
          </div>
        </div>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Alert from '@/components/ui/Alert.vue'
import { fetchIaSettings, saveIaSettings, type SaveIaSettingsPayload } from '@/services/ia'

interface FeedbackState {
  tipo: 'success' | 'error'
  titulo: string
  mensagem: string
}

const pageTitle = 'Inteligência Artificial — Cadastros'
const carregando = ref(false)
const salvando = ref(false)
const editando = ref(false)
const mostrarChave = ref(false)
const feedback = ref<FeedbackState | null>(null)
const snapshot = ref<SaveIaSettingsPayload | null>(null)

const form = reactive<SaveIaSettingsPayload>({ model: 'gpt-3.5-turbo', api_key: '' })

const carregar = async () => {
  try {
    carregando.value = true
    feedback.value = null
    const dados = await fetchIaSettings()
    if (dados) {
      form.model = dados.model
      form.api_key = dados.api_key
      snapshot.value = { model: dados.model, api_key: dados.api_key }
      editando.value = false
    } else {
      snapshot.value = null
      editando.value = true
    }
  } catch (error) {
    console.error('[IA] Erro ao carregar configurações', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao carregar configurações',
      mensagem: 'Não foi possível buscar os dados cadastrados. Tente novamente em instantes.',
    }
  } finally {
    carregando.value = false
  }
}

const editar = () => {
  snapshot.value = { model: form.model, api_key: form.api_key }
  editando.value = true
  feedback.value = null
}

const cancelar = () => {
  editando.value = false
  mostrarChave.value = false
  feedback.value = null
  if (snapshot.value) {
    form.model = snapshot.value.model
    form.api_key = snapshot.value.api_key
  } else {
    form.model = 'gpt-3.5-turbo'
    form.api_key = ''
  }
}

const salvar = async () => {
  if (salvando.value) {
    return
  }

  try {
    salvando.value = true
    const dados = await saveIaSettings({ ...form })
    snapshot.value = { model: dados.model, api_key: dados.api_key }
    editando.value = false
    mostrarChave.value = false
    feedback.value = {
      tipo: 'success',
      titulo: 'Configurações salvas',
      mensagem: 'As credenciais da IA foram atualizadas com sucesso.',
    }
  } catch (error) {
    console.error('[IA] Erro ao salvar configurações', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao salvar',
      mensagem: 'Não foi possível salvar as configurações. Verifique os dados informados e tente novamente.',
    }
  } finally {
    salvando.value = false
  }
}

onMounted(() => {
  carregar()
})
</script>
