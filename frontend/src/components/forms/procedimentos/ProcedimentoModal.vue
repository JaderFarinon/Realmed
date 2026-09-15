<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[1024px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ somenteLeitura ? 'Visualizar Procedimento' : dados?.id ? 'Editar Procedimento' : 'Novo Procedimento' }}
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
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Código TUSS</label>
            <input
              v-model="form.codigo_tuss"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Código Clinic</label>
            <input
              v-model="form.codigo_clinic"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tipo</label>
            <select
              v-model="form.tipo"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              required
            >
              <option v-for="opcao in tipoOpcoes" :key="opcao" :value="opcao">{{ opcao }}</option>
            </select>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Grupo</label>
            <input
              v-model="form.grupo"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tempo estimado (min)</label>
            <input
              v-model.number="form.tempo_estimado"
              type="number"
              min="0"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Descrição</label>
            <textarea
              v-model="form.descricao"
              rows="3"
              class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Orientações</label>
            <textarea
              v-model="form.orientacoes"
              rows="3"
              class="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Especialidade</label>
            <input
              v-model="form.especialidade"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Unidade</label>
            <input
              v-model="form.unidade"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Porte</label>
            <input
              v-model="form.porte"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Modalidade WTT</label>
            <input
              v-model="form.modalidade_wtt"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Percentual</label>
            <input
              v-model.number="form.percentual"
              type="number"
              step="0.01"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Valor</label>
            <input
              v-model.number="form.valor"
              type="number"
              step="0.01"
              min="0"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Custo Operacional</label>
            <input
              v-model.number="form.custo_operacional"
              type="number"
              step="0.01"
              min="0"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Portes Anestésicos</label>
            <input
              v-model.number="form.portes_anestesicos"
              type="number"
              step="0.01"
              min="0"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Filmes</label>
            <input
              v-model.number="form.filmes"
              type="number"
              step="0.01"
              min="0"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Número de Auxiliares</label>
            <input
              v-model.number="form.numero_auxiliares"
              type="number"
              min="0"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Incidência</label>
            <input
              v-model="form.incidencia"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div class="flex items-center gap-2 h-11">
            <input
              v-model="form.ativo"
              type="checkbox"
              id="ativo"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="ativo" class="text-sm text-gray-700 dark:text-gray-400">Ativo</label>
          </div>

          <div class="flex items-center gap-2 h-11">
            <input
              v-model="form.exibir"
              type="checkbox"
              id="exibir"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="exibir" class="text-sm text-gray-700 dark:text-gray-400">Exibir</label>
          </div>

          <div class="flex items-center gap-2 h-11">
            <input
              v-model="form.exibir_inter"
              type="checkbox"
              id="exibir_inter"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="exibir_inter" class="text-sm text-gray-700 dark:text-gray-400">Exibir na internação</label>
          </div>

          <div class="flex items-center gap-2 h-11">
            <input
              v-model="form.destacar"
              type="checkbox"
              id="destacar"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="destacar" class="text-sm text-gray-700 dark:text-gray-400">Destacar</label>
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

interface ProcedimentoForm {
  id?: number
  nome: string
  codigo_tuss: string | null
  codigo_clinic: string | null
  descricao: string | null
  orientacoes: string | null
  tipo: string
  grupo: string | null
  tempo_estimado: number | null
  percentual: number | null
  porte: string | null
  valor: number | null
  custo_operacional: number | null
  numero_auxiliares: number | null
  portes_anestesicos: number | null
  filmes: number | null
  incidencia: string | null
  unidade: string | null
  exibir: boolean
  especialidade: string | null
  exibir_inter: boolean
  destacar: boolean
  modalidade_wtt: string | null
  ativo: boolean
}

const tipoOpcoes = ['Consulta', 'Exame', 'Cirurgia', 'Outros'] as const

