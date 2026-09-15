<template>
  <Modal v-if="isOpen" full-screen-backdrop @close="handleClose">
    <div class="relative flex h-full w-full items-center justify-center p-4 sm:p-6">
      <div
        class="flex h-full w-full max-h-[min(900px,calc(100vh-120px))] max-w-6xl flex-col overflow-hidden rounded-3xl bg-[#111827] text-white shadow-theme-lg ring-1 ring-black/40"
      >
        <header class="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <h2 class="text-xl font-semibold text-white/90">Chat Interno</h2>
            <p class="text-sm text-white/60">
              Selecione um usuário para visualizar o histórico e enviar mensagens.
            </p>
          </div>
          <button
            type="button"
            class="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            @click="handleClose"
          >
            <span class="sr-only">Fechar</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M6.1 6.1a.75.75 0 0 1 1.06 0L10 8.94l2.84-2.84a.75.75 0 1 1 1.06 1.06L11.06 10l2.84 2.84a.75.75 0 0 1-1.06 1.06L10 11.06l-2.84 2.84a.75.75 0 0 1-1.06-1.06L8.94 10 6.1 7.16a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </header>

        <div class="flex flex-1 min-h-0 flex-col md:flex-row">
          <aside
            class="w-full border-b border-white/10 bg-[#0f172a] md:w-72 md:border-b-0 md:border-r"
          >
            <div class="flex items-center justify-between px-5 py-4">
              <h3 class="text-sm font-semibold uppercase tracking-wide text-white/70">
                Usuários
              </h3>
              <span v-if="usuariosCarregando" class="text-xs text-white/50">Carregando...</span>
            </div>
            <div class="max-h-48 overflow-y-auto px-5 pb-4 md:max-h-none md:flex-1 md:px-3">
              <p v-if="usuariosErro" class="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {{ usuariosErro }}
              </p>
              <p
                v-else-if="!usuariosCarregando && !usuarios.length"
                class="rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-center text-xs text-white/60"
              >
                Nenhum usuário disponível para conversar.
              </p>
              <ul v-else class="flex flex-col gap-2">
                <li v-for="usuario in usuarios" :key="usuario.id">
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition"
                    :class="[
                      usuarioSelecionadoId === usuario.id
                        ? 'bg-brand-500/20 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
                    ]"
                    @click="selecionarUsuario(usuario.id)"
                  >
                    <span class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold">
                      {{ gerarIniciais(usuario.nome) }}
                      <span
                        class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0f172a]"
                        :class="usuario.isOnline ? 'bg-emerald-400' : 'bg-gray-500'"
                      ></span>
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold">{{ usuario.nome }}</p>
                      <p class="truncate text-xs text-white/50">
                        {{ usuario.email || 'Sem e-mail cadastrado' }}
                      </p>
                    </div>
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          <section class="flex flex-1 flex-col bg-[#111827]">
            <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 class="text-lg font-semibold text-white">
                  {{ usuarioSelecionado?.nome || 'Selecione um usuário' }}
                </h3>
                <p class="text-xs text-white/50">
                  {{
                    usuarioSelecionado
                      ? usuarioSelecionado.email || 'Sem e-mail cadastrado'
                      : 'Escolha um usuário para começar a conversa.'
                  }}
                </p>
              </div>
              <span
                v-if="usuarioSelecionado"
                class="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
              >
                <span class="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span
                    class="absolute inset-0 rounded-full"
                    :class="usuarioSelecionado.isOnline ? 'bg-emerald-400' : 'bg-gray-500'"
                  ></span>
                </span>
                {{ usuarioSelecionado.isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>

            <div class="flex flex-1 min-h-0 flex-col">
              <div ref="mensagensContainer" class="flex-1 overflow-y-auto px-6 py-5">
                <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
                  <p
                    v-if="mensagensErro"
                    class="rounded-2xl bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200"
                  >
                    {{ mensagensErro }}
                  </p>
                  <p
                    v-else-if="mensagensCarregando"
                    class="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60"
                  >
                    Carregando mensagens...
                  </p>
                  <p
                    v-else-if="!usuarioSelecionado"
                    class="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60"
                  >
                    Selecione um usuário na lista para visualizar a conversa.
                  </p>
                  <p
                    v-else-if="!mensagens.length"
                    class="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/60"
                  >
                    Nenhuma mensagem registrada. Envie a primeira mensagem para iniciar a conversa.
                  </p>
                  <template v-else>
                    <div
                      v-for="mensagem in mensagens"
                      :key="mensagem.id"
                      class="flex w-full"
                      :class="mensagem.senderId === usuarioAtualId ? 'justify-end' : 'justify-start'"
                    >
                      <div
                        class="max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-theme-xs ring-1"
                        :class="mensagem.senderId === usuarioAtualId
                          ? 'bg-brand-500 text-white ring-brand-500/80'
                          : 'bg-[#0b1220] text-white/90 ring-white/10'"
                      >
                        <p v-if="mensagem.content" class="whitespace-pre-wrap leading-relaxed">
                          {{ mensagem.content }}
                        </p>
                        <div
                          v-if="mensagem.attachment"
                          class="mt-3 flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
                        >
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <div class="min-w-0">
                              <p class="truncate text-sm font-semibold text-white">
                                {{ mensagem.attachment.nomeOriginal }}
                              </p>
                              <p class="text-[11px] text-white/50">
                                {{ formatarTamanhoArquivo(mensagem.attachment.tamanhoBytes) }}
                              </p>
                            </div>
                            <button
                              type="button"
                              class="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:border-white/40 hover:text-white"
                              :disabled="estaAbrindoAnexo(mensagem.id)"
                              @click="abrirAnexo(mensagem)"
                            >
                              <DocsIcon class="h-4 w-4" />
                              <span>
                                {{ estaAbrindoAnexo(mensagem.id) ? 'Abrindo...' : 'Visualizar' }}
                              </span>
                            </button>
                          </div>
                        </div>
                        <p class="mt-2 text-right text-[10px] uppercase tracking-wide text-white/50">
                          {{ formatarHorario(mensagem.createdAt) }}
                        </p>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="border-t border-white/10 px-6 py-5">
                <form class="flex flex-col gap-3" @submit.prevent="enviarMensagem">
                  <fieldset
                    :disabled="!usuarioSelecionado || enviandoMensagem"
                    class="flex flex-col gap-3 md:flex-row md:items-end"
                  >
                    <div class="flex-1">
                      <label class="sr-only" for="internal-chat-message">Mensagem</label>
                      <textarea
                        id="internal-chat-message"
                        v-model="novaMensagem"
                        rows="3"
                        placeholder="Digite sua mensagem e pressione Enter para enviar"
                        class="w-full resize-none rounded-2xl border border-transparent bg-white/10 px-4 py-3 text-sm text-white shadow-theme-xs placeholder:text-white/40 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
                        @keydown="onMessageKeydown"
                      ></textarea>
                    </div>
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div class="flex items-center gap-3">
                        <input
                          ref="inputArquivo"
                          type="file"
                          class="hidden"
                          :accept="DEFAULT_ATTACHMENT_ACCEPT"
                          @change="onArquivoSelecionado"
                        />
                        <button
                          type="button"
                          class="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-white/30 hover:text-white"
                          :disabled="enviandoMensagem"
                          @click="abrirSeletorArquivo"
                        >
                          <PaperclipIcon class="h-4 w-4" />
                          Adicionar anexo
                        </button>
                      </div>
                      <button
                        type="submit"
                        class="flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                        :disabled="!podeEnviarMensagem"
                      >
                        <span
                          v-if="enviandoMensagem"
                          class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        ></span>
                        <SendIcon v-else class="h-4 w-4" />
                        Enviar
                      </button>
                    </div>
                  </fieldset>

                  <div v-if="anexoSelecionado" class="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
                    <span class="truncate text-sm text-white">{{ anexoSelecionado.name }}</span>
                    <span class="text-white/40">•</span>
                    <span>{{ formatarTamanhoArquivo(anexoSelecionado.size) }}</span>
                    <button
                      type="button"
                      class="rounded-full border border-transparent px-2 py-1 text-[11px] uppercase tracking-wide text-white/60 transition hover:border-white/30 hover:text-white"
                      @click="removerAnexoSelecionado"
                    >
                      Remover
                    </button>
                  </div>

                  <p v-if="!usuarioSelecionado" class="text-center text-xs text-white/50">
                    Escolha um usuário na lista ao lado para habilitar o envio de mensagens.
                  </p>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import Modal from '@/components/ui/Modal.vue'
import { DocsIcon, PaperclipIcon, SendIcon } from '@/icons'
import { useInternalChat } from '@/composables/useInternalChat'
import { useAuthUser } from '@/composables/useAuthUser'
import { useToast } from '@/composables/useToast'
import { openBlobInNewTab } from '@/utils/files'
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_ATTACHMENT_EXTENSIONS_LABEL,
  splitAttachmentsByValidity,
} from '@/constants/attachments'
import {
  downloadInternalChatAttachment,
  fetchInternalChatMessages,
  fetchInternalChatUsers,
  sendInternalChatMessage,
  type InternalChatMessage,
  type InternalChatUser,
} from '@/services/internalChat'

const { isOpen, close } = useInternalChat()
const { authUser } = useAuthUser()
const toast = useToast()

const usuarios = ref<InternalChatUser[]>([])
const usuariosCarregando = ref(false)
const usuariosErro = ref<string | null>(null)
const usuarioSelecionadoId = ref<number | null>(null)

const mensagens = ref<InternalChatMessage[]>([])
const mensagensCarregando = ref(false)
const mensagensErro = ref<string | null>(null)

const novaMensagem = ref('')
const enviandoMensagem = ref(false)
const anexoSelecionado = ref<File | null>(null)
const anexosEmVisualizacao = ref<number[]>([])

const mensagensContainer = ref<HTMLDivElement | null>(null)
const inputArquivo = ref<HTMLInputElement | null>(null)

const usuarioAtualId = computed(() => authUser.value?.id ?? null)
const usuarioSelecionado = computed(() =>
  usuarios.value.find((usuario) => usuario.id === usuarioSelecionadoId.value) ?? null,
)

const podeEnviarMensagem = computed(() => {
  const possuiConteudo = novaMensagem.value.trim().length > 0
  const possuiAnexo = Boolean(anexoSelecionado.value)
  return Boolean(usuarioSelecionado.value) && (possuiConteudo || possuiAnexo) && !enviandoMensagem.value
})

const gerarIniciais = (nome: string) => {
  if (!nome) {
    return 'U'
  }
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (!partes.length) {
    return 'U'
  }
  if (partes.length === 1) {
    return partes[0].substring(0, 2).toUpperCase()
  }
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

const formatarHorario = (valor: string | null | undefined) => {
  if (!valor) {
    return ''
  }
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return valor
  }
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const formatarTamanhoArquivo = (tamanho: number | null | undefined) => {
  if (tamanho === undefined || tamanho === null) {
    return '-'
  }

  const numero = Number(tamanho)
  if (!Number.isFinite(numero)) {
    return '-'
  }

  if (numero === 0) {
    return '0 B'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = numero
  let indice = 0

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024
    indice += 1
  }

  const casasDecimais = valor >= 10 || indice === 0 ? 0 : 1
  return `${valor.toFixed(casasDecimais)} ${unidades[indice]}`
}

const scrollToBottom = () => {
  nextTick(() => {
    if (mensagensContainer.value) {
      mensagensContainer.value.scrollTop = mensagensContainer.value.scrollHeight
    }
  })
}

const carregarUsuarios = async () => {
  usuariosCarregando.value = true
  usuariosErro.value = null

  try {
    const lista = await fetchInternalChatUsers()
    const currentId = usuarioAtualId.value

    const disponiveis = Array.isArray(lista)
      ? lista.filter((usuario) => usuario.id !== currentId)
      : []

    usuarios.value = disponiveis

    if (!disponiveis.length) {
      usuarioSelecionadoId.value = null
      mensagens.value = []
      return
    }

    if (!disponiveis.some((usuario) => usuario.id === usuarioSelecionadoId.value)) {
      usuarioSelecionadoId.value = disponiveis[0].id
    } else if (usuarioSelecionadoId.value !== null) {
      await carregarMensagens(usuarioSelecionadoId.value)
    }
  } catch (error) {
    console.error('[InternalChat] Erro ao carregar usuários', error)
    usuariosErro.value = 'Não foi possível carregar os usuários disponíveis.'
    toast.error('Não foi possível carregar a lista de usuários do chat.')
  } finally {
    usuariosCarregando.value = false
  }
}

const carregarMensagens = async (usuarioId: number) => {
  mensagensCarregando.value = true
  mensagensErro.value = null

  try {
    const historico = await fetchInternalChatMessages(usuarioId)
    mensagens.value = Array.isArray(historico) ? historico : []
    scrollToBottom()
  } catch (error) {
    console.error('[InternalChat] Erro ao carregar mensagens', error)
    mensagensErro.value = 'Não foi possível carregar as mensagens desta conversa.'
    toast.error('Não foi possível carregar o histórico do chat.')
  } finally {
    mensagensCarregando.value = false
  }
}

const selecionarUsuario = (usuarioId: number) => {
  if (usuarioSelecionadoId.value === usuarioId) {
    return
  }
  usuarioSelecionadoId.value = usuarioId
}

const onMessageKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    enviarMensagem()
  }
}

