<template>
  <form @submit.prevent="salvar" class="grid grid-cols-1 gap-6">
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

    <!-- Identificação -->
    <section>
      <h3 class="font-semibold mb-2">Identificação</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="lg:col-span-2">
          <label class="text-sm font-medium">Nome completo *</label>
          <input
            v-model="form.nome_completo"
            type="text"
            required
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Data de nascimento</label>
          <input
            v-model="form.data_nascimento"
            type="date"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Sexo</label>
          <select
            v-model="form.sexo"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full bg-white disabled:bg-gray-100"
          >
            <option :value="null">Não informado</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
            <option value="O">Outro</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium">Gênero</label>
          <input
            v-model="form.genero"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">CPF</label>
          <input
            v-model="form.cpf"
            type="text"
            :disabled="disabled"
            placeholder="000.000.000-00"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">RG</label>
          <input
            v-model="form.rg"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Cartão SUS (CNS)</label>
          <input
            v-model="form.cartao_sus"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="lg:col-span-2">
          <label class="text-sm font-medium">Estado civil</label>
          <input
            v-model="form.estado_civil"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Nacionalidade</label>
          <input
            v-model="form.nacionalidade"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Naturalidade</label>
          <input
            v-model="form.naturalidade"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
      </div>
    </section>

    <!-- Contato -->
    <section>
      <h3 class="font-semibold mb-2">Contato</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="text-sm font-medium">Telefone principal</label>
          <input
            v-model="form.telefone_principal"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Telefone secundário</label>
          <input
            v-model="form.telefone_secundario"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-2 lg:col-span-1">
          <label class="text-sm font-medium">E-mail</label>
          <input
            v-model="form.email"
            type="email"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
      </div>
    </section>

    <!-- Endereço -->
    <section>
      <h3 class="font-semibold mb-2">Endereço</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div class="md:col-span-3 lg:col-span-4">
          <label class="text-sm font-medium">Logradouro</label>
          <input
            v-model="form.endereco_logradouro"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-1 lg:col-span-1">
          <label class="text-sm font-medium">Número</label>
          <input
            v-model="form.endereco_numero"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-2 lg:col-span-1">
          <label class="text-sm font-medium">Complemento</label>
          <input
            v-model="form.endereco_comp"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-2 lg:col-span-2">
          <label class="text-sm font-medium">Bairro</label>
          <input
            v-model="form.endereco_bairro"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-2 lg:col-span-2">
          <label class="text-sm font-medium">Cidade</label>
          <input
            v-model="form.endereco_cidade"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-1 lg:col-span-1">
          <label class="text-sm font-medium">UF</label>
          <input
            v-model="form.endereco_uf"
            type="text"
            maxlength="2"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full uppercase disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-1 lg:col-span-1">
          <label class="text-sm font-medium">CEP</label>
          <input
            v-model="form.endereco_cep"
            type="text"
            :disabled="disabled"
            placeholder="00000-000"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
      </div>
    </section>

    <!-- Informações adicionais -->
    <section>
      <h3 class="font-semibold mb-2">Informações adicionais</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="text-sm font-medium">Nome da mãe</label>
          <input
            v-model="form.nome_mae"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div>
          <label class="text-sm font-medium">Nome do pai</label>
          <input
            v-model="form.nome_pai"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
        <div class="md:col-span-2 lg:col-span-1">
          <label class="text-sm font-medium">Profissão</label>
          <input
            v-model="form.profissao"
            type="text"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          />
        </div>
      </div>
    </section>

    <!-- Clínico -->
    <section>
      <h3 class="font-semibold mb-2">Clínico</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="text-sm font-medium">Alergias</label>
          <textarea
            v-model="form.alergias"
            rows="2"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          ></textarea>
        </div>
        <div>
          <label class="text-sm font-medium">Condições pré-existentes</label>
          <textarea
            v-model="form.condicoes_previas"
            rows="2"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          ></textarea>
        </div>
        <div class="md:col-span-2 lg:col-span-1">
          <label class="text-sm font-medium">Observações gerais</label>
          <textarea
            v-model="form.obs_gerais"
            rows="2"
            :disabled="disabled"
            class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
          ></textarea>
        </div>
      </div>
    </section>

    <!-- Convênios -->
    <section>
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">Convênios</h3>
        <button
          v-if="!disabled"
          type="button"
          class="px-3 py-1.5 rounded text-white bg-green-600 hover:bg-green-700"
          @click="addConvenio"
        >
          Adicionar convênio
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="(v, idx) in form.convenios"
          :key="idx"
          class="grid grid-cols-1 md:grid-cols-6 gap-3 items-end border rounded p-3"
        >
          <div class="md:col-span-2">
            <label class="text-sm font-medium">Convênio</label>
            <select
              v-model.number="v.convenio_id"
              :disabled="disabled"
              class="border rounded px-3 py-2 w-full bg-white disabled:bg-gray-100"
            >
              <option :value="null">Selecione...</option>
              <option v-for="cv in conveniosCatalogo" :key="cv.id" :value="cv.id">
                {{ cv.nome }}
              </option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-medium">Carteirinha</label>
            <input
              v-model="v.numero_carteirinha"
              type="text"
              :disabled="disabled"
              class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
            />
          </div>
          <div class="md:col-span-1">
            <label class="text-sm font-medium">Validade</label>
            <input
              v-model="v.validade_plano"
              type="date"
              :disabled="disabled"
              class="border rounded px-3 py-2 w-full disabled:bg-gray-100"
            />
          </div>
          <div class="md:col-span-1 flex justify-end">
            <button
              v-if="!disabled"
              type="button"
              class="px-3 py-2 rounded border bg-white hover:bg-gray-50"
              @click="removerConvenio(idx)"
            >
              Remover
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Ações -->
    <div class="flex items-center justify-end gap-2">
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '@/plugins/axios'
import NotificationBar from '@/components/layout/NotificationBar.vue'

