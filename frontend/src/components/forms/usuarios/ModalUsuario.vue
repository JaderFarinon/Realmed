<template>
  <Modal v-if="aberto" full-screen-backdrop @close="emitFechar">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-theme-xl dark:bg-gray-900 sm:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ titulo }}
        </h2>

        <form class="grid grid-cols-1 gap-4 md:grid-cols-2" @submit.prevent="salvar">
          <fieldset :disabled="salvando" class="contents">
            <div class="md:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome completo<span class="text-error-500">*</span>
              </label>
              <input
                v-model="form.nome"
                type="text"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                required
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-mail<span class="text-error-500">*</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                required
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefone
              </label>
              <IMaskComponent
                v-model="form.telefone"
                :mask="telefoneMask"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Documento<span class="text-error-500">*</span>
              </label>
              <IMaskComponent
                v-model="form.documento"
                :mask="documentoMask"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                required
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Login<span class="text-error-500">*</span>
              </label>
              <input
                v-model="form.login"
                type="text"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                required
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Senha<span v-if="senhaObrigatoria" class="text-error-500">*</span>
              </label>
              <input
                v-model="form.senha"
                :type="mostrarSenha ? 'text' : 'password'"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                :required="senhaObrigatoria"
                autocomplete="new-password"
              />
              <div class="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <label class="inline-flex items-center gap-1">
                  <input
                    v-model="mostrarSenha"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  Mostrar senha
                </label>
                <span v-if="isEdicao" class="italic">Deixe em branco para manter a senha atual.</span>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Perfil<span class="text-error-500">*</span>
              </label>
              <select
                v-model="form.role"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                required
              >
                <option v-for="roleOption in roleOptions" :key="roleOption" :value="roleOption">
                  {{ roleLabels[roleOption] || roleOption }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status<span class="text-error-500">*</span>
              </label>
              <select
                v-model="form.status"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                required
              >
                <option v-for="statusOption in statusOptions" :key="statusOption.value" :value="statusOption.value">
                  {{ statusOption.label }}
                </option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unidades
              </label>
              <MultipleSelect
                v-model="unidadesSelecionadas"
                :options="unidadeOptions"
                placeholder="Selecione as unidades..."
              />
              <p
                v-if="carregandoUnidades"
                class="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                Carregando unidades...
              </p>
              <p v-else-if="erroCarregarUnidades" class="mt-1 text-xs text-red-500">
                {{ erroCarregarUnidades }}
              </p>
            </div>
          </fieldset>

          <div class="mt-4 flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06] sm:w-auto"
              @click="emitFechar"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              :disabled="salvando"
            >
              <span v-if="salvando" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
              {{ salvando ? 'Salvando...' : isEdicao ? 'Atualizar' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import MultipleSelect from '@/components/forms/FormElements/MultipleSelect.vue'
import { useToast } from '@/composables/useToast'
import {
  atualizarUsuario,
  criarUsuario,
  type Usuario,
  type UsuarioPayload,
  type UsuarioRole,
  type UsuarioStatus,
} from '@/services/usuarios'
import { listarUnidades, type Unidade } from '@/services/unidades'
import { IMaskComponent } from 'vue-imask'

const props = defineProps<{
  aberto: boolean
  usuario: Usuario | null
  rolesDisponiveis: UsuarioRole[]
}>()

const emit = defineEmits<{
  (event: 'fechar'): void
  (event: 'sucesso', payload: Usuario): void
  (event: 'erro', mensagem: string): void
}>()

const form = reactive<{
  id: number | null
  personId: number | null
  nome: string
  email: string
  telefone: string
  documento: string
  login: string
  senha: string
  role: UsuarioRole | ''
  status: UsuarioStatus
  unidadeIds: number[]
}>(
  {
    id: null,
    personId: null,
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    login: '',
    senha: '',
    role: 'user',
    status: 'active',
    unidadeIds: [],
  },
)

const mostrarSenha = ref(false)
const salvando = ref(false)
const carregandoUnidades = ref(false)
const erroCarregarUnidades = ref('')
const unidadesCarregadas = ref(false)
const toast = useToast()

type UnidadeOption = { value: number; label: string }

const unidadeOptions = ref<UnidadeOption[]>([])
const unidadeLabels = ref<Record<number, string>>({})

const telefoneMask = ['(00) 0000-0000', '(00) 00000-0000']
const documentoMask = ['000.000.000-00', '00.000.000/0000-00']

const atualizarUnidadeLabels = (lista: UnidadeOption[]) => {
  if (!lista.length) {
    return
  }

  const atualizado: Record<number, string> = { ...unidadeLabels.value }
  lista.forEach((option) => {
    atualizado[option.value] = option.label
  })
  unidadeLabels.value = atualizado
}

const definirUnidadeOptions = (lista: UnidadeOption[]) => {
  unidadeOptions.value = lista.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  atualizarUnidadeLabels(unidadeOptions.value)
}

const mesclarUnidades = (lista: UnidadeOption[]) => {
  if (!lista.length) {
    return
  }

  const mapa = new Map<number, UnidadeOption>()
  unidadeOptions.value.forEach((option) => {
    mapa.set(option.value, option)
  })

  lista.forEach((option) => {
    mapa.set(option.value, option)
  })

  definirUnidadeOptions(Array.from(mapa.values()))
}

const registrarUnidadesUsuario = (unidades: Array<{ id: number; nome: string }>) => {
  if (!unidades?.length) {
    return
  }

  const opcoes = unidades.map((unidade) => ({ value: unidade.id, label: unidade.nome }))
  mesclarUnidades(opcoes)
}

const unidadesSelecionadas = computed<UnidadeOption[]>({
  get() {
    return form.unidadeIds
      .map((id) => {
        const option = unidadeOptions.value.find((item) => item.value === id)
        if (option) {
          return option
        }

        const label = unidadeLabels.value[id]
        return label ? { value: id, label } : null
      })
      .filter((item): item is UnidadeOption => Boolean(item))
  },
  set(novoValor) {
    form.unidadeIds = novoValor.map((item) => item.value)
  },
})

const carregarUnidades = async (forcar = false) => {
  if (carregandoUnidades.value) {
    return
  }

  if (!forcar && unidadesCarregadas.value) {
    return
  }

  carregandoUnidades.value = true
  erroCarregarUnidades.value = ''

  try {
    const lista = await listarUnidades()
    const opcoes = lista.map<UnidadeOption>((unidade: Unidade) => ({
      value: unidade.id,
      label: unidade.nome,
    }))
    mesclarUnidades(opcoes)
    unidadesCarregadas.value = true
  } catch (error) {
    console.error('Erro ao carregar unidades', error)
    erroCarregarUnidades.value = 'Não foi possível carregar as unidades.'
  } finally {
    carregandoUnidades.value = false
  }
}

const roleLabels: Record<UsuarioRole, string> = {
  masteradmin: 'Master Admin',
  admin: 'Administrador',
  cac_coord: 'Coordenação do CAC',
  cac: 'CAC',
  secretaria: 'Secretaria',
  user: 'Usuário',
  doctor: 'Médico',
  nurse: 'Enfermeiro(a)',
  pharmacist: 'Farmacêutico(a)',
  patient: 'Paciente',
}

const ordenarPorLabel = (roles: UsuarioRole[]) =>
  [...roles].sort((a, b) => roleLabels[a].localeCompare(roleLabels[b], 'pt-BR'))

const statusOptions: Array<{ value: UsuarioStatus; label: string }> = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'blocked', label: 'Bloqueado' },
]

const isEdicao = computed(() => Boolean(form.id))
const titulo = computed(() => (isEdicao.value ? 'Editar usuário' : 'Novo usuário'))
const senhaObrigatoria = computed(() => !isEdicao.value)

const roleOptions = computed<UsuarioRole[]>(() => {
  const uniqueRoles = new Set<UsuarioRole>()
  props.rolesDisponiveis.forEach((role) => uniqueRoles.add(role))
  if (form.role && uniqueRoles.has(form.role as UsuarioRole) === false) {
    uniqueRoles.add(form.role as UsuarioRole)
  }
  return ordenarPorLabel(Array.from(uniqueRoles))
})

const atualizarFormulario = (usuario: Usuario | null) => {
  form.id = usuario?.id ?? null
  form.personId = usuario?.personId ?? null
  form.nome = usuario?.nome ?? ''
  form.email = usuario?.email ?? ''
  form.telefone = usuario?.telefone ?? ''
  form.documento = usuario?.documento ?? ''
  form.login = usuario?.login ?? ''
  form.senha = ''
  form.role = (usuario?.role ?? roleOptions.value[0] ?? 'user') as UsuarioRole
  form.status = usuario?.status ?? 'active'
  form.unidadeIds = usuario?.unidadeIds ? [...usuario.unidadeIds] : []
  registrarUnidadesUsuario(usuario?.unidades ?? [])
  mostrarSenha.value = false
}

watch(
  () => props.usuario,
  (novoUsuario) => {
    if (props.aberto) {
      atualizarFormulario(novoUsuario)
    }
  },
)

watch(
  () => props.aberto,
  (aberto) => {
    if (aberto) {
      carregarUnidades(true)
      atualizarFormulario(props.usuario)
    }
  },
)

watch(
  () => props.rolesDisponiveis,
  (roles) => {
    if (roles.length && !roles.includes(form.role as UsuarioRole)) {
      form.role = roles[0]
    }
  },
)

const emitirErro = (mensagem: string) => {
  toast.error(mensagem)
  emit('erro', mensagem)
}

const limparTelefone = (valor: string) => {
  const trimmed = valor.trim()
  return trimmed.length ? trimmed : null
}

const salvar = async () => {
  if (!form.role) {
    emitirErro('Selecione um perfil para o usuário.')
    return
  }

  if (senhaObrigatoria.value && !form.senha) {
    emitirErro('Informe uma senha para o novo usuário.')
    return
  }

  salvando.value = true
  try {
    const payload: UsuarioPayload = {
      personId: form.personId ?? undefined,
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: limparTelefone(form.telefone),
      documento: form.documento.trim(),
      login: form.login.trim(),
      role: form.role,
      status: form.status,
      unidadeIds: [...form.unidadeIds],
    }

    let resultado: Usuario

    if (isEdicao.value && form.id) {
      if (form.senha) {
        payload.senha = form.senha
      }
      resultado = await atualizarUsuario(form.id, payload)
    } else {
      resultado = await criarUsuario({ ...payload, senha: form.senha })
    }

    registrarUnidadesUsuario(resultado.unidades ?? [])
    emit('sucesso', resultado)
    emitFechar()
  } catch (error: any) {
    const mensagem = error?.response?.data?.error || 'Não foi possível salvar o usuário.'
    emitirErro(mensagem)
  } finally {
    salvando.value = false
  }
}

const emitFechar = () => {
  emit('fechar')
}
</script>
