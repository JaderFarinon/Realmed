<template>
  <div class="space-y-6">
    <div
      class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Perfis globais da esteira cirúrgica
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Defina a equipe padrão do CAC e das Secretárias. Esses usuários serão sugeridos automaticamente nas solicitações da esteira.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-brand-300 hover:text-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          :disabled="carregandoPerfisGlobais || salvando.cac || salvando.secretarias"
          @click="recarregarDados"
        >
          <span
            v-if="carregandoPerfisGlobais"
            class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          ></span>
          Recarregar dados
        </button>
      </div>

      <p
        v-if="(carregandoInicial || carregandoListas) && !perfisGlobaisCarregados"
        class="mt-4 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300"
      >
        Carregando informações iniciais...
      </p>

      <div v-else-if="perfisGlobaisCarregados" class="mt-6 space-y-8">
        <section class="space-y-4">
          <DualListbox
            title="Equipe CAC"
            subtitle="Usuários responsáveis pelo contato e acompanhamento com o convênio."
            :items="itensUsuarios"
            v-model="cacSelecionados"
            :loading="carregandoListas"
            :disabled="salvando.cac || salvando.secretarias"
            :show-extra-action="true"
            extra-action-label="Alternar coordenação"
            :extra-action-disabled="salvando.cac || carregandoPerfisGlobais"
            :highlighted-ids="cacCoordenadores"
            highlighted-label="Coordenação"
            @extra-action="alternarCoordenadores"
          />
          <div
            v-if="cacCoordenadoresLabels.length"
            class="flex flex-wrap items-center gap-2 text-xs text-rose-700 dark:text-rose-200"
          >
            <span class="font-semibold uppercase tracking-wide">Coordenação:</span>
            <span
              v-for="usuario in cacCoordenadoresLabels"
              :key="`coord-${usuario.id}`"
              class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase text-rose-700 shadow-sm dark:bg-rose-500/20 dark:text-rose-100"
            >
              {{ usuario.rotulo }}
            </span>
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="salvando.cac || carregandoPerfisGlobais"
              @click="salvarPermissoes('cac')"
            >
              <span
                v-if="salvando.cac"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              <span>{{ salvando.cac ? 'Salvando...' : 'Salvar equipe CAC' }}</span>
            </button>
          </div>
        </section>

        <section class="space-y-4">
          <DualListbox
            title="Secretárias"
            subtitle="Equipe administrativa responsável pelo agendamento e suporte da cirurgia."
            :items="itensUsuarios"
            v-model="secretariasSelecionados"
            :loading="carregandoListas"
            :disabled="salvando.cac || salvando.secretarias"
          />
          <div class="flex justify-end">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="salvando.secretarias || carregandoPerfisGlobais"
              @click="salvarPermissoes('secretarias')"
            >
              <span
                v-if="salvando.secretarias"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              <span>{{ salvando.secretarias ? 'Salvando...' : 'Salvar secretárias' }}</span>
            </button>
          </div>
        </section>
      </div>

      <div
        v-else
        class="mt-6 rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300"
      >
        Nenhum perfil carregado ainda. Clique em "Recarregar dados" para buscar as informações mais recentes.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import DualListbox, { type DualListItem } from './DualListbox.vue'
import { listarUsuarios, type Usuario } from '@/services/usuarios'
import {
  listarPerfisGlobais,
  salvarPerfisGlobaisCAC,
  salvarPerfisGlobaisSecretarias,
  type PerfilGlobalUsuario,
} from '@/services/esteiraPerfisGlobais'
import { useToast } from '@/composables/useToast'

interface PermissaoUsuario {
  id: number
  nome?: string | null
  login?: string | null
  email?: string | null
}

const usuarios = ref<Usuario[]>([])
const usuariosCarregados = ref(false)
const cacEquipeDetalhes = ref<PermissaoUsuario[]>([])
const cacCoordenadoresDetalhes = ref<PermissaoUsuario[]>([])
const secretariasDetalhes = ref<PermissaoUsuario[]>([])

const cacSelecionados = ref<number[]>([])
const cacCoordenadores = ref<number[]>([])
const secretariasSelecionados = ref<number[]>([])

const carregandoUsuarios = ref(false)
const carregandoPerfisGlobais = ref(false)
const carregandoInicial = ref(false)
const perfisGlobaisCarregados = ref(false)

const salvando = reactive({ cac: false, secretarias: false })

const toast = useToast()

const extrairMensagemErro = (erro: unknown, padrao: string): string => {
  if (typeof erro === 'object' && erro !== null) {
    const possivelResposta = (erro as { response?: { data?: { error?: unknown } } }).response
    const mensagem = possivelResposta?.data?.error
    if (typeof mensagem === 'string' && mensagem.trim()) {
      return mensagem
    }
  }

  return padrao
}

