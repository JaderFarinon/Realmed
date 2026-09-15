<template>
  <Modal :fullScreenBackdrop="true" @close="emit('close')">
    <template #body>
      <div
        v-if="card"
        class="relative flex h-full w-full max-w-full flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900"
      >
        <button
          type="button"
          class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 sm:right-6 sm:top-6"
          @click="emit('close')"
          aria-label="Fechar detalhes da solicitação"
        >
          ×
        </button>

        <div class="flex flex-1 flex-col overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
          <header class="pr-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {{ descricaoPacienteCard(card) }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ formatarData(card.dataCirurgia) }}
            </p>
          </header>

          <nav class="mt-6 flex items-center gap-2 border-b border-gray-200 pb-1 pr-6 dark:border-gray-800">
            <button
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition"
              :class="[
                abaAtiva === 'detalhes'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              ]"
              @click="abaAtiva = 'detalhes'"
            >
              Detalhes
            </button>
            <button
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition"
              :class="[
                abaAtiva === 'chat'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              ]"
              @click="abaAtiva = 'chat'"
            >
              Chat
            </button>
            <button
              v-if="permiteVencimentos"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition"
              :class="[
                abaAtiva === 'vencimentos'
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              ]"
              @click="abaAtiva = 'vencimentos'"
            >
              Vencimentos
            </button>
          </nav>

          <div class="mt-6 flex flex-1 flex-col overflow-hidden pr-4">
            <section v-if="abaAtiva === 'detalhes'" class="flex h-full flex-col gap-6 overflow-hidden">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span class="h-2.5 w-2.5 rounded-full" :class="statusDotClass(card.status)"></span>
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                    statusBadgeClass(card.status),
                  ]"
                >
                  {{ statusLabel(card.status) }}
                </span>
              </span>
              <span
                v-if="card.prioridade"
                class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
              >
                {{ card.prioridade }}
              </span>
              <span
                v-if="card.tipo"
                class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800/80 dark:text-gray-300"
              >
                {{ card.tipo }}
              </span>
              </div>

              <div
                v-if="alertaVencimentos"
                class="rounded-2xl border p-4"
                :class="{
                  'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-900/20 dark:text-blue-100':
                    alertaVencimentos.tipo === 'info',
                  'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-100':
                    alertaVencimentos.tipo === 'warning',
                  'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-900/20 dark:text-rose-100':
                    alertaVencimentos.tipo === 'danger',
                }"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex items-start gap-3">
                    <span
                      class="mt-1 h-2.5 w-2.5 rounded-full"
                      :class="{
                        'bg-blue-500 dark:bg-blue-400': alertaVencimentos.tipo === 'info',
                        'bg-amber-500 dark:bg-amber-400': alertaVencimentos.tipo === 'warning',
                        'bg-rose-500 dark:bg-rose-400': alertaVencimentos.tipo === 'danger',
                      }"
                    ></span>
                    <div class="space-y-1">
                      <p class="text-sm font-semibold leading-tight">{{ alertaVencimentos.titulo }}</p>
                      <p class="text-xs leading-relaxed text-gray-700 dark:text-gray-200">
                        {{ alertaVencimentos.mensagem }}
                      </p>
                    </div>
                  </div>
                  <Button
                    v-if="alertaVencimentos.mostrarAtalho"
                    size="sm"
                    variant="outline"
                    class-name="w-full justify-center sm:w-auto"
                    @click="abaAtiva = 'vencimentos'"
                  >
                    Ver vencimentos
                  </Button>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div
                  v-for="item in detalhes"
                  :key="item.label"
                  class="rounded-2xl border border-gray-100 p-3 shadow-sm dark:border-gray-800"
                >
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {{ item.label }}
                  </p>
                  <p class="mt-1 text-sm text-gray-700 dark:text-gray-200">
                    {{ item.valor }}
                  </p>
                </div>
              </div>

              <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Documentos anexados
                  </h4>
                  <div class="flex items-center gap-3">
                    <input
                      ref="inputArquivo"
                      type="file"
                      class="hidden"
                      :accept="DEFAULT_ATTACHMENT_ACCEPT"
                      @change="onArquivoSelecionado"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      :start-icon="PaperclipIcon"
                      class-name="inline-flex items-center gap-1"
                      :disabled="uploadAnexoEmAndamento || carregandoAnexos"
                      @click="abrirSeletorArquivo"
                    >
                      <template v-if="uploadAnexoEmAndamento">Enviando...</template>
                      <template v-else>Adicionar documento</template>
                    </Button>
                  </div>
                </div>

                <div class="flex-1 overflow-hidden">
                  <div
                    v-if="carregandoAnexos"
                    class="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300"
                  >
                    Carregando anexos...
                  </div>
                  <div
                    v-else-if="anexosErro"
                    class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    {{ anexosErro }}
                  </div>
                  <div
                    v-else-if="!anexos.length"
                    class="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  >
                    Nenhum documento anexado.
                  </div>
                  <div
                    v-else
                    class="h-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
                  >
                    <div class="h-full overflow-y-auto">
                      <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                        <thead class="bg-gray-50 dark:bg-gray-900/40">
                          <tr>
                            <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Arquivo</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Tamanho</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Enviado em</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Usuário</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">Ações</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                          <tr v-for="anexo in anexos" :key="`anexo-${anexo.id}`" class="bg-white dark:bg-gray-900/40">
                            <td class="px-4 py-3">
                              <p class="font-medium text-gray-800 dark:text-gray-100">
                                {{ anexo.nomeOriginal ?? `Documento ${anexo.id}` }}
                              </p>
                              <p v-if="anexo.mimeType" class="text-xs text-gray-500 dark:text-gray-400">
                                {{ anexo.mimeType }}
                              </p>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {{ formatarTamanhoArquivo(anexo.tamanhoBytes) }}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {{ anexo.criadoEm ? formatarData(anexo.criadoEm) : '-' }}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {{ anexo.criadoPor?.nome ?? '-' }}
                            </td>
                            <td class="px-4 py-3 text-right">
                              <Button
                                size="xs"
                                variant="outline"
                                :start-icon="DocsIcon"
                                class-name="inline-flex items-center gap-1"
                                @click="emit('download-anexo', anexo)"
                              >
                                Visualizar
                              </Button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              v-else-if="abaAtiva === 'chat'"
              class="flex h-full flex-col gap-4 overflow-hidden"
            >
              <div class="flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white/70 dark:border-gray-800 dark:bg-gray-900/70">
                <div
                  v-if="carregandoChatMensagens"
                  class="p-4 text-sm text-gray-600 dark:text-gray-300"
                >
                  Carregando mensagens...
                </div>
                <div v-else-if="chatMensagensErro" class="space-y-3 p-4">
                  <p class="text-sm text-amber-600 dark:text-amber-300">
                    {{ chatMensagensErro }}
                  </p>
                  <Button size="sm" variant="outline" @click="emit('carregar-chat')">Tentar novamente</Button>
                </div>
                <div
                  v-else-if="!chatMensagens.length"
                  class="p-4 text-sm text-gray-500 dark:text-gray-400"
                >
                  Nenhuma mensagem registrada nesta tarefa.
                </div>
                <div v-else class="flex h-full flex-col overflow-hidden p-4">
                  <ul class="flex h-full flex-col gap-4 overflow-y-auto pr-2">
                    <li
                      v-for="mensagem in chatMensagens"
                      :key="`chat-${mensagem.id}`"
                      class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span class="font-semibold text-gray-700 dark:text-gray-200">
                          {{ mensagem.autor?.nome ?? 'Usuário' }}
                        </span>
                        <span>•</span>
                        <span>{{ formatarDataHora(mensagem.criadoEm) }}</span>
                      </div>
                      <p class="mt-2 whitespace-pre-line text-sm text-gray-800 dark:text-gray-100">
                        {{ mensagem.conteudo || 'Mensagem sem conteúdo.' }}
                      </p>
                      <ul
                        v-if="mensagem.anexos?.length"
                        class="mt-3 space-y-2"
                      >
                        <li
                          v-for="anexo in mensagem.anexos"
                          :key="`chat-anexo-${anexo.id}`"
                          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60"
                        >
                          <div class="min-w-0">
                            <p class="truncate font-medium text-gray-700 dark:text-gray-200">
                              {{ anexo.nomeOriginal ?? `Arquivo ${anexo.id}` }}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {{ formatarTamanhoArquivo(anexo.tamanhoBytes) }}
                            </p>
                          </div>
                          <Button
                            size="xs"
                            variant="outline"
                            :start-icon="DocsIcon"
                            class-name="inline-flex items-center gap-1"
                            @click="emit('download-chat-anexo', anexo)"
                          >
                            Visualizar
                          </Button>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="rounded-2xl border border-gray-100 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nova mensagem
                </label>
                <textarea
                  v-model="novaMensagem"
                  rows="4"
                  class="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  placeholder="Escreva uma nova atualização para esta tarefa"
                  @keydown="onChatKeydown"
                ></textarea>
                <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex items-center gap-3">
                    <input
                      ref="inputChatArquivo"
                      type="file"
                      class="hidden"
                      :accept="DEFAULT_ATTACHMENT_ACCEPT"
                      @change="onChatArquivoSelecionado"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      :start-icon="PaperclipIcon"
                      class-name="inline-flex items-center gap-1"
                      :disabled="uploadChatAnexoEmAndamento || enviandoChatMensagem"
                      @click="abrirSeletorChatArquivo"
                    >
                      <template v-if="uploadChatAnexoEmAndamento">Enviando arquivo...</template>
                      <template v-else>Adicionar arquivo</template>
                    </Button>
                  </div>
                  <Button
                    class-name="w-full justify-center sm:w-auto"
                    :disabled="!podeEnviarMensagemChat"
                    @click="enviarMensagemChat"
                  >
                    <template v-if="enviandoChatMensagem">Enviando...</template>
                    <template v-else>Enviar mensagem</template>
                  </Button>
                </div>
              </div>
            </section>

            <section v-else class="flex h-full flex-col gap-4 overflow-hidden">
              <div class="flex-1 overflow-hidden rounded-2xl border border-gray-100 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                <div v-if="carregandoVencimentos" class="text-sm text-gray-600 dark:text-gray-300">
                  Carregando vencimentos...
                </div>
                <div
                  v-else-if="vencimentosErro"
                  class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/50 dark:bg-amber-900/20 dark:text-amber-200"
                >
                  {{ vencimentosErro }}
                </div>
                <div
                  v-else-if="!vencimentos.length"
                  class="rounded-lg border border-dashed border-gray-200 bg-white/70 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-400"
                >
                  Nenhum vencimento registrado para esta etapa.
                </div>
                <div v-else class="h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <div class="h-full overflow-y-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                      <thead class="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Data limite</th>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Descrição</th>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Usuário</th>
                          <th class="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Registrado em</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                        <tr v-for="item in vencimentos" :key="`vencimento-${item.id}`" class="bg-white dark:bg-gray-900/40">
                          <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {{ item.dataLimite ? formatarData(item.dataLimite) : '-' }}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {{ item.descricao || '-' }}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {{ item.criadoPor?.nome || '-' }}
                          </td>
                          <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                            {{ item.criadoEm ? formatarData(item.criadoEm) : '-' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-gray-100 bg-white/70 p-4 dark:border-gray-800 dark:bg-gray-900/70">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="flex flex-col gap-1">
                    <label for="data-vencimento" class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Data do vencimento
                    </label>
                    <input
                      id="data-vencimento"
                      v-model="novoVencimentoData"
                      type="date"
                      class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label for="descricao-vencimento" class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Descrição
                    </label>
                    <input
                      id="descricao-vencimento"
                      v-model="novoVencimentoDescricao"
                      type="text"
                      class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      placeholder="Detalhe opcional do vencimento"
                    />
                  </div>
                </div>

                <div class="mt-4 flex items-center justify-end">
                  <Button
                    class-name="w-full justify-center sm:w-auto"
                    :disabled="!podeRegistrarVencimento"
                    @click="salvarVencimento"
                  >
                    <template v-if="enviandoVencimento">Salvando...</template>
                    <template v-else>Registrar vencimento</template>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer class="flex flex-col-reverse gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            <template v-if="estaConcluido">Esta tarefa já está marcada como concluída.</template>
            <template v-else-if="card?.permiteMovimentacao === false">
              Esta tarefa está bloqueada para movimentação manual.
            </template>
          </div>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <Button variant="outline" class-name="w-full justify-center sm:w-auto" @click="emit('close')">
              Fechar
            </Button>
            <Button
              class-name="w-full justify-center sm:w-auto"
              :disabled="marcandoConclusao || estaConcluido || card?.permiteMovimentacao === false"
              @click="emit('concluir')"
            >
              <template v-if="marcandoConclusao">Concluindo...</template>
              <template v-else-if="estaConcluido">Concluído</template>
              <template v-else>Marcar como concluído</template>
            </Button>
          </div>
        </footer>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue'
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
  KanbanAnexo,
  KanbanCard,
  KanbanChatMensagem,
  KanbanChatAnexo,
  KanbanVencimento,
} from '@/views/EsteiraCirurgica/KanbanMultiPresenca.vue'

interface DetalheItem {
  label: string
  valor: string
}

const props = defineProps<{
  card: KanbanCard | null
  detalhes: DetalheItem[]
  anexos: KanbanAnexo[]
  carregandoAnexos: boolean
  anexosErro: string | null
  uploadAnexoEmAndamento: boolean
  marcandoConclusao: boolean
  estaConcluido: boolean
  chatMensagens: KanbanChatMensagem[]
  carregandoChatMensagens: boolean
  chatMensagensErro: string | null
  enviandoChatMensagem: boolean
  uploadChatAnexoEmAndamento: boolean
  permiteVencimentos: boolean
  vencimentos: KanbanVencimento[]
  carregandoVencimentos: boolean
  vencimentosErro: string | null
  enviandoVencimento: boolean
  descricaoPacienteCard: (card: KanbanCard | null | undefined) => string
  formatarData: (valor?: string) => string
  statusDotClass: (status?: string) => string
  statusBadgeClass: (status?: string) => string
  statusLabel: (status?: string) => string
  formatarTamanhoArquivo: (tamanho: number | null | undefined) => string
}>()

const {
  card,
  detalhes,
  anexos,
  carregandoAnexos,
  anexosErro,
  uploadAnexoEmAndamento,
  marcandoConclusao,
  estaConcluido,
  chatMensagens,
  carregandoChatMensagens,
  chatMensagensErro,
  enviandoChatMensagem,
  uploadChatAnexoEmAndamento,
  permiteVencimentos,
  vencimentos,
  carregandoVencimentos,
  vencimentosErro,
  enviandoVencimento,
} = toRefs(props)

const { descricaoPacienteCard, formatarData, statusDotClass, statusBadgeClass, statusLabel, formatarTamanhoArquivo } = props

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'upload', arquivo: File): void
  (e: 'download-anexo', anexo: KanbanAnexo): void
  (e: 'concluir'): void
  (e: 'carregar-chat'): void
  (e: 'enviar-chat-mensagem', mensagem: string): void
  (e: 'enviar-chat-anexo', arquivo: File): void
  (e: 'download-chat-anexo', anexo: KanbanChatAnexo): void
  (e: 'carregar-vencimentos'): void
  (e: 'criar-vencimento', payload: { descricao: string; dataLimite: string }): void
}>()

