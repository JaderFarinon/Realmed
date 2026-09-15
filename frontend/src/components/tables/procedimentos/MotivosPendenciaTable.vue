<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar por motivo ou etapa..."
        class="w-full max-w-md px-3 py-2 text-sm border rounded"
      />
    </div>
    <div class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Motivo</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Etapas</p>
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
            v-for="item in motivosFiltrados"
            :key="item.id"
            @click="selecionar(item)"
            :class="[
              'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
              { 'bg-gray-100 dark:bg-gray-800': selecionado?.id === item.id },
            ]"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-700 dark:text-gray-200">{{ item.descricao }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p
                class="text-theme-sm truncate"
                :class="[item.etapas.length ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 italic']"
                :title="formatarEtapas(item)"
              >
                {{ formatarEtapas(item) }}
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
          <tr v-if="motivosFiltrados.length === 0">
            <td colspan="4" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhum motivo cadastrado
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <MotivoPendenciaModal
      :is-open="modalVisivel"
      :dados="motivoSelecionado"
      @close="fecharModal"
      @sucesso="handleNotificacao"
      @erro="handleNotificacao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineExpose, onMounted, ref, watch } from 'vue'
import api from '@/plugins/axios'
import MotivoPendenciaModal from '@/components/forms/procedimentos/MotivoPendenciaModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'

interface EtapaResumo {
  id: number
  nome: string
  ativo: boolean
}

interface MotivoPendencia {
  id: number
  descricao: string
  ativo: boolean
  etapa_ids: number[]
  etapas: EtapaResumo[]
  created_at?: string
  updated_at?: string
}

const props = defineProps<{ atualizar: boolean }>()

const motivos = ref<MotivoPendencia[]>([])
const filtro = ref('')
const selecionado = ref<MotivoPendencia | null>(null)
const modalVisivel = ref(false)
const motivoSelecionado = ref<MotivoPendencia | null>(null)
const toast = useToast()

const normalizaEtapaLista = (etapas: unknown): EtapaResumo[] => {
  if (!Array.isArray(etapas)) {
    return []
  }
  return etapas
    .map((etapa: any) => ({
      id: Number(etapa?.id),
      nome: typeof etapa?.nome === 'string' ? etapa.nome : '',
      ativo: etapa?.ativo === undefined ? true : Boolean(etapa.ativo),
    }))
    .filter((etapa) => Number.isInteger(etapa.id))
}

const normalizaIds = (valor: unknown): number[] => {
  if (!Array.isArray(valor)) {
    return []
  }
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

const carregarMotivos = async () => {
  try {
    const response = await api.get('/motivos-pendencia')
    const recebidos = Array.isArray(response.data) ? (response.data as MotivoPendencia[]) : []
    motivos.value = recebidos.map((item) => ({
      ...item,
      descricao: typeof item.descricao === 'string' ? item.descricao : '',
      ativo: Boolean(item.ativo),
      etapas: normalizaEtapaLista(item.etapas),
      etapa_ids: normalizaIds(item.etapa_ids),
    }))
    if (selecionado.value) {
      const atual = motivos.value.find((motivo) => motivo.id === selecionado.value?.id)
      selecionado.value = atual || null
    }
  } catch (err: any) {
    console.error('Erro ao carregar motivos de pendência', err)
    const mensagem = err?.response?.data?.error || 'Erro ao carregar motivos de pendência'
    toast.error(mensagem)
  }
}

const motivosFiltrados = computed(() => {
  const ordenar = (lista: MotivoPendencia[]) =>
    [...lista].sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))

  if (!filtro.value) {
    return ordenar(motivos.value)
  }

  const termo = filtro.value.toLowerCase()
  return ordenar(
    motivos.value.filter((item) => {
      const descricao = item.descricao.toLowerCase()
      const etapas = item.etapas.map((etapa) => (etapa.nome || '').toLowerCase())
      return descricao.includes(termo) || etapas.some((nome) => nome.includes(termo))
    }),
  )
})

const selecionar = (item: MotivoPendencia) => {
  selecionado.value = item
}

const editarSelecionado = () => {
  if (selecionado.value) {
    motivoSelecionado.value = selecionado.value
    modalVisivel.value = true
  }
}

const excluir = async (id: number) => {
  if (!confirm('Confirma a exclusão do motivo de pendência?')) return
  try {
    await api.delete(`/motivos-pendencia/${id}`)
    toast.success('Motivo removido com sucesso')
    await carregarMotivos()
  } catch (err: any) {
    console.error('Erro ao remover motivo de pendência', err)
    const mensagem = err?.response?.data?.error || 'Erro ao remover motivo de pendência'
    toast.error(mensagem)
  }
}

const excluirSelecionado = async () => {
  if (selecionado.value) {
    await excluir(selecionado.value.id)
  }
}

const fecharModal = async (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  motivoSelecionado.value = null
  if (precisaAtualizar) {
    await carregarMotivos()
  }
}

const handleNotificacao = (notificacao: { tipo: ToastType; mensagem: string }) => {
  if (notificacao.tipo === 'success') {
    toast.success(notificacao.mensagem)
  } else if (notificacao.tipo === 'error') {
    toast.error(notificacao.mensagem)
  } else {
    toast.info(notificacao.mensagem)
  }
}

const formatarEtapas = (motivo: MotivoPendencia) => {
  if (!motivo.etapas.length) {
    return 'Sem etapas vinculadas'
  }

  const nomes = motivo.etapas
    .map((etapa) => {
      const base = etapa.nome.trim()
      if (!base) {
        return ''
      }
      return `${base}${etapa.ativo ? '' : ' (inativa)'}`
    })
    .filter((nome) => nome.length > 0)

  return nomes.length ? nomes.join(', ') : 'Sem etapas vinculadas'
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
    carregarMotivos()
  },
)

onMounted(() => {
  carregarMotivos()
})

defineExpose({ editarSelecionado, excluirSelecionado })
</script>
