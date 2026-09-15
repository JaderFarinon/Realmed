<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[900px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ somenteLeitura ? 'Visualizar Médico' : dados?.id ? 'Editar Médico' : 'Novo Médico' }}
        </h2>
        <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <fieldset :disabled="somenteLeitura" class="contents">
            <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome completo</label>
            <input
              v-model="form.nome_completo"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Conselho</label>
            <input
              v-model="form.conselho"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Número do conselho</label>
            <input
              v-model="form.crm_numero"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">UF</label>
            <input
              v-model="form.crm_uf"
              type="text"
              maxlength="2"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              required
            />
          </div>
          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Corpo clínico</label>
            <input
              v-model="form.corpo_clinico"
              type="text"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">CPF</label>
            <IMaskComponent
              v-model="form.cpf"
              :mask="'000.000.000-00'"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Celular</label>
            <IMaskComponent
              v-model="form.telefone_principal"
              :mask="['(00) 0000-0000', '(00) 00000-0000']"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">E-mail</label>
            <input
              v-model="form.email"
              type="email"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
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
          <div class="flex items-center gap-2 h-11 md:col-span-2">
            <input
              v-model="form.ie_status"
              type="checkbox"
              id="medico-ativo"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="medico-ativo" class="text-sm text-gray-700 dark:text-gray-400">Ativo</label>
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
import { IMaskComponent } from 'vue-imask'

interface MedicoForm {
  id?: number | string
  nome_completo: string
  conselho: string
  crm_numero: string
  crm_uf: string
  corpo_clinico?: string | null
  cpf?: string | null
  telefone_principal?: string | null
  email?: string | null
  especialidade?: string | null
  ie_status: boolean
}

const props = defineProps<{ isOpen: boolean; dados: MedicoForm | null; somenteLeitura?: boolean }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const form = ref<MedicoForm>({
  nome_completo: '',
  conselho: 'CRM',
  crm_numero: '',
  crm_uf: '',
  corpo_clinico: '',
  cpf: '',
  telefone_principal: '',
  email: '',
  especialidade: '',
  ie_status: true,
})

const somenteLeitura = computed(() => Boolean(props.somenteLeitura))

const mapDados = (dados: MedicoForm | null): MedicoForm => ({
  id: dados?.id,
  nome_completo: dados?.nome_completo ?? '',
  conselho: dados?.conselho ?? 'CRM',
  crm_numero: dados?.crm_numero ?? '',
  crm_uf: (dados?.crm_uf ?? '').toUpperCase(),
  corpo_clinico: dados?.corpo_clinico ?? '',
  cpf: dados?.cpf ?? '',
  telefone_principal: dados?.telefone_principal ?? '',
  email: dados?.email ?? '',
  especialidade: dados?.especialidade ?? '',
  ie_status: dados ? Boolean(dados.ie_status) : true,
})

watch(
  () => props.dados,
  (val) => {
    form.value = mapDados(val)
  },
  { immediate: true },
)

watch(
  () => form.value.crm_uf,
  (val) => {
    if (!val) return
    const upper = val.toUpperCase().slice(0, 2)
    if (upper !== val) {
      form.value.crm_uf = upper
    }
  },
)

const limparString = (value?: string | null) => (value ? value.trim() : undefined)

const salvar = async () => {
  if (somenteLeitura.value) {
    emit('close', false)
    return
  }
  try {
    const payload = {
      nome_completo: form.value.nome_completo.trim(),
      conselho: form.value.conselho.trim() || 'CRM',
      crm_numero: form.value.crm_numero.trim(),
      crm_uf: form.value.crm_uf.trim().toUpperCase(),
      corpo_clinico: limparString(form.value.corpo_clinico) ?? null,
      cpf: limparString(form.value.cpf) ?? null,
      telefone_principal: limparString(form.value.telefone_principal) ?? null,
      email: limparString(form.value.email) ?? null,
      especialidade: limparString(form.value.especialidade) ?? null,
      ie_status: form.value.ie_status ? 1 : 0,
    }

    if (!payload.nome_completo || !payload.crm_numero || !payload.crm_uf) {
      emit('erro', { tipo: 'error', mensagem: 'Preencha os campos obrigatórios.' })
      return
    }

    if (props.dados && props.dados.id) {
      await api.put(`/medicos/${props.dados.id}`, payload)
      emit('sucesso', { tipo: 'success', mensagem: 'Médico atualizado com sucesso' })
    } else {
      await api.post('/medicos', payload)
      emit('sucesso', { tipo: 'success', mensagem: 'Médico criado com sucesso' })
    }
    emit('close', true)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    emit('erro', {
      tipo: 'error',
      mensagem: e.response?.data?.mensagem || 'Erro ao salvar Médico',
    })
  }
}
</script>
