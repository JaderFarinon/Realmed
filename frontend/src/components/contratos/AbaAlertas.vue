<template>
  <CardBox class="flex flex-col flex-1" body-class="flex flex-col flex-1 gap-4">
    <NotificationBar color="info" :icon="InfoIcon">
      Configure alertas de vencimento, renovação e reajuste com notificações internas e e-mails.
    </NotificationBar>

    <div class="flex justify-between items-center">
      <div class="text-sm text-gray-500 dark:text-gray-400">{{ itens.length }} alerta(s)</div>
      <Button color="info" size="sm" @click="abrirModal()">Novo</Button>
    </div>

    <div class="flex-1 overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tipo
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Dias
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Enviar e-mail
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ações
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-if="carregando">
            <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Carregando alertas...</td>
          </tr>
          <tr v-else-if="itens.length === 0">
            <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum alerta cadastrado.</td>
          </tr>
          <tr v-for="item in itens" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40">
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.tipo_alerta }}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.dias_antecedencia || '-' }}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.enviar_email ? 'Sim' : 'Não' }}</td>
            <td class="px-4 py-3 text-right text-sm">
              <button class="text-brand-500 hover:underline" @click="abrirModal(item)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalBox v-model="modalAberto" title="Alerta" large>
      <form class="space-y-4" @submit.prevent="salvar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Contrato" label-for="contrato_id">
            <FormControl id="contrato_id" v-model="form.contrato_id" type="number" />
          </FormField>
          <FormField label="Tipo" label-for="tipo_alerta">
            <FormControl id="tipo_alerta" v-model="form.tipo_alerta" />
          </FormField>
          <FormField label="Dias de antecedência" label-for="dias_antecedencia">
            <FormControl id="dias_antecedencia" v-model="form.dias_antecedencia" type="number" />
          </FormField>
          <FormField label="Enviar no vencimento" label-for="enviar_no_vencimento">
            <input id="enviar_no_vencimento" v-model="form.enviar_no_vencimento" type="checkbox" />
          </FormField>
          <FormField label="Enviar e-mail" label-for="enviar_email">
            <input id="enviar_email" v-model="form.enviar_email" type="checkbox" />
          </FormField>
          <FormField label="Notificação interna" label-for="enviar_notificacao">
            <input id="enviar_notificacao" v-model="form.enviar_notificacao" type="checkbox" />
          </FormField>
        </div>
        <FormField label="Destinatários" label-for="destinatarios">
          <FormControl id="destinatarios" v-model="destinatariosTexto" placeholder="emails separados por vírgula" />
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
import { computed, reactive, ref } from 'vue'
import api from '@/plugins/axios'
import Button from '@/components/ui/Button.vue'
import CardBox from '@/components/layout/CardBox.vue'
import FormControl from '@/components/FormControl.vue'
import FormField from '@/components/FormField.vue'
import ModalBox from '@/components/ModalBox.vue'
import NotificationBar from '@/components/layout/NotificationBar.vue'
import { InfoIcon } from '@/icons'

interface Alerta {
  id?: number
  contrato_id?: number | null
  tipo_alerta?: string
  dias_antecedencia?: number | null
  enviar_no_vencimento?: boolean
  destinatarios?: string[] | null
  enviar_email?: boolean
  enviar_notificacao?: boolean
}

const itens = ref<Alerta[]>([])
const carregando = ref(false)
const modalAberto = ref(false)
const selecionado = ref<Alerta | null>(null)
const form = reactive<Alerta>({ tipo_alerta: 'vencimento', enviar_email: true, enviar_notificacao: true })
const destinatariosTexto = computed({
  get: () => (form.destinatarios || []).join(','),
  set: (value: string) => {
    form.destinatarios = value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
  },
})

const carregar = async () => {
  carregando.value = true
  try {
    const { data } = await api.get<Alerta[]>('/contratos/alertas')
    itens.value = data
  } catch (error) {
    console.error('Erro ao carregar alertas', error)
  } finally {
    carregando.value = false
  }
}

const reset = () => {
  Object.assign(form, {
    id: undefined,
    contrato_id: null,
    tipo_alerta: 'vencimento',
    dias_antecedencia: null,
    enviar_no_vencimento: false,
    destinatarios: [],
    enviar_email: true,
    enviar_notificacao: true,
  })
}

const abrirModal = (item?: Alerta) => {
  selecionado.value = item || null
  reset()
  if (item) Object.assign(form, item)
  modalAberto.value = true
}

const salvar = async () => {
  try {
    if (selecionado.value?.id) {
      await api.put(`/contratos/alertas/${selecionado.value.id}`, form)
    } else {
      await api.post('/contratos/alertas', form)
    }
    modalAberto.value = false
    await carregar()
  } catch (error) {
    console.error('Erro ao salvar alerta', error)
  }
}

carregar()

defineExpose({ abrirModal })
</script>