const inputArquivo = ref<HTMLInputElement | null>(null)
const inputChatArquivo = ref<HTMLInputElement | null>(null)
const abaAtiva = ref<'detalhes' | 'chat' | 'vencimentos'>('detalhes')
const novaMensagem = ref('')
const chatCarregado = ref(false)
const vencimentosCarregados = ref(false)
const novoVencimentoDescricao = ref('')
const novoVencimentoData = ref('')
const toast = useToast()

type AlertaVencimentoTipo = 'info' | 'warning' | 'danger'

interface AlertaVencimento {
  titulo: string
  mensagem: string
  tipo: AlertaVencimentoTipo
  mostrarAtalho?: boolean
}

const abrirSeletorArquivo = () => {
  if (uploadAnexoEmAndamento.value || carregandoAnexos.value) {
    return
  }

  inputArquivo.value?.click()
}

const abrirSeletorChatArquivo = () => {
  if (uploadChatAnexoEmAndamento.value || enviandoChatMensagem.value) {
    return
  }

  inputChatArquivo.value?.click()
}

const onArquivoSelecionado = (event: Event) => {
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
      emit('upload', valid[0])
    }
  }

  if (alvo) {
    alvo.value = ''
  }
}

const onChatArquivoSelecionado = (event: Event) => {
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
      emit('enviar-chat-anexo', valid[0])
    }
  }

  if (alvo) {
    alvo.value = ''
  }
}

