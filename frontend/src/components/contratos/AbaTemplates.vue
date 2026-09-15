<template>
  <CardBox class="flex flex-col flex-1" body-class="flex flex-col flex-1 gap-4">
    <NotificationBar color="info" :icon="InfoIcon">
      Mantenha templates base e gere PDFs substituindo variáveis padrão.
    </NotificationBar>

    <div class="flex justify-between items-center">
      <div class="text-sm text-gray-500 dark:text-gray-400">{{ itens.length }} template(s)</div>
      <Button color="info" size="sm" @click="abrirModal()">Novo</Button>
    </div>

    <div class="flex-1 overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Nome
            </th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tipo
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ações
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-if="carregando">
            <td colspan="3" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Carregando templates...</td>
          </tr>
          <tr v-else-if="itens.length === 0">
            <td colspan="3" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum template cadastrado.</td>
          </tr>
          <tr v-for="item in itens" :key="item.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/40">
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.nome_do_template }}</td>
            <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{{ item.tipo || '-' }}</td>
            <td class="px-4 py-3 text-right text-sm">
              <button class="text-brand-500 hover:underline" @click="abrirModal(item)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ModalBox v-model="modalAberto" title="Template" large>
      <form class="space-y-4" @submit.prevent="salvar">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nome" label-for="nome_do_template">
            <FormControl id="nome_do_template" v-model="form.nome_do_template" required />
          </FormField>
          <FormField label="Tipo" label-for="tipo">
            <FormControl id="tipo" v-model="form.tipo" />
          </FormField>
        </div>
        <FormField label="Conteúdo HTML" label-for="conteudo_html">
          <FormControl id="conteudo_html" v-model="form.conteudo_html" type="textarea" rows="6" />
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
import { reactive, ref } from 'vue'
import api from '@/plugins/axios'
import Button from '@/components/ui/Button.vue'
import CardBox from '@/components/layout/CardBox.vue'
import FormControl from '@/components/FormControl.vue'
import FormField from '@/components/FormField.vue'
import ModalBox from '@/components/ModalBox.vue'
import NotificationBar from '@/components/layout/NotificationBar.vue'
import { InfoIcon } from '@/icons'

interface Template {
  id?: number
  nome_do_template: string
  tipo?: string | null
  conteudo_html?: string | null
}

const itens = ref<Template[]>([])
const carregando = ref(false)
const modalAberto = ref(false)
const selecionado = ref<Template | null>(null)
const form = reactive<Template>({ nome_do_template: '', tipo: '', conteudo_html: '' })

const carregar = async () => {
  carregando.value = true
  try {
    const { data } = await api.get<Template[]>('/contratos/templates')
    itens.value = data
  } catch (error) {
    console.error('Erro ao carregar templates', error)
  } finally {
    carregando.value = false
  }
}

const reset = () => {
  Object.assign(form, {
    id: undefined,
    nome_do_template: '',
    tipo: '',
    conteudo_html: '',
  })
}

const abrirModal = (item?: Template) => {
  selecionado.value = item || null
  reset()
  if (item) Object.assign(form, item)
  modalAberto.value = true
}

const salvar = async () => {
  try {
    if (selecionado.value?.id) {
      await api.put(`/contratos/templates/${selecionado.value.id}`, form)
    } else {
      await api.post('/contratos/templates', form)
    }
    modalAberto.value = false
    await carregar()
  } catch (error) {
    console.error('Erro ao salvar template', error)
  }
}

carregar()

defineExpose({ abrirModal })
</script>
