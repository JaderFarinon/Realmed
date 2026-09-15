<template>
  <div class="flex flex-col gap-4 h-full">
    <NotificationBar color="info" :icon="InfoIcon">
      Gerencie contratos, acompanhe o workflow e visualize a linha do tempo das ações recentes.
    </NotificationBar>

    <CardBox class="flex flex-col flex-1" body-class="flex flex-col flex-1 min-h-0 gap-4">
      <div class="flex justify-between items-center gap-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">{{ contratos.length }} contrato(s)</div>
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Itens por página:</span>
          <select
            v-model.number="perPage"
            class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80 dark:focus:border-brand-800"
          >
            <option v-for="option in perPageOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </div>
      </div>

      <div class="flex-1 overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Título
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Responsável
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Vencimento
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-if="carregando">
              <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Carregando contratos...
              </td>
            </tr>
            <tr v-else-if="contratos.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum contrato cadastrado.
              </td>
            </tr>
            <tr
              v-for="contrato in contratosPaginados"
              :key="contrato.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
              :class="{
                'bg-brand-50 dark:bg-brand-500/10': contratoSelecionado?.id === contrato.id,
              }"
              @click="selecionarContrato(contrato)">
              <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{{ contrato.titulo }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ contrato.status }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {{ contrato.responsavel_interno || '-' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{{ contrato.data_vencimento || '-' }}</td>
              <td class="px-4 py-3 text-right text-sm">
                <button class="text-brand-500 hover:underline" @click="abrirModal(contrato)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CardBox>

    <ModalBox v-model="modalAberto" title="Contrato" large>
      <form class="space-y-4" @submit.prevent="salvar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Título" label-for="titulo">
            <FormControl id="titulo" v-model="form.titulo" required />
          </FormField>
          <FormField label="Tipo" label-for="tipo">
            <FormControl id="tipo" v-model="form.tipo" />
          </FormField>
          <FormField label="Contratado" label-for="contratado">
            <FormControl id="contratado" v-model="form.contratado" />
          </FormField>
          <FormField label="Contratante" label-for="contratante">
            <FormControl id="contratante" v-model="form.contratante" />
          </FormField>
          <FormField label="Valor mensal" label-for="valor_mensal">
            <FormControl id="valor_mensal" v-model="form.valor_mensal" type="number" step="0.01" />
          </FormField>
          <FormField label="Valor total" label-for="valor_total">
            <FormControl id="valor_total" v-model="form.valor_total" type="number" step="0.01" />
          </FormField>
          <FormField label="Início" label-for="data_inicio">
            <FormControl id="data_inicio" v-model="form.data_inicio" type="date" />
          </FormField>
          <FormField label="Vencimento" label-for="data_vencimento">
            <FormControl id="data_vencimento" v-model="form.data_vencimento" type="date" />
          </FormField>
          <FormField label="Recorrência" label-for="recorrencia">
            <FormControl id="recorrencia" v-model="form.recorrencia" placeholder="mensal, anual..." />
          </FormField>
          <FormField label="Índice de reajuste" label-for="indice_reajuste">
            <FormControl id="indice_reajuste" v-model="form.indice_reajuste" />
          </FormField>
          <FormField label="Status" label-for="status">
            <FormControl id="status" v-model="form.status" />
          </FormField>
          <FormField label="Responsável interno" label-for="responsavel_interno">
            <FormControl id="responsavel_interno" v-model="form.responsavel_interno" />
          </FormField>
        </div>

        <FormField label="Observações" label-for="observacoes">
          <FormControl id="observacoes" v-model="form.observacoes" type="textarea" rows="3" />
        </FormField>

        <div class="flex flex-wrap gap-2">
          <Button color="info" type="button" @click="enviarParaAprovacao">Enviar para aprovação</Button>
          <Button color="success" type="button" @click="atualizarStatus('Aprovado')">Aprovar</Button>
          <Button color="danger" type="button" @click="atualizarStatus('Reprovado')">Reprovar</Button>
        </div>

        <div class="flex justify-end gap-2">
          <Button type="button" color="light" @click="modalAberto = false">Cancelar</Button>
          <Button type="submit" color="info">Salvar</Button>
        </div>
      </form>
    </ModalBox>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import api from '@/plugins/axios'
import CardBox from '@/components/layout/CardBox.vue'
import ModalBox from '@/components/ModalBox.vue'
import FormField from '@/components/FormField.vue'
import FormControl from '@/components/FormControl.vue'
import Button from '@/components/ui/Button.vue'
import NotificationBar from '@/components/layout/NotificationBar.vue'
import { InfoIcon } from '@/icons'

interface Contrato {
  id?: number
  titulo: string
  tipo?: string
  contratado?: string
  contratante?: string
  valor_mensal?: number | null
  valor_total?: number | null
  data_inicio?: string | null
  data_vencimento?: string | null
  recorrencia?: string | null
  indice_reajuste?: string | null
  status?: string | null
  responsavel_interno?: string | null
  observacoes?: string | null
}

const emit = defineEmits<{ (event: 'contratoSelecionado', contrato: Contrato | null): void }>()

const contratos = ref<Contrato[]>([])
const carregando = ref(false)
const perPageOptions = [5, 10, 20]
const perPage = ref(10)
const currentPage = ref(1)

const modalAberto = ref(false)
const form = reactive<Contrato>({ titulo: '', status: 'Rascunho' })
const contratoSelecionado = ref<Contrato | null>(null)

const contratosOrdenados = computed(() => contratos.value)
const contratosPaginados = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return contratosOrdenados.value.slice(start, start + perPage.value)
})

