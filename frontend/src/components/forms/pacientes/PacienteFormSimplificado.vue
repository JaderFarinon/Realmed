<template>
  <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4">
    <NotificationBar
      :show="Boolean(msgErro)"
      type="error"
      :message="msgErro || ''"
      class="mb-2"
      @close="msgErro = ''"
    />
    <NotificationBar
      :show="Boolean(msgSucesso)"
      type="success"
      :message="msgSucesso || ''"
      class="mb-2"
      @close="msgSucesso = ''"
    />

    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-medium">Nome completo *</label>
      <input
        v-model="nome_completo"
        type="text"
        required
        :disabled="disabled"
        class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
        placeholder="Ex.: Maria da Silva"
      />
    </div>

    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-medium">Telefone</label>
      <IMaskComponent
        v-model="telefone_principal"
        :mask="['(00) 0000-0000', '(00) 00000-0000']"
        :disabled="disabled"
        class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
      />
    </div>

    <div class="grid grid-cols-1 gap-2">
      <label class="text-sm font-medium">Convênio *</label>
      <select
        v-model="convenio_id"
        required
        :disabled="disabled"
        class="border rounded px-3 py-2 w-full bg-white disabled:bg-gray-100"
      >
        <option :value="null" disabled>Selecione...</option>
        <option v-for="c in convenios" :key="c.id" :value="c.id">
          {{ c.nome }}
        </option>
      </select>
    </div>

    <div class="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        class="px-4 py-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
        :disabled="carregando"
        @click="fechar"
      >
        {{ disabled ? 'Fechar' : 'Cancelar' }}
      </button>
      <button
        v-if="!disabled"
        type="submit"
        class="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
        :disabled="carregando"
      >
        {{ carregando ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IMaskComponent } from 'vue-imask'
import api from '@/plugins/axios'
import NotificationBar from '@/components/layout/NotificationBar.vue'

interface ConvenioOption {
  id: number
  nome: string
}

interface PacienteSimplificadoDados {
  id?: number | string
  nome_completo?: string | null
  telefone_principal?: string | null
  convenios?: Array<{ convenio_id?: number | null }>
}

const props = defineProps<{ dados: PacienteSimplificadoDados | null; somenteLeitura?: boolean }>()
const emit = defineEmits<{
  (e: 'close', shouldRefresh: boolean): void
  (e: 'sucesso', payload: { tipo: string; mensagem: string }): void
  (e: 'erro', payload: { tipo: string; mensagem: string }): void
}>()

const isEdit = computed(() => Boolean(props.dados?.id))
const disabled = computed(() => Boolean(props.somenteLeitura))

const carregando = ref(false)
const msgErro = ref('')
const msgSucesso = ref('')
const nome_completo = ref('')
const telefone_principal = ref('')
const convenio_id = ref<number | null>(null)
const convenios = ref<ConvenioOption[]>([])

const carregarConvenios = async () => {
  try {
    const { data } = await api.get('/convenios', { params: { status: 1 } })
    const lista = Array.isArray(data) ? (data as ConvenioOption[]) : []
    lista.sort((a, b) => a.nome.localeCompare(b.nome))
    convenios.value = lista
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
    msgErro.value = `Erro ao carregar convênios. (${mensagem})`
    emit('erro', { tipo: 'error', mensagem: `Erro ao carregar convênios (${mensagem})` })
    setTimeout(() => {
      msgErro.value = ''
    }, 4000)
  }
}

const resetForm = () => {
  nome_completo.value = ''
  telefone_principal.value = ''
  convenio_id.value = null
}

watch(
  () => props.dados,
  (dados) => {
    if (!dados) {
      resetForm()
      return
    }
    nome_completo.value = dados.nome_completo ?? ''
    telefone_principal.value = dados.telefone_principal ?? ''
    if (Array.isArray(dados.convenios) && dados.convenios.length) {
      convenio_id.value = dados.convenios[0]?.convenio_id ?? null
    } else {
      convenio_id.value = null
    }
  },
  { immediate: true },
)

const validar = () => {
  if (!nome_completo.value || nome_completo.value.trim().length < 3) {
    msgErro.value = 'Informe o nome do paciente (mín. 3 caracteres).'
    setTimeout(() => {
      msgErro.value = ''
    }, 3000)
    return false
  }
  if (!convenio_id.value) {
    msgErro.value = 'Selecione um convênio.'
    setTimeout(() => {
      msgErro.value = ''
    }, 3000)
    return false
  }
  return true
}

const salvar = async () => {
  if (disabled.value) {
    emit('close', false)
    return
  }

  if (!validar()) return

  carregando.value = true
  msgErro.value = ''

  try {
    const payload = {
      nome_completo: nome_completo.value.trim(),
      telefone_principal: telefone_principal.value || null,
      convenios: [{ convenio_id: Number(convenio_id.value) }],
    }

    if (isEdit.value && props.dados?.id !== undefined) {
      await api.put(`/pacientes/${props.dados.id}`, payload)
    } else {
      await api.post('/pacientes', payload)
    }

    msgSucesso.value = 'Paciente salvo com sucesso.'
    emit('sucesso', { tipo: 'success', mensagem: 'Paciente salvo com sucesso.' })
    setTimeout(() => {
      msgSucesso.value = ''
      emit('close', true)
    }, 800)
  } catch (error) {
    const mensagem =
      (error as { response?: { data?: { mensagem?: string } } }).response?.data?.mensagem ||
      'Falha ao salvar paciente.'
    msgErro.value = mensagem
    emit('erro', { tipo: 'error', mensagem })
    setTimeout(() => {
      msgErro.value = ''
    }, 4000)
  } finally {
    carregando.value = false
  }
}

const fechar = () => {
  emit('close', false)
}

onMounted(() => {
  carregarConvenios()
  if (isEdit.value && props.dados?.convenios?.length) {
    convenio_id.value = props.dados.convenios[0]?.convenio_id ?? null
  }
})
</script>
