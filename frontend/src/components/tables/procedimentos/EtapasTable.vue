<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar por etapa, convênio ou tipo de procedimento..."
        class="w-full max-w-md px-3 py-2 text-sm border rounded"
      />
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          v-model="mostrarInativos"
          type="checkbox"
          class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
        />
        <span>Ver inativos</span>
      </label>
    </div>
    <div
      class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar"
    >
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Etapa</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Sequência</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6 w-[36rem] max-w-[36rem]">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Convênio</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Tipo de Procedimento</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Dias previstos</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Mínimo de anexos</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Situação</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Atualizado em</p>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="item in etapasFiltradas"
            :key="item.id"
            @click="selecionar(item)"
            :class="[
              'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
              { 'bg-gray-100 dark:bg-gray-800': selecionado?.id === item.id },
            ]"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-700 dark:text-gray-200">{{ item.nome }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">
                {{ obterSequenciaOrdenacao(item) ?? '—' }}
              </p>
            </td>
            <td class="px-5 py-4 sm:px-6 w-[36rem] max-w-[36rem]">
              <div class="max-w-[36rem]">
                <p
                  class="text-theme-sm truncate"
                  :class="[
                    item.convenios.length
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-400 italic'
                  ]"
                  :title="formatarConvenios(item)"
                >
                  {{ formatarConvenios(item) }}
                </p>
              </div>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p
                class="text-theme-sm truncate"
                :class="[
                  item.tipos.length ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 italic'
                ]"
                :title="formatarTipos(item)"
              >
                {{ formatarTipos(item) }}
              </p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">
                {{ formatarDiasPrevistos(item.dias_previstos) }}
              </p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">
                {{ formatarMinimoAnexos(item.minimo_anexos) }}
              </p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <Badge :color="item.ativo ? 'success' : 'error'" variant="light">
                {{ item.ativo ? 'Ativo' : 'Inativo' }}
              </Badge>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">
                {{ formatarData(item.updated_at || item.created_at) }}
              </p>
            </td>
          </tr>
          <tr v-if="etapasFiltradas.length === 0">
            <td colspan="8" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhuma etapa cadastrada
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <EtapaModal
      :is-open="modalVisivel"
      :dados="etapaSelecionada"
      @close="fecharModal"
      @sucesso="handleNotificacao"
      @erro="handleNotificacao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, defineExpose } from 'vue'
import api from '@/plugins/axios'
import EtapaModal from '@/components/forms/procedimentos/EtapaModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'

interface TipoEtapa {
  id: number
  nome: string
  ativo: boolean
}

interface ConvenioEtapa {
  id: number
  nome: string
  referencia?: string | null
  usa_integracao?: boolean
}

interface EtapaDependenciaResumo {
  id: number
  nome: string | null
}

interface Etapa {
  id: number
  nome: string
  procedimento_tipo_ids: number[]
  tipos: TipoEtapa[]
  convenio_ids: number[]
  convenios: ConvenioEtapa[]
  solicitar_data_limite?: boolean
  usa_integracao: boolean
  ativo: boolean
  created_at?: string
  updated_at?: string
  dias_previstos?: number | null
  minimo_anexos?: number | null
  depende_de_id?: number | null
  depende_de?: EtapaDependenciaResumo | null
  sequencia?: number | null
  ordem?: number | null
}

const props = defineProps<{ atualizar: boolean }>()

const etapas = ref<Etapa[]>([])
const filtro = ref('')
const mostrarInativos = ref(false)
const selecionado = ref<Etapa | null>(null)
const modalVisivel = ref(false)
const etapaSelecionada = ref<Etapa | null>(null)
const toast = useToast()

const carregarEtapas = async () => {
  try {
    const response = await api.get('/etapas')
    const recebidas = Array.isArray(response.data) ? (response.data as Etapa[]) : []
    etapas.value = recebidas.map((item) => {
      const tipos = Array.isArray(item.tipos) ? item.tipos : []
      const convenios = Array.isArray(item.convenios) ? item.convenios : []
      const dependenciaId = normalizarDependenciaId(
        item.depende_de_id ?? item.depende_de?.id
      )
      const dependenciaNome =
        typeof item.depende_de?.nome === 'string'
          ? item.depende_de.nome
          : null

      return {
        ...item,
        tipos,
        convenios,
        solicitar_data_limite: Boolean(item.solicitar_data_limite),
        dias_previstos:
          item.dias_previstos === null || item.dias_previstos === undefined
            ? null
            : normalizarDiasPrevistos(item.dias_previstos),
        minimo_anexos: normalizarMinimoAnexos(item.minimo_anexos),
        depende_de_id: dependenciaId,
        depende_de:
          dependenciaId !== null
            ? {
                id: dependenciaId,
                nome: dependenciaNome,
              }
            : null,
        sequencia: normalizarSequencia(item.sequencia ?? item.ordem),
      }
    })
    if (selecionado.value) {
      const atual = etapas.value.find((item) => item.id === selecionado.value?.id)
      selecionado.value = atual || null
    }
  } catch (err) {
    console.error(err)
    toast.error('Erro ao carregar etapas')
  }
}