interface ConvenioForm {
  convenio_id: number | null
  numero_carteirinha: string
  validade_plano: string
}

interface PacienteForm {
  nome_completo: string
  data_nascimento: string
  sexo: string | null
  genero: string
  cpf: string
  rg: string
  cartao_sus: string
  estado_civil: string
  nacionalidade: string
  naturalidade: string
  telefone_principal: string
  telefone_secundario: string
  email: string
  endereco_logradouro: string
  endereco_numero: string
  endereco_comp: string
  endereco_bairro: string
  endereco_cidade: string
  endereco_uf: string
  endereco_cep: string
  nome_mae: string
  nome_pai: string
  profissao: string
  alergias: string
  condicoes_previas: string
  obs_gerais: string
  convenios: ConvenioForm[]
}

interface PacienteDados extends Partial<PacienteForm> {
  id?: number | string
  genero?: string | null
  ie_status?: number | boolean | null
}

const props = defineProps<{ dados: PacienteDados | null; somenteLeitura?: boolean }>()
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
const conveniosCatalogo = ref<Array<{ id: number; nome: string }>>([])

const createDefaultForm = (): PacienteForm => ({
  nome_completo: '',
  data_nascimento: '',
  sexo: null,
  genero: '',
  cpf: '',
  rg: '',
  cartao_sus: '',
  estado_civil: '',
  nacionalidade: '',
  naturalidade: '',
  telefone_principal: '',
  telefone_secundario: '',
  email: '',
  endereco_logradouro: '',
  endereco_numero: '',
  endereco_comp: '',
  endereco_bairro: '',
  endereco_cidade: '',
  endereco_uf: '',
  endereco_cep: '',
  nome_mae: '',
  nome_pai: '',
  profissao: '',
  alergias: '',
  condicoes_previas: '',
  obs_gerais: '',
  convenios: [
    {
      convenio_id: null,
      numero_carteirinha: '',
      validade_plano: '',
    },
  ],
})

const form = reactive<PacienteForm>(createDefaultForm())

const carregarConvenios = async () => {
  try {
    const { data } = await api.get('/convenios', { params: { status: 1 } })
    conveniosCatalogo.value = Array.isArray(data) ? data : []
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
    msgErro.value = `Erro ao carregar convênios. (${mensagem})`
    emit('erro', { tipo: 'error', mensagem: 'Erro ao carregar convênios.' })
    setTimeout(() => {
      msgErro.value = ''
    }, 4000)
  }
}

const resetForm = () => {
  Object.assign(form, createDefaultForm())
}

