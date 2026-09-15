<template>
  <Modal :fullScreenBackdrop="true" @close="emit('close')">
    <template #body>
      <div
        class="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900"
      >
        <button
          type="button"
          class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:right-6 sm:top-6"
          @click="emit('close')"
          aria-label="Fechar suporte"
        >
          ×
        </button>

        <div class="flex flex-1 flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
          <header class="pr-6">
            <p class="text-sm font-medium uppercase tracking-wide text-brand-600">Suporte</p>
            <h3 class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ solicitacaoAtual?.titulo || 'Solicitação de suporte' }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Criado em: {{ formatSupportDate(solicitacaoAtual?.criadoEm) }}
            </p>
          </header>

          <section class="mt-5 rounded-2xl border border-gray-100 bg-gray-50/60 p-5 text-sm text-gray-700 shadow-inner dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-200">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset"
                :class="statusBadgeClass"
              >
                {{ statusLabel }}
              </span>
              <span class="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm dark:bg-gray-800/80 dark:text-gray-300">
                {{ motivoLabel }}
              </span>
            </div>
            <p class="mt-3 whitespace-pre-line leading-relaxed">
              {{ solicitacaoAtual?.descricao || 'Sem descrição adicional fornecida.' }}
            </p>
          </section>

          <div class="mt-6 flex flex-1 flex-col gap-4 overflow-hidden pr-2">
            <div class="flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white/80 dark:border-gray-800 dark:bg-gray-900/70">
              <div v-if="carregandoMensagens" class="p-4 text-sm text-gray-600 dark:text-gray-300">
                Carregando mensagens...
              </div>
              <div v-else-if="mensagensErro" class="space-y-3 p-4">
                <p class="text-sm text-amber-600 dark:text-amber-300">
                  {{ mensagensErro }}
                </p>
                <Button size="sm" variant="outline" @click="emit('carregar')">Tentar novamente</Button>
              </div>
              <div v-else-if="!mensagens.length" class="p-4 text-sm text-gray-500 dark:text-gray-400">
                Nenhuma interação registrada até o momento.
              </div>
              <div v-else class="flex h-full flex-col overflow-hidden p-4">
                <ul ref="mensagensLista" class="flex h-full flex-col gap-4 overflow-y-auto pr-2">
                  <li
                    v-for="mensagem in mensagens"
                    :key="`suporte-msg-${mensagem.id ?? Math.random()}`"
                    class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span class="font-semibold text-gray-700 dark:text-gray-100">
                        {{ mensagem.criadoPor?.nome || 'Usuário' }}
                      </span>
                      <span>•</span>
                      <span>{{ formatSupportDateTime(mensagem.criadoEm) }}</span>
                    </div>
                    <p
                      v-if="mensagem.conteudo"
                      class="mt-2 whitespace-pre-line text-sm text-gray-800 dark:text-gray-100"
                    >
                      {{ mensagem.conteudo }}
                    </p>
                    <ul v-if="mensagem.anexos?.length" class="mt-3 space-y-2">
                      <li
                        v-for="anexo in mensagem.anexos"
                        :key="`suporte-msg-${mensagem.id}-anexo-${anexo.id}`"
                        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60"
                      >
                        <div class="min-w-0">
                          <p class="truncate font-medium text-gray-700 dark:text-gray-200">
                            {{ anexo.nomeOriginal || `Arquivo ${anexo.id ?? ''}` }}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {{ formatSupportFileSize(anexo.tamanhoBytes) }}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          :start-icon="DocsIcon"
                          class-name="inline-flex items-center gap-1 px-3 py-2 text-xs"
                          @click="emit('download-anexo', anexo)"
                        >
                          Visualizar
                        </Button>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div class="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/70">
              <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Nova mensagem
              </label>
              <textarea
                v-model="novaMensagem"
                rows="4"
                class="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                placeholder="Escreva sua mensagem para a equipe de suporte"
                @keydown="onChatKeydown"
              ></textarea>
              <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex items-center gap-3">
                  <input
                    ref="inputArquivo"
                    type="file"
                    class="hidden"
                    multiple
                    :accept="DEFAULT_ATTACHMENT_ACCEPT"
                    @change="onArquivosSelecionados"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    :start-icon="PaperclipIcon"
                    class-name="inline-flex items-center gap-1"
                    :disabled="uploadEmAndamento || enviandoMensagem"
                    @click="abrirSeletorArquivos"
                  >
                    <template v-if="uploadEmAndamento">Enviando arquivo...</template>
                    <template v-else>Adicionar arquivo</template>
                  </Button>
                </div>
                <Button
                  class-name="w-full justify-center sm:w-auto"
                  :disabled="!podeEnviarMensagem"
                  @click="enviarMensagem"
                >
                  <template v-if="enviandoMensagem">Enviando...</template>
                  <template v-else>Enviar mensagem</template>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import { useToast } from '@/composables/useToast'
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_ATTACHMENT_EXTENSIONS_LABEL,
  splitAttachmentsByValidity,
} from '@/constants/attachments'
import { PaperclipIcon, DocsIcon } from '@/icons'
import type {
  SupportAttachment,
  SupportMessage,
  SupportRequestDetail,
  SupportRequestSummary,
} from '@/types/support'
import {
  formatSupportDate,
  formatSupportDateTime,
  formatSupportFileSize,
  getSupportMotivoLabel,
  getSupportStatusBadgeClass,
  getSupportStatusLabel,
} from '@/utils/support'

