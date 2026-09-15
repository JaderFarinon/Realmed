<template>
  <AdminLayout>
    <div class="space-y-6">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Mapa Cirúrgico</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Defina o período e, se desejar, selecione um médico específico para gerar o mapa cirúrgico em PDF.
        </p>
      </div>
      <ComponentCard
        title="Filtros do relatório"
        desc="Os filtros abaixo determinam os dados exibidos no relatório gerado pelo backend."
        class-name="max-w-5xl"
        body-class="space-y-6"
      >
        <div class="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="data-inicio">Data inicial</label>
              <input id="data-inicio" v-model="filtros.dataInicio" type="date" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="hora-inicio">Hora inicial</label>
              <input id="hora-inicio" v-model="filtros.horaInicio" type="time" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="data-fim">Data final</label>
              <input id="data-fim" v-model="filtros.dataFim" type="date" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="hora-fim">Hora final</label>
              <input id="hora-fim" v-model="filtros.horaFim" type="time" class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="medico">Médico</label>
            <select
              id="medico"
              v-model="filtros.medico"
              class="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 pr-10"
              :disabled="loadingMedicos"
            >
              <option value="todos">Todos os médicos</option>
              <option
                v-for="medico in medicos"
                :key="medico.id"
                :value="medico.value"
              >
                {{ medico.nome }}<template v-if="medico.crm"> (CRM {{ medico.crm }})</template>
                - {{ formatarOrigemMedico(medico.origem) }}
              </option>
            </select>
            <p v-if="loadingMedicos" class="text-xs text-gray-500 dark:text-gray-400">
              Carregando lista de médicos...
            </p>
            <p v-else-if="erroMedicos" class="text-xs text-rose-500">{{ erroMedicos }}</p>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">
              Mantenha "Todos os médicos" para visualizar todas as cirurgias do período.
            </p>
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <Button @click="gerarRelatorio" :disabled="gerando || !podeGerar">
              <span v-if="gerando" class="flex items-center gap-2">
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Gerando...
              </span>
              <span v-else>Gerar relatório</span>
            </Button>
            <span v-if="!podeGerar" class="text-sm text-rose-500">
              Informe as datas inicial e final para gerar o relatório.
            </span>
          </div>
          <p v-if="erroRelatorio" class="text-sm text-rose-500">{{ erroRelatorio }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            O relatório é aberto em uma nova aba no formato PDF gerado diretamente pelo backend com pdfmake.
          </p>
        </div>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import api from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import {
  buscarMedicosIntegrados,
  formatarOrigemMedico,
  type MedicoOrigem,
} from '@/services/medicos'

interface MedicoOption {
  id: string
  value: string
  crm: string
  nome: string
  origem: MedicoOrigem
}

const filtros = reactive({
  dataInicio: '',
  horaInicio: '',
  dataFim: '',
  horaFim: '',
  medico: 'todos',
})

const medicos = ref<MedicoOption[]>([])
const loadingMedicos = ref(false)
const erroMedicos = ref<string | null>(null)
const gerando = ref(false)
const erroRelatorio = ref<string | null>(null)

const toast = useToast()

const podeGerar = computed(() => Boolean(filtros.dataInicio && filtros.dataFim))

const buildDateTime = (date: string, time: string | null, isEnd = false) => {
  if (!date) {
    return null
  }

  const trimmed = (time || '').trim()
  let hours = '00'
  let minutes = '00'
  let seconds = '00'

  if (trimmed) {
    const parts = trimmed.split(':')
    hours = (parts[0] || '00').padStart(2, '0')
    minutes = (parts[1] || '00').padStart(2, '0')
    seconds = (parts[2] || (isEnd ? '59' : '00')).padStart(2, '0')
  } else if (isEnd) {
    hours = '23'
    minutes = '59'
    seconds = '59'
  }

  const isoString = `${date}T${hours}:${minutes}:${seconds}`
  const value = new Date(isoString)
  return Number.isNaN(value.getTime()) ? null : value
}

const carregarMedicos = async () => {
  loadingMedicos.value = true
  erroMedicos.value = null

  try {
    const lista = await buscarMedicosIntegrados()
    const mapa = new Map<string, MedicoOption>()

    for (const medico of lista) {
      const nome = medico.nome_completo.trim()
      if (!nome) continue

      const crm = (medico.crm_numero || medico.crm_numero_original || '').trim()
      if (!crm) continue

      const existente = mapa.get(crm)
      const opcao: MedicoOption = {
        id: `${crm}-${medico.origem}`,
        value: crm,
        crm,
        nome,
        origem: medico.origem,
      }

      if (!existente || (existente.origem !== 'integracao' && medico.origem === 'integracao')) {
        mapa.set(crm, opcao)
      }
    }

    medicos.value = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    if (filtros.medico !== 'todos' && !medicos.value.some((item) => item.value === filtros.medico)) {
      filtros.medico = 'todos'
    }
  } catch (error) {
    console.error('Erro ao carregar médicos do centro cirúrgico', error)
    erroMedicos.value = 'Não foi possível carregar a lista de médicos.'
    toast.error('Não foi possível carregar a lista de médicos do centro cirúrgico')
  } finally {
    loadingMedicos.value = false
  }
}

const gerarRelatorio = async () => {
  erroRelatorio.value = null

  if (!podeGerar.value) {
    toast.error('Informe as datas inicial e final para gerar o relatório')
    return
  }

  const dataInicio = buildDateTime(filtros.dataInicio, filtros.horaInicio || null, false)
  const dataFim = buildDateTime(filtros.dataFim, filtros.horaFim || null, true)

  if (!dataInicio || !dataFim) {
    erroRelatorio.value = 'Datas ou horários inválidos.'
    toast.error('Datas ou horários inválidos')
    return
  }

  if (dataInicio.getTime() > dataFim.getTime()) {
    erroRelatorio.value = 'A data inicial deve ser anterior ou igual à data final.'
    toast.error('A data inicial deve ser anterior ou igual à data final')
    return
  }

  const payload = {
    dataInicio: filtros.dataInicio,
    horaInicio: filtros.horaInicio || null,
    dataFim: filtros.dataFim,
    horaFim: filtros.horaFim || null,
    medico: filtros.medico === 'todos' ? null : filtros.medico,
  }

  try {
    gerando.value = true
    const response = await api.post('/relatorios/mapa-cirurgico', payload, {
      responseType: 'blob',
    })

    const file = new Blob([response.data], { type: 'application/pdf' })
    const fileUrl = URL.createObjectURL(file)
    window.open(fileUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000)
    toast.success('Relatório gerado com sucesso')
  } catch (error: unknown) {
    console.error('Erro ao gerar o relatório do mapa cirúrgico', error)
    const resposta = error as { response?: { data?: { mensagem?: string } } }
    const mensagem = resposta.response?.data?.mensagem || 'Não foi possível gerar o relatório.'
    erroRelatorio.value = mensagem
    toast.error(mensagem)
  } finally {
    gerando.value = false
  }
}

onMounted(() => {
  const hoje = new Date().toISOString().slice(0, 10)
  filtros.dataInicio = hoje
  filtros.dataFim = hoje
  filtros.horaInicio = '00:00'
  filtros.horaFim = '23:59'
  carregarMedicos()
})
</script>