const podeEnviarMensagemChat = computed(() => {
  return Boolean(novaMensagem.value.trim().length) && !enviandoChatMensagem.value
})

const enviarMensagemChat = () => {
  const mensagem = novaMensagem.value.trim()
  if (!mensagem || enviandoChatMensagem.value) {
    return
  }

  emit('enviar-chat-mensagem', mensagem)
  novaMensagem.value = ''
}

const podeRegistrarVencimento = computed(() => {
  return (
    permiteVencimentos.value &&
    Boolean(novoVencimentoData.value.trim()) &&
    !enviandoVencimento.value
  )
})

const normalizarDataSemHorario = (valor?: string | null) => {
  if (!valor) return null

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return null
  }

  data.setHours(0, 0, 0, 0)
  return data
}

const obterDatasDeVencimentos = () =>
  vencimentos.value
    .map((item) => ({
      data: normalizarDataSemHorario(item.dataLimite),
      original: item.dataLimite,
    }))
    .filter((item): item is { data: Date; original: string } => Boolean(item.data && item.original))

const alertaVencimentos = computed<AlertaVencimento | null>(() => {
  if (!permiteVencimentos.value) {
    return null
  }

  if (carregandoVencimentos.value) {
    return {
      titulo: 'Carregando vencimentos',
      mensagem: 'Estamos buscando os vencimentos desta tarefa.',
      tipo: 'info',
    }
  }

  const datas = obterDatasDeVencimentos()
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  if (!datas.length) {
    return {
      titulo: 'Vencimento obrigatório',
      mensagem: 'Esta tarefa exige uma data limite. Cadastre o vencimento na aba "Vencimentos".',
      tipo: 'warning',
      mostrarAtalho: true,
    }
  }

  const maisRecente = datas.reduce((maisRecente, atual) => (atual.data > maisRecente.data ? atual : maisRecente))

  if (maisRecente.data < hoje) {
    return {
      titulo: 'Vencimento expirado',
      mensagem: `O último vencimento cadastrado (${formatarData(maisRecente.original)}) já passou. Atualize a data limite antes de concluir a tarefa.`,
      tipo: 'danger',
      mostrarAtalho: true,
    }
  }

  return {
    titulo: 'Vencimento registrado',
    mensagem: `Última data limite cadastrada: ${formatarData(maisRecente.original)}.`,
    tipo: 'info',
  }
})