const obterSequenciaOrdenacao = (etapa: Etapa): number | null =>
  normalizarSequencia(etapa.sequencia ?? etapa.ordem)

const ordenarEtapas = (lista: Etapa[]) =>
  [...lista].sort((a, b) => {
    const seqA = obterSequenciaOrdenacao(a)
    const seqB = obterSequenciaOrdenacao(b)

    if (seqA !== null && seqB !== null && seqA !== seqB) {
      return seqA - seqB
    }
    if (seqA !== null && seqB === null) {
      return -1
    }
    if (seqA === null && seqB !== null) {
      return 1
    }

    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

const etapasFiltradas = computed(() => {
  const etapasVisiveis = mostrarInativos.value
    ? etapas.value
    : etapas.value.filter((item) => item.ativo)

  if (!filtro.value) {
    return ordenarEtapas(etapasVisiveis)
  }

  const termo = filtro.value.toLowerCase()
  return ordenarEtapas(
    etapasVisiveis.filter((item) => {
      const nomeEtapa = item.nome.toLowerCase()
      const nomesConvenios = item.convenios.map((conv) => (conv.nome || '').toLowerCase())
      const nomesTipos = item.tipos.map((tipo) => (tipo.nome || '').toLowerCase())

      return (
        nomeEtapa.includes(termo) ||
        nomesConvenios.some((nome) => nome.includes(termo)) ||
        nomesTipos.some((nome) => nome.includes(termo))
      )
    })
  )
})

const selecionar = (item: Etapa) => {
  selecionado.value = item
}

const normalizarDiasPrevistos = (valor: unknown): number | null => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero < 0) {
    return null
  }

  return Math.trunc(numero)
}

const normalizarMinimoAnexos = (valor: unknown): number => {
  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero < 0) {
    return 0
  }

  return Math.trunc(numero)
}

const normalizarSequencia = (valor: unknown): number | null => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero < 0) {
    return null
  }

  return Math.trunc(numero)
}

const normalizarDependenciaId = (valor: unknown): number | null => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero)) {
    return null
  }

  const inteiro = Math.trunc(numero)
  return inteiro > 0 ? inteiro : null
}

const editarSelecionado = () => {
  if (selecionado.value) {
    etapaSelecionada.value = selecionado.value
    modalVisivel.value = true
  }
}

const excluir = async (id: number) => {
  if (!confirm('Confirma a exclusão da etapa?')) return
  try {
    await api.delete(`/etapas/${id}`)
    toast.success('Etapa removida com sucesso')
    await carregarEtapas()
  } catch (err) {
    console.error(err)
    toast.error('Erro ao remover etapa')
  }
}

const excluirSelecionado = async () => {
  if (selecionado.value) {
    await excluir(selecionado.value.id)
  }
}

const fecharModal = async (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  etapaSelecionada.value = null
  if (precisaAtualizar) {
    await carregarEtapas()
  }
}

const handleNotificacao = (n: { tipo: ToastType; mensagem: string }) => {
  if (n.tipo === 'success') {
    toast.success(n.mensagem)
  } else if (n.tipo === 'error') {
    toast.error(n.mensagem)
  } else {
    toast.info(n.mensagem)
  }
}

const formatarConvenios = (item: Etapa) => {
  if (!item.convenios.length) return 'Sem convênios vinculados'

  const nomes = item.convenios
    .map((convenio) => convenio.nome.trim())
    .filter((nome) => nome.length > 0)

  return nomes.length ? nomes.join(', ') : 'Sem convênios vinculados'
}

const formatarTipos = (item: Etapa) => {
  if (!item.tipos.length) return 'Sem tipos vinculados'

  const nomes = item.tipos
    .map((tipo) => {
      const base = tipo.nome.trim()
      if (!base) return ''
      return `${base}${tipo.ativo ? '' : ' (inativo)'}`
    })
    .filter((nome) => nome.length > 0)

  return nomes.length ? nomes.join(', ') : 'Sem tipos vinculados'
}

const formatarDiasPrevistos = (valor: number | null | undefined) => {
  if (valor === null || valor === undefined) {
    return 'Sem previsão'
  }

  if (valor === 1) {
    return '1 dia'
  }

  return `${valor} dias`
}

const formatarMinimoAnexos = (valor: number | null | undefined) => {
  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero <= 0) {
    return 'Nenhum'
  }

  const inteiro = Math.trunc(numero)
  if (inteiro === 1) {
    return '1 anexo'
  }

  return `${inteiro} anexos`
}

const formatarData = (valor?: string) => {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR')
}

watch(
  () => props.atualizar,
  () => {
    carregarEtapas()
  }
)

onMounted(() => carregarEtapas())

defineExpose({ editarSelecionado, excluirSelecionado })
</script>