const normalizarUsuario = (
  entrada: Usuario | PermissaoUsuario | PerfilGlobalUsuario | undefined,
): PermissaoUsuario | null => {
  if (!entrada) {
    return null
  }

  const bruto = entrada as Record<string, unknown>
  const idValor = bruto.id
  const idNumero =
    typeof idValor === 'string' || typeof idValor === 'number' ? Number(idValor) : NaN
  if (!Number.isFinite(idNumero)) {
    return null
  }

  const id = Math.trunc(idNumero)
  if (id <= 0) {
    return null
  }

  const nome =
    typeof bruto.nome === 'string'
      ? (bruto.nome as string)
      : typeof bruto['full_name'] === 'string'
      ? (bruto['full_name'] as string)
      : null

  const login =
    typeof bruto.login === 'string'
      ? (bruto.login as string)
      : typeof bruto.username === 'string'
      ? (bruto.username as string)
      : null

  const email = typeof bruto.email === 'string' ? (bruto.email as string) : null

  return { id, nome, login, email }
}

const construirItem = (usuario: PermissaoUsuario): DualListItem | null => {
  const normalizado = normalizarUsuario(usuario)
  if (!normalizado) {
    return null
  }

  const { id } = normalizado
  const nome = normalizado.nome?.trim()
  const login = normalizado.login?.trim()
  const email = normalizado.email?.trim()

  const label = nome || login || `Usuário #${id}`

  const descriptionPartes: string[] = []
  if (login && login !== label) {
    descriptionPartes.push(login)
  }
  if (email) {
    descriptionPartes.push(email)
  }

  const description = descriptionPartes.length ? descriptionPartes.join(' • ') : null

  return { id, label, description }
}

const mapaUsuariosDetalhes = computed(() => {
  const mapa = new Map<number, PermissaoUsuario>()

  const registrar = (usuario: Usuario | PermissaoUsuario | PerfilGlobalUsuario) => {
    const normalizado = normalizarUsuario(usuario)
    if (normalizado) {
      mapa.set(normalizado.id, normalizado)
    }
  }

  usuarios.value.forEach(registrar)
  cacEquipeDetalhes.value.forEach(registrar)
  cacCoordenadoresDetalhes.value.forEach(registrar)
  secretariasDetalhes.value.forEach(registrar)

  return mapa
})

const itensUsuarios = computed(() => {
  const valores = Array.from(mapaUsuariosDetalhes.value.values())
  return valores
    .map((usuario) => construirItem(usuario))
    .filter((item): item is DualListItem => Boolean(item))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
})

const cacCoordenadoresLabels = computed(() => {
  return cacCoordenadores.value
    .map((id) => {
      const usuario = mapaUsuariosDetalhes.value.get(id)
      if (!usuario) {
        return null
      }

      const nome = usuario.nome?.trim()
      const login = usuario.login?.trim()
      const rotulo = nome || login || `Usuário #${id}`
      return { id, rotulo }
    })
    .filter((item): item is { id: number; rotulo: string } => Boolean(item))
})

const carregandoListas = computed(() => carregandoUsuarios.value || carregandoPerfisGlobais.value)

const carregarUsuarios = async (force = false) => {
  if (carregandoUsuarios.value || (usuariosCarregados.value && !force)) {
    return
  }

  carregandoUsuarios.value = true
  try {
    const lista = await listarUsuarios({ status: 'active' })
    if (Array.isArray(lista)) {
      usuarios.value = lista
        .slice()
        .sort((a, b) => {
          const nomeA = a.nome?.trim() || a.login?.trim() || ''
          const nomeB = b.nome?.trim() || b.login?.trim() || ''
          return nomeA.localeCompare(nomeB, 'pt-BR')
        })
    } else {
      usuarios.value = []
    }
    usuariosCarregados.value = true
  } catch (error: unknown) {
    console.error('Erro ao carregar usuários disponíveis para perfis globais da esteira', error)
    const mensagem = extrairMensagemErro(
      error,
      'Erro ao carregar usuários disponíveis para associação.',
    )
    toast.error(mensagem)
  } finally {
    carregandoUsuarios.value = false
    usuariosCarregados.value = true
  }
}

