<template>
  <AdminLayout>
    <PageBreadcrumbIcons :page-title="pageTitle" />

    <div class="flex flex-col gap-6 md:flex-row min-h-[calc(100vh-180px)]">
      <IaSidebar
        v-model="chatSelecionadoId"
        :chats="chats"
        :loading="carregandoChats"
        @novo-chat="criarChat"
      />

      <div class="flex flex-1 flex-col rounded-3xl bg-[#111827] text-white shadow-theme-lg ring-1 ring-gray-900/80 min-h-0">
        <header class="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5">
          <div>
            <h2 class="text-xl font-semibold text-white/90">Chat com Inteligência Artificial</h2>
            <p class="text-sm text-white/60">
              Selecione um chat ou crie uma nova conversa para interagir com o assistente.
            </p>
          </div>
          <button
            type="button"
            class="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:border-brand-500/60 hover:text-brand-200"
            @click="abrirConfiguracoes"
          >
            <SettingsIcon class="h-4 w-4" />
            Configurações
          </button>
        </header>

        <div class="flex flex-1 flex-col min-h-0">
          <div class="flex-1 overflow-y-auto px-6 py-6">
            <div class="mx-auto flex w-full max-w-4xl flex-col gap-4">
              <Alert
                v-if="feedback"
                :variant="feedback.tipo"
                :title="feedback.titulo"
                :message="feedback.mensagem"
              />

              <p
                v-if="!carregandoMensagens && !mensagens.length && chatSelecionadoId"
                class="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/70"
              >
                Nenhuma mensagem ainda. Envie a primeira pergunta para a IA responder.
              </p>

              <p
                v-else-if="!chats.length && !carregandoChats"
                class="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-center text-sm text-white/70"
              >
                Para começar, crie um novo chat ao lado.
              </p>

              <div v-else-if="carregandoMensagens" class="flex justify-center py-10 text-sm text-white/70">
                Carregando histórico...
              </div>

              <IaMessageBubble
                v-for="mensagem in mensagens"
                v-else
                :key="mensagem.id"
                :role="mensagem.role"
                :content="mensagem.content"
                :created-at="mensagem.created_at"
              />
            </div>
          </div>

          <form class="border-t border-white/5 px-6 py-5" @submit.prevent="enviarMensagem">
            <fieldset :disabled="!chatSelecionadoId || enviandoMensagem" class="flex items-end gap-3">
              <div class="flex-1">
                <label class="sr-only" for="ia-message-input">Mensagem</label>
                <textarea
                  id="ia-message-input"
                  v-model="novaMensagem"
                  rows="3"
                  placeholder="Digite sua mensagem..."
                  class="w-full resize-none rounded-2xl border border-transparent bg-white/10 px-4 py-3 text-sm text-white shadow-theme-xs placeholder:text-white/40 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
                ></textarea>
              </div>
              <button
                type="submit"
                class="flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span v-if="enviandoMensagem" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                <SendIcon v-else class="h-4 w-4" />
                Enviar
              </button>
            </fieldset>
            <p v-if="!chatSelecionadoId" class="mt-3 text-center text-xs text-white/50">
              Crie ou selecione um chat para enviar mensagens.
            </p>
          </form>
        </div>
      </div>
    </div>

    <IaSettingsModal
      :aberto="configuracoesAbertas"
      @fechar="fecharConfiguracoes"
      @sucesso="handleConfiguracaoAtualizada"
      @erro="exibirErro"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumbIcons from '@/components/common/PageBreadcrumbIcons.vue'
import Alert from '@/components/ui/Alert.vue'
import IaSidebar from '@/components/ia/IaSidebar.vue'
import IaMessageBubble from '@/components/ia/IaMessageBubble.vue'
import IaSettingsModal from '@/components/ia/IaSettingsModal.vue'
import { SettingsIcon, SendIcon } from '@/icons'
import {
  createIaChat,
  fetchIaMessages,
  listIaChats,
  sendIaMessage,
  type IaChat,
  type IaMessage,
} from '@/services/ia'

interface FeedbackState {
  tipo: 'success' | 'error'
  titulo: string
  mensagem: string
}

