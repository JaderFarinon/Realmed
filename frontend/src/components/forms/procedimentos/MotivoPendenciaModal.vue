<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[720px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ dados?.id ? 'Editar Motivo de Pendência' : 'Novo Motivo de Pendência' }}
        </h2>
        <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >Descrição do Motivo</label
            >
            <input
              v-model="form.descricao"
              type="text"
              required
              maxlength="255"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
              >Etapas aplicáveis</label
            >
            <div ref="etapasWrapper" class="relative">
              <div
                class="dark:bg-dark-900 flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus-within:border-brand-300 focus-within:outline-hidden focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus-within:border-brand-800"
                @click="abrirLista"
              >
                <span
                  v-for="etapa in etapasSelecionadas"
                  :key="`etapa-${etapa.id}`"
                  class="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                >
                  <span>
                    {{ etapa.nome }}
                    <span v-if="!etapa.ativo" class="ml-1 text-[10px] uppercase tracking-wide text-red-500">inativa</span>
                  </span>
                  <button
                    type="button"
                    class="leading-none text-brand-700 hover:text-brand-900 dark:text-brand-200"
                    @click.stop="removerEtapa(etapa.id)"
                  >
                    &times;
                  </button>
                </span>
                <input
                  ref="searchInput"
                  v-model="searchTerm"
                  type="text"
                  placeholder="Buscar etapa..."
                  class="flex-1 border-none bg-transparent py-1 text-sm text-gray-800 focus:outline-hidden dark:text-white/90"
                  @focus="abrirLista"
                  @input="abrirLista"
                />
              </div>
              <ul
                v-if="dropdownAberto"
                class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <li v-if="carregandoEtapas" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Carregando etapas...
                </li>
                <template v-else>
                  <li
                    v-for="etapa in etapasFiltradas"
                    :key="etapa.id"
                    class="flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    :class="estaEtapaSelecionada(etapa.id) ? 'bg-brand-50 dark:bg-brand-500/20' : ''"
                    @mousedown.prevent="selecionarEtapa(etapa)"
                  >
                    <div>
                      <p class="font-medium">
                        {{ etapa.nome }}
                        <span v-if="!etapa.ativo" class="ml-1 text-xs text-red-400">(inativa)</span>
                      </p>
                    </div>
                    <span
                      class="flex h-5 w-5 items-center justify-center rounded-full border"
                      :class="estaEtapaSelecionada(etapa.id)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-300 text-gray-400 dark:border-gray-600'"
                    >
                      ✓
                    </span>
                  </li>
                  <li v-if="!etapasFiltradas.length" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma etapa encontrada.
                  </li>
                </template>
              </ul>
            </div>
            <p v-if="!form.etapa_ids.length" class="mt-2 text-xs text-red-500">
              Selecione ao menos uma etapa.
            </p>
          </div>

          <div class="flex items-center gap-2 h-11 md:col-span-2">
            <input
              v-model="form.ativo"
              type="checkbox"
              id="motivo-ativo"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="motivo-ativo" class="text-sm text-gray-700 dark:text-gray-400">Ativo</label>
          </div>

          <div class="flex justify-end gap-2 mt-4 md:col-span-2">
            <button
              type="button"
              @click="emit('close', false)"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-400 sm:w-auto"
              :disabled="!podeSalvar"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '@/plugins/axios'
import Modal from '@/components/profile/Modal.vue'

interface EtapaOption {
  id: number
  nome: string
  ativo: boolean
}

interface MotivoForm {
  id?: number
  descricao: string
  etapa_ids: number[]
  ativo: boolean
}

const props = defineProps<{ isOpen: boolean; dados: (MotivoForm & { etapas?: EtapaOption[] }) | null }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const form = ref<MotivoForm>({ descricao: '', etapa_ids: [], ativo: true })
const etapas = ref<EtapaOption[]>([])
const carregandoEtapas = ref(false)
const searchTerm = ref('')
const dropdownAberto = ref(false)
const etapasWrapper = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const podeSalvar = computed(
  () => form.value.descricao.trim().length > 0 && form.value.etapa_ids.length > 0,
)

const etapasOrdenadas = computed(() => [...etapas.value].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))

const etapasSelecionadas = computed(() => {
  const mapa = new Map(etapas.value.map((etapa) => [etapa.id, etapa]))
  return form.value.etapa_ids.map((id) => {
    const encontrada = mapa.get(id)
    if (encontrada) return encontrada
    const fallback: EtapaOption = { id, nome: `Etapa ${id}`, ativo: true }
    return fallback
  })
})

const etapasFiltradas = computed(() => {
  const listaOrdenada = etapasOrdenadas.value
  const termoBusca = searchTerm.value.trim().toLowerCase()
  if (!termoBusca) {
    return listaOrdenada
  }

  const termo = termoBusca
  return listaOrdenada.filter((etapa) => etapa.nome.toLowerCase().includes(termo))
})

const normalizaEtapaIds = (valor: unknown): number[] => {
  if (Array.isArray(valor)) {
    const set = new Set<number>()
    valor.forEach((item) => {
      const numero = Number(item)
      if (!Number.isFinite(numero)) return
      const inteiro = Math.trunc(numero)
      if (inteiro > 0) {
        set.add(inteiro)
      }
    })
    return Array.from(set)
  }
  if (valor === undefined || valor === null || valor === '') {
    return []
  }
  return normalizaEtapaIds([valor])
}