const abrirSeletorArquivo = () => {
  inputArquivo.value?.click()
}

const onArquivoSelecionado = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  const arquivos = target?.files ? Array.from(target.files) : []

  if (arquivos.length) {
    const { valid, invalid } = splitAttachmentsByValidity(arquivos)

    if (invalid.length) {
      const nomes = invalid.map((arquivo) => arquivo.name).join(', ')
      toast.error(
        `Os arquivos ${nomes} possuem formato inválido. Tipos permitidos: ${DEFAULT_ATTACHMENT_EXTENSIONS_LABEL}.`,
      )
    }

    if (valid.length) {
      anexoSelecionado.value = valid[0]
    }
  }

  if (target) {
    target.value = ''
  }
}

const removerAnexoSelecionado = () => {
  anexoSelecionado.value = null
  if (inputArquivo.value) {
    inputArquivo.value.value = ''
  }
}

const enviarMensagem = async () => {
  if (!usuarioSelecionado.value) {
    toast.info('Selecione um usuário para enviar mensagens.')
    return
  }

  const conteudo = novaMensagem.value.trim()
  const possuiConteudo = conteudo.length > 0
  const possuiAnexo = Boolean(anexoSelecionado.value)

  if (!possuiConteudo && !possuiAnexo) {
    return
  }

  enviandoMensagem.value = true

  try {
    const resposta = await sendInternalChatMessage(usuarioSelecionado.value.id, {
      content: conteudo,
      attachment: anexoSelecionado.value ?? undefined,
    })

    mensagens.value = [...mensagens.value, resposta]
    novaMensagem.value = ''
    removerAnexoSelecionado()
    scrollToBottom()
  } catch (error) {
    console.error('[InternalChat] Erro ao enviar mensagem', error)
    toast.error('Não foi possível enviar a mensagem. Tente novamente.')
  } finally {
    enviandoMensagem.value = false
  }
}

