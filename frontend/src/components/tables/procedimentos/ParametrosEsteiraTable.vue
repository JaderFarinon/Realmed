<template>
  <div class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex items-center justify-between gap-4 p-4 border-b border-gray-100 dark:border-gray-800">
      <div>
        <h3 class="text-base font-semibold text-gray-800 dark:text-white/90">Parâmetros configurados</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Ajuste os valores utilizados na validação de prazos da esteira cirúrgica.
        </p>
      </div>
    </div>
    <div class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Parâmetro</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Valor configurado</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Atualizado em</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Usuário</p>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="item in parametros"
            :key="item.parametro"
            @click="selecionar(item)"
            :class="[
              'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
              { 'bg-gray-100 dark:bg-gray-800': selecionado?.parametro === item.parametro },
            ]"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-700 dark:text-gray-200">{{ item.label }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-700 dark:text-gray-200">{{ formatarValor(item) }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatarData(item.updated_at || item.created_at) }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.usuario_nome || '-' }}</p>
            </td>
          </tr>
          <tr v-if="parametros.length === 0">
            <td colspan="4" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhum parâmetro configurado.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ParametroEsteiraModal
      :is-open="modalVisivel"
      :dados="parametroSelecionado"
      @close="fecharModal"
      @sucesso="handleNotificacao"
      @erro="handleNotificacao"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, defineExpose } from 'vue'
import api from '@/plugins/axios'
import { useToast, type ToastType } from '@/composables/useToast'
import ParametroEsteiraModal from '@/components/forms/procedimentos/ParametroEsteiraModal.vue'
import type { ParametroEsteira } from '@/types/parametrosEsteira'

const props = defineProps<{ atualizar: boolean }>()

const parametros = ref<ParametroEsteira[]>([])
const selecionado = ref<ParametroEsteira | null>(null)
const modalVisivel = ref(false)
const parametroSelecionado = ref<ParametroEsteira | null>(null)
const toast = useToast()

const carregarParametros = async () => {
  try {
    const { data } = await api.get('/parametros-esteira-procedimento')
    const listaRecebida = Array.isArray(data) ? (data as ParametroEsteira[]) : []
    parametros.value = listaRecebida.map((item) => ({
      ...item,
      valor: item.valor ?? '0',
      label: item.label || item.parametro,
    }))

    if (selecionado.value) {
      const atual = parametros.value.find((param) => param.parametro === selecionado.value?.parametro)
      selecionado.value = atual || null
    }

    if (!selecionado.value && parametros.value.length > 0) {
      selecionado.value = parametros.value[0]
    }
  } catch (err: any) {
    console.error('Erro ao carregar parâmetros da esteira', err)
    const mensagem = err?.response?.data?.error || 'Erro ao carregar parâmetros da esteira'
    toast.error(mensagem)
  }
}

const selecionar = (item: ParametroEsteira) => {
  selecionado.value = item
}

const editarSelecionado = () => {
  if (!selecionado.value && parametros.value.length > 0) {
    selecionado.value = parametros.value[0]
  }
  if (selecionado.value) {
    parametroSelecionado.value = { ...selecionado.value }
    modalVisivel.value = true
  }
}

const fecharModal = async (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  if (precisaAtualizar) {
    await carregarParametros()
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

const formatarValor = (parametro: ParametroEsteira) => {
  if (parametro.tipo === 'integer') {
    const numero = Number(parametro.valor)
    if (Number.isFinite(numero)) {
      return `${numero} dia${numero === 1 ? '' : 's'}`
    }
  }
  return parametro.valor ?? '-'
}

const formatarData = (valor?: string | null) => {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR')
}

watch(
  () => props.atualizar,
  () => {
    carregarParametros()
  },
)

onMounted(() => {
  carregarParametros()
})

defineExpose({ editarSelecionado })
</script>