const props = defineProps<{ isOpen: boolean; dados: ProcedimentoForm | null; somenteLeitura?: boolean }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const estadoInicial: ProcedimentoForm = {
  nome: '',
  codigo_tuss: null,
  codigo_clinic: null,
  descricao: null,
  orientacoes: null,
  tipo: 'Outros',
  grupo: null,
  tempo_estimado: null,
  percentual: null,
  porte: null,
  valor: null,
  custo_operacional: null,
  numero_auxiliares: null,
  portes_anestesicos: null,
  filmes: null,
  incidencia: null,
  unidade: null,
  exibir: true,
  especialidade: null,
  exibir_inter: false,
  destacar: false,
  modalidade_wtt: null,
  ativo: true,
}

const form = ref<ProcedimentoForm>({ ...estadoInicial })

const somenteLeitura = computed(() => Boolean(props.somenteLeitura))

const normalizaBoolean = (valor: unknown, defaultValue: boolean) => {
  if (valor === undefined || valor === null || valor === '') return defaultValue
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'number') return valor === 1
  if (typeof valor === 'string') {
    const normalized = valor.trim().toLowerCase()
    if (['1', 'true', 't', 'y', 'yes', 's', 'sim'].includes(normalized)) return true
    if (['0', 'false', 'f', 'n', 'no', 'nao', 'não'].includes(normalized)) return false
  }
  return Boolean(valor)
}

const normalizaNumero = (valor: unknown) => {
  if (valor === undefined || valor === null || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

const preencherFormulario = (dados: ProcedimentoForm | null) => {
  if (!dados) {
    form.value = { ...estadoInicial }
    return
  }

  form.value = {
    ...estadoInicial,
    ...dados,
    codigo_tuss: dados.codigo_tuss ?? null,
    codigo_clinic: dados.codigo_clinic ?? null,
    descricao: dados.descricao ?? null,
    orientacoes: dados.orientacoes ?? null,
    grupo: dados.grupo ?? null,
    tempo_estimado: normalizaNumero(dados.tempo_estimado),
    percentual: normalizaNumero(dados.percentual),
    porte: dados.porte ?? null,
    valor: normalizaNumero(dados.valor),
    custo_operacional: normalizaNumero(dados.custo_operacional),
    numero_auxiliares: normalizaNumero(dados.numero_auxiliares),
    portes_anestesicos: normalizaNumero(dados.portes_anestesicos),
    filmes: normalizaNumero(dados.filmes),
    incidencia: dados.incidencia ?? null,
    unidade: dados.unidade ?? null,
    especialidade: dados.especialidade ?? null,
    modalidade_wtt: dados.modalidade_wtt ?? null,
    exibir: normalizaBoolean(dados.exibir, true),
    exibir_inter: normalizaBoolean(dados.exibir_inter, false),
    destacar: normalizaBoolean(dados.destacar, false),
    ativo: normalizaBoolean(dados.ativo, true),
  }
}

watch(
  () => props.dados,
  (val) => {
    preencherFormulario(val)
  },
  { immediate: true }
)

const payload = computed(() => ({
  ...form.value,
  tempo_estimado: normalizaNumero(form.value.tempo_estimado),
  percentual: normalizaNumero(form.value.percentual),
  valor: normalizaNumero(form.value.valor),
  custo_operacional: normalizaNumero(form.value.custo_operacional),
  numero_auxiliares: normalizaNumero(form.value.numero_auxiliares),
  portes_anestesicos: normalizaNumero(form.value.portes_anestesicos),
  filmes: normalizaNumero(form.value.filmes),
}))

const salvar = async () => {
  if (somenteLeitura.value) {
    emit('close', false)
    return
  }
  try {
    if (!form.value.nome || !form.value.tipo) {
      emit('erro', { tipo: 'error', mensagem: 'Informe ao menos nome e tipo' })
      return
    }

    if (props.dados && props.dados.id) {
      await api.put(`/procedimentos/${props.dados.id}`, payload.value)
      emit('sucesso', { tipo: 'success', mensagem: 'Procedimento atualizado com sucesso' })
    } else {
      await api.post('/procedimentos', payload.value)
      emit('sucesso', { tipo: 'success', mensagem: 'Procedimento criado com sucesso' })
    }
    emit('close', true)
  } catch (err) {
    console.error(err)
    emit('erro', { tipo: 'error', mensagem: 'Erro ao salvar Procedimento' })
  }
}
</script>