const preencherForm = (dados: PacienteDados) => {
  resetForm()
  form.nome_completo = dados.nome_completo ?? ''
  form.data_nascimento = dados.data_nascimento ? String(dados.data_nascimento).slice(0, 10) : ''
  form.sexo = (dados.sexo ?? null) as string | null
  form.genero = dados.genero ?? ''
  form.cpf = dados.cpf ?? ''
  form.rg = dados.rg ?? ''
  form.cartao_sus = dados.cartao_sus ?? ''
  form.estado_civil = dados.estado_civil ?? ''
  form.nacionalidade = dados.nacionalidade ?? ''
  form.naturalidade = dados.naturalidade ?? ''
  form.telefone_principal = dados.telefone_principal ?? ''
  form.telefone_secundario = dados.telefone_secundario ?? ''
  form.email = dados.email ?? ''
  form.endereco_logradouro = dados.endereco_logradouro ?? ''
  form.endereco_numero = dados.endereco_numero ?? ''
  form.endereco_comp = dados.endereco_comp ?? ''
  form.endereco_bairro = dados.endereco_bairro ?? ''
  form.endereco_cidade = dados.endereco_cidade ?? ''
  form.endereco_uf = dados.endereco_uf ?? ''
  form.endereco_cep = dados.endereco_cep ?? ''
  form.nome_mae = dados.nome_mae ?? ''
  form.nome_pai = dados.nome_pai ?? ''
  form.profissao = dados.profissao ?? ''
  form.alergias = dados.alergias ?? ''
  form.condicoes_previas = dados.condicoes_previas ?? ''
  form.obs_gerais = dados.obs_gerais ?? ''

  if (Array.isArray(dados.convenios) && dados.convenios.length) {
    form.convenios = dados.convenios.map((item) => ({
      convenio_id: item?.convenio_id ?? null,
      numero_carteirinha: item?.numero_carteirinha ?? '',
      validade_plano: item?.validade_plano ? String(item.validade_plano).slice(0, 10) : '',
    }))
  } else {
    form.convenios = [
      {
        convenio_id: null,
        numero_carteirinha: '',
        validade_plano: '',
      },
    ]
  }
}

watch(
  () => props.dados,
  (dados) => {
    if (dados) {
      preencherForm(dados)
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const addConvenio = () => {
  form.convenios.push({ convenio_id: null, numero_carteirinha: '', validade_plano: '' })
}

const removerConvenio = (idx: number) => {
  form.convenios.splice(idx, 1)
  if (form.convenios.length === 0) {
    addConvenio()
  }
}

const validar = () => {
  if (!form.nome_completo || form.nome_completo.trim().length < 3) {
    msgErro.value = 'Informe o nome do paciente (mín. 3 caracteres).'
    setTimeout(() => {
      msgErro.value = ''
    }, 3000)
    return false
  }
  return true
}

const buildPayload = () => ({
  nome_completo: form.nome_completo.trim(),
  data_nascimento: form.data_nascimento || null,
  sexo: form.sexo || null,
  genero: form.genero || null,
  cpf: form.cpf || null,
  rg: form.rg || null,
  cartao_sus: form.cartao_sus || null,
  estado_civil: form.estado_civil || null,
  nacionalidade: form.nacionalidade || null,
  naturalidade: form.naturalidade || null,
  telefone_principal: form.telefone_principal || null,
  telefone_secundario: form.telefone_secundario || null,
  email: form.email || null,
  endereco_logradouro: form.endereco_logradouro || null,
  endereco_numero: form.endereco_numero || null,
  endereco_comp: form.endereco_comp || null,
  endereco_bairro: form.endereco_bairro || null,
  endereco_cidade: form.endereco_cidade || null,
  endereco_uf: form.endereco_uf || null,
  endereco_cep: form.endereco_cep || null,
  nome_mae: form.nome_mae || null,
  nome_pai: form.nome_pai || null,
  profissao: form.profissao || null,
  alergias: form.alergias || null,
  condicoes_previas: form.condicoes_previas || null,
  obs_gerais: form.obs_gerais || null,
  convenios: form.convenios
    .filter((item) => Boolean(item.convenio_id))
    .map((item) => ({
      convenio_id: Number(item.convenio_id),
      numero_carteirinha: item.numero_carteirinha || null,
      validade_plano: item.validade_plano || null,
    })),
})

const salvar = async () => {
  if (disabled.value) {
    emit('close', false)
    return
  }

  if (!validar()) return

  carregando.value = true
  msgErro.value = ''

  try {
    const payload = buildPayload()

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
})
</script>