const carregarPerfisGlobaisDados = async (force = false) => {
  if (carregandoPerfisGlobais.value || (!force && perfisGlobaisCarregados.value)) {
    return
  }

  carregandoPerfisGlobais.value = true
  try {
    const resposta = await listarPerfisGlobais()

    const cac = resposta.cac
      .map((usuario) => normalizarUsuario(usuario))
      .filter((usuario): usuario is PermissaoUsuario => Boolean(usuario))
    const coordenadores = resposta.cacCoordenacao
      .map((usuario) => normalizarUsuario(usuario))
      .filter((usuario): usuario is PermissaoUsuario => Boolean(usuario))
    const secretarias = resposta.secretarias
      .map((usuario) => normalizarUsuario(usuario))
      .filter((usuario): usuario is PermissaoUsuario => Boolean(usuario))

    cacEquipeDetalhes.value = cac
    cacCoordenadoresDetalhes.value = coordenadores
    secretariasDetalhes.value = secretarias

    const cacIds = Array.from(new Set(cac.map((usuario) => usuario.id)))
    const coordenadoresIds = Array.from(
      new Set(
        coordenadores
          .map((usuario) => usuario.id)
          .filter((id) => cacIds.includes(id)),
      ),
    )
    const secretariasIds = Array.from(new Set(secretarias.map((usuario) => usuario.id)))

    cacSelecionados.value = cacIds
    cacCoordenadores.value = coordenadoresIds
    secretariasSelecionados.value = secretariasIds
    perfisGlobaisCarregados.value = true
  } catch (error: unknown) {
    console.error('Erro ao carregar perfis globais da esteira cirúrgica', error)
    const mensagem = extrairMensagemErro(error, 'Não foi possível carregar os perfis globais.')
    toast.error(mensagem)

    cacEquipeDetalhes.value = []
    cacCoordenadoresDetalhes.value = []
    secretariasDetalhes.value = []
    cacSelecionados.value = []
    cacCoordenadores.value = []
    secretariasSelecionados.value = []
    perfisGlobaisCarregados.value = false
  } finally {
    carregandoPerfisGlobais.value = false
  }
}

const carregarDados = async (force = false) => {
  const primeiraCarga = !perfisGlobaisCarregados.value || !usuariosCarregados.value
  if (primeiraCarga) {
    carregandoInicial.value = true
  }

  try {
    const promessas: Promise<unknown>[] = []
    if (!usuariosCarregados.value || force) {
      promessas.push(carregarUsuarios(force))
    }
    promessas.push(carregarPerfisGlobaisDados(force))
    await Promise.all(promessas)
  } finally {
    carregandoInicial.value = false
  }
}

const alternarCoordenadores = (ids: number[]) => {
  if (!ids.length) {
    return
  }

  const conjuntoSelecionados = new Set(cacSelecionados.value)
  const atual = new Set(cacCoordenadores.value)

  ids.forEach((id) => {
    if (!conjuntoSelecionados.has(id)) {
      return
    }
    if (atual.has(id)) {
      atual.delete(id)
    } else {
      atual.add(id)
    }
  })

  cacCoordenadores.value = Array.from(atual)
}

const salvarPermissoes = async (tipo: 'cac' | 'secretarias') => {
  if (carregandoPerfisGlobais.value) {
    return
  }

  if (salvando[tipo]) {
    return
  }

  try {
    if (tipo === 'cac') {
      const membros = Array.from(new Set(cacSelecionados.value))
      const coordenadores = Array.from(new Set(cacCoordenadores.value)).filter((id) =>
        membros.includes(id),
      )

      salvando.cac = true
      const resposta = await salvarPerfisGlobaisCAC({
        userIds: membros,
        coordenadoresIds: coordenadores,
      })

      toast.success(
        resposta?.message || 'Perfis globais do CAC atualizados com sucesso.',
      )
      await carregarPerfisGlobaisDados(true)
    } else {
      const membros = Array.from(new Set(secretariasSelecionados.value))

      salvando.secretarias = true
      const resposta = await salvarPerfisGlobaisSecretarias({ userIds: membros })

      toast.success(
        resposta?.message || 'Perfis globais das secretárias atualizados com sucesso.',
      )
      await carregarPerfisGlobaisDados(true)
    }
  } catch (error: unknown) {
    const mensagem = extrairMensagemErro(
      error,
      'Não foi possível atualizar os perfis globais. Tente novamente mais tarde.',
    )
    console.error('Erro ao salvar perfis globais da esteira', error)
    toast.error(mensagem)
  } finally {
    salvando.cac = false
    salvando.secretarias = false
  }
}

watch(cacSelecionados, (novos) => {
  const conjunto = new Set(novos)
  cacCoordenadores.value = cacCoordenadores.value.filter((id) => conjunto.has(id))
})

const recarregarDados = async () => {
  await carregarDados(true)
}

defineExpose({ carregarDados })
</script>