const props = defineProps<{
  solicitacao: SupportRequestDetail | SupportRequestSummary | null
  mensagens: SupportMessage[]
  carregandoMensagens: boolean
  mensagensErro: string | null
  enviandoMensagem: boolean
  uploadEmAndamento: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'carregar'): void
  (e: 'enviar-mensagem', mensagem: string): void
  (e: 'enviar-anexo', arquivos: File[]): void
  (e: 'download-anexo', anexo: SupportAttachment): void
}>()

const inputArquivo = ref<HTMLInputElement | null>(null)
const mensagensLista = ref<HTMLUListElement | null>(null)
const novaMensagem = ref('')
const toast = useToast()

const solicitacaoAtual = computed(() => props.solicitacao)

const statusLabel = computed(() => getSupportStatusLabel(solicitacaoAtual.value?.status))
const statusBadgeClass = computed(() => getSupportStatusBadgeClass(solicitacaoAtual.value?.status))
const motivoLabel = computed(() => getSupportMotivoLabel(solicitacaoAtual.value?.motivo))

const podeEnviarMensagem = computed(() => {
  const texto = novaMensagem.value.trim()
  return Boolean(texto.length) && !props.enviandoMensagem
})

const abrirSeletorArquivos = () => {
  if (props.uploadEmAndamento || props.enviandoMensagem) {
    return
  }

  inputArquivo.value?.click()
}

const onArquivosSelecionados = (event: Event) => {
  const alvo = event.target as HTMLInputElement | null
  const arquivos = alvo?.files ? Array.from(alvo.files) : []

  if (arquivos.length) {
    const { valid, invalid } = splitAttachmentsByValidity(arquivos)

    if (invalid.length) {
      const nomes = invalid.map((arquivo) => arquivo.name).join(', ')
      toast.error(
        `Os arquivos ${nomes} possuem formato inválido. Tipos permitidos: ${DEFAULT_ATTACHMENT_EXTENSIONS_LABEL}.`,
      )
    }

    if (valid.length) {
      emit('enviar-anexo', valid)
    }
  }

  if (alvo) {
    alvo.value = ''
  }
}

const enviarMensagem = () => {
  const mensagem = novaMensagem.value.trim()
  if (!mensagem || props.enviandoMensagem) {
    return
  }

  emit('enviar-mensagem', mensagem)
  novaMensagem.value = ''
}

const onChatKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) {
    return
  }

  event.preventDefault()
  enviarMensagem()
}

const rolarParaFim = () => {
  nextTick(() => {
    const container = mensagensLista.value
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

watch(
  () => props.mensagens.length,
  () => {
    rolarParaFim()
  },
)

watch(
  () => solicitacaoAtual.value?.id,
  () => {
    novaMensagem.value = ''
    rolarParaFim()
  },
)
</script>