const salvarVencimento = () => {
  const data = novoVencimentoData.value.trim()
  if (!data || !permiteVencimentos.value || enviandoVencimento.value) {
    return
  }

  emit('criar-vencimento', {
    descricao: novoVencimentoDescricao.value,
    dataLimite: data,
  })
}

const formatarDataHora = (valor: string | null | undefined) => {
  if (!valor) {
    return '-'
  }

  try {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) {
      return '-'
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(data)
  } catch (error: any) {
    console.error('Erro ao formatar data/hora do chat', error)
    return '-'
  }
}

const onChatKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) {
    return
  }

  event.preventDefault()
  enviarMensagemChat()
}

watch(
  () => abaAtiva.value,
  (aba) => {
    if (aba === 'chat' && !chatCarregado.value) {
      chatCarregado.value = true
      emit('carregar-chat')
    }

    if (aba === 'vencimentos' && permiteVencimentos.value && !vencimentosCarregados.value) {
      vencimentosCarregados.value = true
      emit('carregar-vencimentos')
    }
  },
)

watch(
  () => card.value?.id,
  () => {
    abaAtiva.value = 'detalhes'
    novaMensagem.value = ''
    chatCarregado.value = false
    vencimentosCarregados.value = false
    novoVencimentoDescricao.value = ''
    novoVencimentoData.value = ''
  },
)
</script>
