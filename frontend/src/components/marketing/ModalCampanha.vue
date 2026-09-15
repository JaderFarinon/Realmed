<template>
  <Modal v-if="aberta" full-screen-backdrop @close="emitFechar">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 sm:p-8"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">
              {{ titulo }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Defina as informações básicas e os filtros da campanha de marketing.
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-gray-200 p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Fechar"
            @click="emitFechar"
          >
            <span class="sr-only">Fechar</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </div>

        <form class="grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="salvar">
          <fieldset :disabled="salvando" class="contents">
            <div class="sm:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da campanha<span class="text-error-500">*</span>
              </label>
              <input
                v-model="form.nome"
                type="text"
                required
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Sexo</label>
              <select
                v-model="form.sexo"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option v-for="option in sexoOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Idade mínima</label>
                <input
                  v-model.number="form.idadeMinima"
                  type="number"
                  min="1"
                  max="99"
                  placeholder="1"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Idade máxima</label>
                <input
                  v-model.number="form.idadeMaxima"
                  type="number"
                  min="1"
                  max="99"
                  placeholder="99"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">UF</label>
              <input
                v-model="form.uf"
                type="text"
                maxlength="2"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm uppercase text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Cidade</label>
              <input
                v-model="form.cidade"
                type="text"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <div class="sm:col-span-2">
              <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Contatos</span>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    v-model="form.comEmail"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  Com e-mail
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    v-model="form.comTelefone"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  Com telefone
                </label>
              </div>
            </div>
          </fieldset>

          <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3 sm:col-span-2">
            <button
              type="button"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/10 sm:w-auto"
              @click="emitFechar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              :disabled="salvando"
            >
              <span v-if="salvando" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              <span>{{ salvando ? 'Salvando...' : isEdicao ? 'Atualizar' : 'Salvar' }}</span>
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
import api from '@/plugins/axios'

type SexoOption = 'M' | 'F' | 'O' | 'Todos'

type NotificationVariant = 'success' | 'error' | 'info' | 'warning'

interface CampanhaPayload {
  id?: string | number
  nome?: string
  status?: string
  createdAt?: string | null
  criada_em?: string | null
  sexo?: string | null
  idadeMinima?: number | null
  idadeMaxima?: number | null
  idade_minima?: number | null
  idade_maxima?: number | null
  uf?: string | null
  cidade?: string | null
  comEmail?: boolean | number | null
  comTelefone?: boolean | number | null
  filtros?: {
    sexo?: string | null
    idadeMinima?: number | null
    idadeMaxima?: number | null
    uf?: string | null
    cidade?: string | null
    comEmail?: boolean | number | null
    comTelefone?: boolean | number | null
  }
}

interface CampanhaForm {
  nome: string
  sexo: SexoOption
  idadeMinima: number | null
  idadeMaxima: number | null
  uf: string
  cidade: string
  comEmail: boolean
  comTelefone: boolean
}

const props = defineProps<{
  aberta: boolean
  campanha?: CampanhaPayload | null
}>()

const emit = defineEmits<{
  (e: 'fechar'): void
  (e: 'sucesso', mensagem: string): void
  (e: 'erro', mensagem: string, tipo?: NotificationVariant): void
}>()

const form = reactive<CampanhaForm>({
  nome: '',
  sexo: 'Todos',
  idadeMinima: null,
  idadeMaxima: null,
  uf: '',
  cidade: '',
  comEmail: false,
  comTelefone: false,
})

const sexoOptions = [
  { value: 'Todos' as SexoOption, label: 'Todos' },
  { value: 'M' as SexoOption, label: 'Masculino' },
  { value: 'F' as SexoOption, label: 'Feminino' },
  { value: 'O' as SexoOption, label: 'Outros' },
]

const salvando = ref(false)

const isEdicao = computed(() => Boolean(props.campanha && props.campanha.id !== undefined && props.campanha.id !== null))

const titulo = computed(() => (isEdicao.value ? 'Editar campanha' : 'Nova campanha'))

const limparFormulario = () => {
  form.nome = ''
  form.sexo = 'Todos'
  form.idadeMinima = null
  form.idadeMaxima = null
  form.uf = ''
  form.cidade = ''
  form.comEmail = false
  form.comTelefone = false
}

const aplicarCampanha = (dados?: CampanhaPayload | null) => {
  if (!dados) {
    limparFormulario()
    return
  }

  const filtros = dados.filtros ?? dados

  form.nome = dados.nome ?? ''
  form.sexo = (filtros?.sexo as SexoOption) || 'Todos'
  form.idadeMinima = filtros?.idadeMinima ?? filtros?.idade_minima ?? null
  form.idadeMaxima = filtros?.idadeMaxima ?? filtros?.idade_maxima ?? null
  form.uf = (filtros?.uf ?? '').toString().toUpperCase()
  form.cidade = filtros?.cidade ?? ''
  form.comEmail = Boolean(filtros?.comEmail ?? filtros?.com_email)
  form.comTelefone = Boolean(filtros?.comTelefone ?? filtros?.com_telefone)
}

watch(
  () => props.aberta,
  (aberta) => {
    if (aberta) {
      aplicarCampanha(props.campanha ?? null)
    }
  },
)

watch(
  () => props.campanha,
  (dados) => {
    if (props.aberta) {
      aplicarCampanha(dados ?? null)
    }
  },
)

const emitFechar = () => {
  if (salvando.value) return
  emit('fechar')
}

const validarFaixaEtaria = (): true | string => {
  if (form.idadeMinima === null || form.idadeMaxima === null) {
    return true
  }
  if (form.idadeMinima <= form.idadeMaxima) {
    return true
  }
  return 'Idade mínima deve ser menor ou igual à idade máxima.'
}

const normalizarPayload = () => {
  const payload: Record<string, unknown> = {
    nome: form.nome.trim(),
    sexo: form.sexo === 'Todos' ? null : form.sexo,
    idadeMinima: form.idadeMinima ?? null,
    idadeMaxima: form.idadeMaxima ?? null,
    uf: form.uf.trim().toUpperCase() || null,
    cidade: form.cidade.trim() || null,
    comEmail: form.comEmail,
    comTelefone: form.comTelefone,
  }

  return payload
}

const salvar = async () => {
  const nome = form.nome.trim()
  if (!nome) {
    const mensagem = 'Informe o nome da campanha.'
    emit('erro', mensagem, 'warning')
    return
  }

  const faixaEtariaValida = validarFaixaEtaria()
  if (faixaEtariaValida !== true) {
    emit('erro', faixaEtariaValida, 'warning')
    return
  }

  const payload = normalizarPayload()

  try {
    salvando.value = true

    if (isEdicao.value && props.campanha?.id !== undefined && props.campanha?.id !== null) {
      await api.put(`/marketing/campanhas/${props.campanha.id}`, payload)
      emit('sucesso', 'Campanha atualizada com sucesso!')
    } else {
      await api.post('/marketing/campanhas', payload)
      emit('sucesso', 'Campanha criada com sucesso!')
      limparFormulario()
    }

    emitFechar()
  } catch (err: unknown) {
    const mensagem =
      (err as { response?: { data?: { mensagem?: string; message?: string } } }).response?.data?.mensagem ||
      (err as { response?: { data?: { mensagem?: string; message?: string } } }).response?.data?.message ||
      (err as { message?: string }).message ||
      'Não foi possível salvar a campanha.'

    emit('erro', mensagem, 'error')
  } finally {
    salvando.value = false
  }
}
</script>