const carregarContratos = async () => {
  carregando.value = true
  try {
    const { data } = await api.get<Contrato[]>('/contratos')
    contratos.value = data

    if (!contratoSelecionado.value && contratos.value.length > 0) {
      selecionarContrato(contratos.value[0])
    } else if (contratoSelecionado.value) {
      const atualizado = contratos.value.find((item) => item.id === contratoSelecionado.value?.id)
      if (atualizado) {
        selecionarContrato(atualizado)
      }
    }
  } catch (error) {
    console.error('Erro ao carregar contratos', error)
  } finally {
    carregando.value = false
  }
}

const resetForm = () => {
  Object.assign(form, {
    id: undefined,
    titulo: '',
    tipo: '',
    contratado: '',
    contratante: '',
    valor_mensal: null,
    valor_total: null,
    data_inicio: null,
    data_vencimento: null,
    recorrencia: '',
    indice_reajuste: '',
    status: 'Rascunho',
    responsavel_interno: '',
    observacoes: '',
  })
}

const abrirModal = (contrato?: Contrato) => {
  contratoSelecionado.value = contrato || null
  resetForm()
  if (contrato) {
    Object.assign(form, contrato)
    selecionarContrato(contrato)
  }
  modalAberto.value = true
}

const selecionarContrato = (contrato: Contrato | null) => {
  contratoSelecionado.value = contrato
  emit('contratoSelecionado', contrato)
}

const salvar = async () => {
  try {
    if (contratoSelecionado.value?.id) {
      await api.put(`/contratos/${contratoSelecionado.value.id}`, form)
    } else {
      await api.post('/contratos', form)
    }
    modalAberto.value = false
    await carregarContratos()
  } catch (error) {
    console.error('Erro ao salvar contrato', error)
  }
}

const atualizarStatus = async (novoStatus: string) => {
  if (!contratoSelecionado.value?.id) return
  await api.post(`/contratos/${contratoSelecionado.value.id}/workflow`, { status: novoStatus })
  await carregarContratos()
}

const enviarParaAprovacao = async () => atualizarStatus('Em Aprovação')

watch(perPage, () => {
  currentPage.value = 1
})

carregarContratos()

defineExpose({ abrirModal })
</script>