const abrirAnexo = async (mensagem: InternalChatMessage) => {
  if (!mensagem.attachment) {
    return
  }

  if (anexosEmVisualizacao.value.includes(mensagem.id)) {
    return
  }

  anexosEmVisualizacao.value = [...anexosEmVisualizacao.value, mensagem.id]

  try {
    const { blob } = await downloadInternalChatAttachment(mensagem.id)
    openBlobInNewTab(blob)
  } catch (error) {
    console.error('[InternalChat] Erro ao abrir anexo', error)
    toast.error('Não foi possível visualizar o anexo.')
  } finally {
    anexosEmVisualizacao.value = anexosEmVisualizacao.value.filter((id) => id !== mensagem.id)
  }
}

const estaAbrindoAnexo = (mensagemId: number) => anexosEmVisualizacao.value.includes(mensagemId)

const limparEstado = () => {
  usuarios.value = []
  usuariosErro.value = null
  usuarioSelecionadoId.value = null
  mensagens.value = []
  mensagensErro.value = null
  novaMensagem.value = ''
  enviandoMensagem.value = false
  removerAnexoSelecionado()
  anexosEmVisualizacao.value = []
}

const handleClose = () => {
  close()
}

watch(isOpen, (aberto) => {
  if (aberto) {
    carregarUsuarios()
  } else {
    limparEstado()
  }
})

watch(usuarioSelecionadoId, (novo) => {
  if (!isOpen.value) {
    return
  }

  if (novo === null) {
    mensagens.value = []
    return
  }

  carregarMensagens(novo)
})
</script>
