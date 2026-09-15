<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar por nome..."
        class="w-full max-w-md px-3 py-2 text-sm border rounded"
      />
    </div>
    <div class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Nome</p>
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
            v-for="item in tiposFiltrados"
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
          <tr v-if="tiposFiltrados.length === 0">
            <td colspan="3" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhum tipo de procedimento encontrado
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <TipoProcedimentoModal
      :is-open="modalVisivel"
      :dados="tipoSelecionado"
      @close="fecharModal"
      @sucesso="handleNotificacao"
      @erro="handleNotificacao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, defineExpose } from 'vue'
import api from '@/plugins/axios'
import TipoProcedimentoModal from '@/components/forms/procedimentos/TipoProcedimentoModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'

interface TipoProcedimento {
  id: number
  nome: string
  ativo: boolean
  created_at?: string
  updated_at?: string
}

const props = defineProps<{ atualizar: boolean }>()

const tipos = ref<TipoProcedimento[]>([])
const filtro = ref('')
const selecionado = ref<TipoProcedimento | null>(null)
const modalVisivel = ref(false)
const tipoSelecionado = ref<TipoProcedimento | null>(null)
const toast = useToast()

const carregarTipos = async () => {
  try {
    const response = await api.get('/procedimento-tipos')
    tipos.value = response.data
    if (selecionado.value) {
      const atualizado = tipos.value.find((item) => item.id === selecionado.value?.id)
      selecionado.value = atualizado || null
    }
  } catch (err) {
    console.error(err)
    toast.error('Erro ao carregar tipos de procedimento')
  }
}

const tiposFiltrados = computed(() => {
  if (!filtro.value) {
    return [...tipos.value].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }
  const termo = filtro.value.toLowerCase()
  return tipos.value
    .filter((item) => item.nome.toLowerCase().includes(termo))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
})

const selecionar = (item: TipoProcedimento) => {
  selecionado.value = item
}

const editarSelecionado = () => {
  if (selecionado.value) {
    tipoSelecionado.value = selecionado.value
    modalVisivel.value = true
  }
}

const excluir = async (id: number) => {
  if (!confirm('Confirma a exclusão do tipo de procedimento?')) return
  try {
    await api.delete(`/procedimento-tipos/${id}`)
    toast.success('Tipo de procedimento removido com sucesso')
    await carregarTipos()
  } catch (err) {
    console.error(err)
    toast.error('Erro ao remover tipo de procedimento')
  }
}

const excluirSelecionado = async () => {
  if (selecionado.value) {
    await excluir(selecionado.value.id)
  }
}

const fecharModal = async (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  tipoSelecionado.value = null
  if (precisaAtualizar) {
    await carregarTipos()
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

const formatarData = (valor?: string) => {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR')
}

watch(
  () => props.atualizar,
  () => {
    carregarTipos()
  }
)

onMounted(() => carregarTipos())

defineExpose({ editarSelecionado, excluirSelecionado })
</script>
