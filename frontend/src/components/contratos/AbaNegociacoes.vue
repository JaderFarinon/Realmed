<template>
  <CardBox class="flex flex-col flex-1" body-class="flex flex-col flex-1 gap-4">
    <NotificationBar color="info" :icon="InfoIcon">
      Registre negociações e acompanhe contra-propostas e reajustes.
    </NotificationBar>

    <div class="flex justify-between items-center">
      <div class="text-sm text-gray-500 dark:text-gray-400">{{ itens.length }} negociação(ões)</div>
      <Button color="info" size="sm" :disabled="!temContratoSelecionado" @click="abrirModal()">Novo</Button>
    </div>

    <div class="flex-1 overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Contrato
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Valor proposto
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ações
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-if="carregando">
            <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando negociações...
            </td>
          </tr>
          <tr v-else-if="!temContratoSelecionado">
            <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Selecione um contrato para visualizar as negociações.
            </td>
          </tr>
          <tr v-else-if="itens.length === 0">
            <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma negociação.</td>
          </tr>
          <tr v-for="item in itens" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40">
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.contrato_id || '-' }}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.status }}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.valor_proposto || '-' }}</td>
            <td class="px-4 py-3 text-right text-sm">
              <button class="text-brand-500 hover:underline" @click="abrirModal(item)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalBox v-model="modalAberto" title="Negociação" large>
      <form class="space-y-4" @submit.prevent="salvar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Contrato" label-for="contrato_id">
            <FormControl id="contrato_id" v-model="form.contrato_id" type="number" />
          </FormField>
          <FormField label="Valor atual" label-for="valor_atual">
            <FormControl id="valor_atual" v-model="form.valor_atual" type="number" step="0.01" />
          </FormField>
          <FormField label="Valor proposto" label-for="valor_proposto">
            <FormControl id="valor_proposto" v-model="form.valor_proposto" type="number" step="0.01" />
          </FormField>
          <FormField label="% Reajuste" label-for="percentual_reajuste">
            <FormControl id="percentual_reajuste" v-model="form.percentual_reajuste" type="number" step="0.01" />
          </FormField>
          <FormField label="Data" label-for="data_proposta">
            <FormControl id="data_proposta" v-model="form.data_proposta" type="date" />
          </FormField>
          <FormField label="Status" label-for="status">
            <FormControl id="status" v-model="form.status" />
          </FormField>
        </div>
        <FormField label="Anotações" label-for="anotacoes">
          <FormControl id="anotacoes" v-model="form.anotacoes" type="textarea" rows="3" />
        </FormField>
        <div class="flex justify-end gap-2">
          <Button type="button" color="light" @click="modalAberto = false">Cancelar</Button>
          <Button type="submit" color="info">Salvar</Button>
        </div>
      </form>
    </ModalBox>
  </CardBox>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import api from '@/plugins/axios'
import Button from '@/components/ui/Button.vue'
import CardBox from '@/components/layout/CardBox.vue'
import FormControl from '@/components/FormControl.vue'
import FormField from '@/components/FormField.vue'
import ModalBox from '@/components/ModalBox.vue'
import NotificationBar from '@/components/layout/NotificationBar.vue'
import { InfoIcon } from '@/icons'

interface Negociacao {
  id?: number
  contrato_id?: number | null
  valor_atual?: number | null
  valor_proposto?: number | null
  percentual_reajuste?: number | null
  status?: string | null
  data_proposta?: string | null
  anotacoes?: string | null
}

const props = defineProps<{ contratoId?: number | null }>()

const itens = ref<Negociacao[]>([])
const carregando = ref(false)
const modalAberto = ref(false)
const selecionado = ref<Negociacao | null>(null)
const form = reactive<Negociacao>({ status: 'Em andamento' })

const temContratoSelecionado = computed(() => Boolean(props.contratoId))

const carregar = async () => {
  if (!props.contratoId) {
    itens.value = []
    return
  }

  carregando.value = true
  try {
    const { data } = await api.get<Negociacao[]>('/contratos/negociacoes', {
      params: { contrato_id: props.contratoId },
    })
    itens.value = data.filter((negociacao) => negociacao.contrato_id === props.contratoId)
  } catch (error) {
    console.error('Erro ao carregar negociações', error)
  } finally {
    carregando.value = false
  }
}

const reset = () => {
  Object.assign(form, {
    id: undefined,
    contrato_id: null,
    valor_atual: null,
    valor_proposto: null,
    percentual_reajuste: null,
    status: 'Em andamento',
    data_proposta: null,
    anotacoes: '',
  })
}

const abrirModal = (item?: Negociacao) => {
  if (!props.contratoId) return

  selecionado.value = item || null
  reset()
  if (item) {
    Object.assign(form, item)
  } else {
    form.contrato_id = props.contratoId
  }
  modalAberto.value = true
}

const salvar = async () => {
  try {
    if (selecionado.value?.id) {
      await api.put(`/contratos/negociacoes/${selecionado.value.id}`, form)
    } else {
      await api.post('/contratos/negociacoes', form)
    }
    modalAberto.value = false
    await carregar()
  } catch (error) {
    console.error('Erro ao salvar negociação', error)
  }
}

watch(
  () => props.contratoId,
  () => {
    carregar()
  },
  { immediate: true },
)

defineExpose({ abrirModal })
</script>