const pageTitle = 'Inteligência Artificial — Chat'
const chats = ref<IaChat[]>([])
const chatSelecionadoId = ref<number | null>(null)
const mensagens = ref<IaMessage[]>([])
const novaMensagem = ref('')
const carregandoChats = ref(false)
const carregandoMensagens = ref(false)
const enviandoMensagem = ref(false)
const configuracoesAbertas = ref(false)
const feedback = ref<FeedbackState | null>(null)

const carregarChats = async () => {
  try {
    carregandoChats.value = true
    const lista = await listIaChats()
    chats.value = lista
    if (!chatSelecionadoId.value && lista.length) {
      chatSelecionadoId.value = lista[0].id
    }
    if (!lista.length) {
      mensagens.value = []
      chatSelecionadoId.value = null
    }
  } catch (error) {
    console.error('[IA] Erro ao listar chats', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao carregar chats',
      mensagem: 'Não foi possível carregar as conversas cadastradas.',
    }
  } finally {
    carregandoChats.value = false
  }
}

const carregarMensagens = async (chatId: number | null) => {
  if (!chatId) {
    mensagens.value = []
    return
  }

  try {
    carregandoMensagens.value = true
    const historico = await fetchIaMessages(chatId)
    mensagens.value = historico
  } catch (error) {
    console.error('[IA] Erro ao carregar mensagens', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao carregar mensagens',
      mensagem: 'Não foi possível carregar o histórico desta conversa.',
    }
  } finally {
    carregandoMensagens.value = false
  }
}

const criarChat = async () => {
  try {
    const novo = await createIaChat()
    chats.value = [novo, ...chats.value]
    chatSelecionadoId.value = novo.id
    feedback.value = {
      tipo: 'success',
      titulo: 'Chat criado',
      mensagem: 'Uma nova conversa foi iniciada. Envie a primeira mensagem para começar.',
    }
  } catch (error) {
    console.error('[IA] Erro ao criar chat', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao criar chat',
      mensagem: 'Não foi possível iniciar uma nova conversa. Tente novamente.',
    }
  }
}

const enviarMensagem = async () => {
  if (!chatSelecionadoId.value) {
    feedback.value = {
      tipo: 'error',
      titulo: 'Selecione um chat',
      mensagem: 'Escolha ou crie um chat antes de enviar mensagens.',
    }
    return
  }

  const conteudo = novaMensagem.value.trim()
  if (!conteudo || enviandoMensagem.value) {
    return
  }

  try {
    enviandoMensagem.value = true
    feedback.value = null
    await sendIaMessage(chatSelecionadoId.value, conteudo)
    novaMensagem.value = ''
    await carregarMensagens(chatSelecionadoId.value)
  } catch (error) {
    console.error('[IA] Erro ao enviar mensagem', error)
    feedback.value = {
      tipo: 'error',
      titulo: 'Erro ao enviar mensagem',
      mensagem: 'Não foi possível enviar a mensagem para a IA. Verifique a configuração e tente novamente.',
    }
  } finally {
    enviandoMensagem.value = false
  }
}

const abrirConfiguracoes = () => {
  configuracoesAbertas.value = true
  feedback.value = null
}

const fecharConfiguracoes = async (atualizado: boolean) => {
  configuracoesAbertas.value = false
  if (atualizado && chatSelecionadoId.value) {
    await carregarMensagens(chatSelecionadoId.value)
  }
}

const handleConfiguracaoAtualizada = (_settings?: unknown) => {
  feedback.value = {
    tipo: 'success',
    titulo: 'Configurações atualizadas',
    mensagem: 'As credenciais foram atualizadas com sucesso.',
  }
}

const exibirErro = (mensagem: string) => {
  feedback.value = {
    tipo: 'error',
    titulo: 'Configuração de IA',
    mensagem,
  }
}

watch(chatSelecionadoId, (novo) => {
  carregarMensagens(novo)
})

onMounted(async () => {
  await carregarChats()
  if (chatSelecionadoId.value) {
    await carregarMensagens(chatSelecionadoId.value)
  }
})
</script>