const estaEtapaSelecionada = (id: number) => form.value.etapa_ids.includes(id)

const isRecord = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null

const abrirLista = () => {
  if (!dropdownAberto.value) {
    dropdownAberto.value = true
  }
  nextTick(() => {
    searchInput.value?.focus()
  })
}

const fecharLista = () => {
  dropdownAberto.value = false
}

const selecionarEtapa = (etapa: EtapaOption) => {
  const selecionada = estaEtapaSelecionada(etapa.id)
  if (selecionada) {
    form.value = {
      ...form.value,
      etapa_ids: form.value.etapa_ids.filter((valor) => valor !== etapa.id),
    }
  } else {
    form.value = {
      ...form.value,
      etapa_ids: [...form.value.etapa_ids.filter((valor) => valor !== etapa.id), etapa.id],
    }
  }

  searchTerm.value = ''
  nextTick(() => {
    dropdownAberto.value = true
    searchInput.value?.focus()
  })
}

const removerEtapa = (id: number) => {
  if (!estaEtapaSelecionada(id)) return
  form.value = {
    ...form.value,
    etapa_ids: form.value.etapa_ids.filter((valor) => valor !== id),
  }
}

const aoClicarFora = (event: MouseEvent) => {
  if (!dropdownAberto.value) return
  const wrapper = etapasWrapper.value
  if (!wrapper) return
  const target = event.target as Node | null
  if (target && !wrapper.contains(target)) {
    fecharLista()
  }
}

const carregarEtapas = async () => {
  carregandoEtapas.value = true
  try {
    const response = await api.get('/etapas')
    const recebidas = Array.isArray(response.data) ? (response.data as unknown[]) : []
    const lista: EtapaOption[] = []
    for (const bruto of recebidas) {
      if (!isRecord(bruto)) {
        continue
      }

      const idValor = 'id' in bruto ? bruto.id : undefined
      const numero = Number(idValor)
      if (!Number.isFinite(numero)) {
        continue
      }
      const id = Math.trunc(numero)
      if (id <= 0) {
        continue
      }

      const nomeBruto = typeof bruto.nome === 'string' ? bruto.nome : ''
      const nome = nomeBruto.trim() || 'Etapa sem nome'
      const ativo = 'ativo' in bruto ? Boolean(bruto.ativo) : true

      lista.push({ id, nome, ativo })
    }
    etapas.value = lista
  } catch (erro: unknown) {
    console.error('Erro ao carregar etapas', erro)
    etapas.value = []
  } finally {
    carregandoEtapas.value = false
  }
}

const resetarFormulario = () => {
  form.value = { descricao: '', etapa_ids: [], ativo: true }
  searchTerm.value = ''
  dropdownAberto.value = false
}

type ErroComResposta = {
  response?: {
    data?: {
      error?: unknown
    }
  }
}

const extrairMensagemErro = (erro: unknown, padrao: string): string => {
  if (typeof erro !== 'object' || erro === null) {
    return padrao
  }

  const possivelErro = erro as ErroComResposta
  const mensagem = possivelErro.response?.data?.error
  if (typeof mensagem === 'string' && mensagem.trim()) {
    return mensagem
  }

  return padrao
}

watch(
  () => props.dados,
  (val) => {
    if (val) {
      form.value = {
        id: val.id,
        descricao: val.descricao ?? '',
        etapa_ids: normalizaEtapaIds(val.etapa_ids ?? val.etapas?.map((etapa) => etapa.id)),
        ativo: val.ativo ?? true,
      }
    } else {
      resetarFormulario()
    }
  },
  { immediate: true },
)

watch(
  () => props.isOpen,
  (aberto) => {
    if (aberto) {
      searchTerm.value = ''
      dropdownAberto.value = false
      carregarEtapas()
    } else {
      resetarFormulario()
      fecharLista()
    }
  },
)

onMounted(() => {
  carregarEtapas()
  window.addEventListener('mousedown', aoClicarFora)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', aoClicarFora)
})

const salvar = async () => {
  if (!podeSalvar.value) {
    return
  }

  const payload = {
    descricao: form.value.descricao.trim(),
    etapa_ids: form.value.etapa_ids,
    ativo: form.value.ativo,
  }

  try {
    if (form.value.id) {
      await api.put(`/motivos-pendencia/${form.value.id}`, payload)
      emit('sucesso', {
        tipo: 'success',
        mensagem: 'Motivo de pendência atualizado com sucesso',
      })
    } else {
      await api.post('/motivos-pendencia', payload)
      emit('sucesso', {
        tipo: 'success',
        mensagem: 'Motivo de pendência criado com sucesso',
      })
    }
    emit('close', true)
  } catch (erro: unknown) {
    console.error('Erro ao salvar motivo de pendência', erro)
    const mensagem = extrairMensagemErro(erro, 'Erro ao salvar motivo de pendência')
    emit('erro', { tipo: 'error', mensagem })
  }
}
</script>
