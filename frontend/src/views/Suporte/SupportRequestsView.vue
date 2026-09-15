<template>
  <AdminLayout>
    <div class="flex flex-col gap-6">
      <PageBreadcrumb
        :pageTitle="pageTitle"
        :buttons="breadcrumbButtons"
        @novo="abrirModalNovaSolicitacao"
      >
        <template #actions>
          <Button
            size="sm"
            variant="outline"
            :start-icon="RefreshIcon"
            class-name="inline-flex items-center gap-1"
            :disabled="carregandoSolicitacoes"
            @click="carregarSolicitacoes"
          >
            Atualizar
          </Button>
        </template>
      </PageBreadcrumb>

      <p class="text-sm text-gray-500 dark:text-gray-400">
        <template v-if="isAdminView">
          Acompanhe as solicitações enviadas pelos usuários e responda diretamente através do chat integrado.
        </template>
        <template v-else>
          Consulte suas solicitações de suporte, acompanhe o retorno da equipe e envie novas mensagens quando necessário.
        </template>
      </p>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <label for="filtro-status" class="font-medium">Status:</label>
          <select
            id="filtro-status"
            v-model="filtroStatus"
            class="h-10 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">Todos</option>
            <option value="aguardando_suporte">Aguardando suporte</option>
            <option value="aguardando_usuario">Aguardando usuário</option>
            <option value="fechado">Encerrado</option>
          </select>
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ solicitacoesFiltradas.length }} solicitação(ões) encontrada(s)
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
            <thead class="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
              <tr>
                <th class="px-4 py-3 text-left">Título</th>
                <th class="px-4 py-3 text-left">Motivo</th>
                <th class="px-4 py-3 text-left">Status</th>
                <th class="px-4 py-3 text-left">Atualizado em</th>
                <th class="px-4 py-3 text-center">Mensagens</th>
                <th v-if="isAdminView" class="px-4 py-3 text-left">Usuário</th>
                <th class="w-32 px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-if="carregandoSolicitacoes">
                <td colspan="7" class="px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-300">
                  Carregando solicitações de suporte...
                </td>
              </tr>
              <tr v-else-if="erroSolicitacoes">
                <td colspan="7" class="px-4 py-6 text-center text-sm text-amber-600 dark:text-amber-300">
                  {{ erroSolicitacoes }}
                </td>
              </tr>
              <tr v-else-if="!solicitacoesFiltradas.length">
                <td colspan="7" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma solicitação de suporte encontrada.
                </td>
              </tr>
              <tr
                v-for="solicitacao in solicitacoesFiltradas"
                v-else
                :key="`suporte-${solicitacao.id}`"
                :class="[
                  'cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/5',
                  solicitacao.id === solicitacaoSelecionadaId ? 'bg-brand-500/5 dark:bg-brand-500/10' : '',
                ]"
                @click="abrirChat(solicitacao)"
              >
                <td class="px-4 py-4 align-top">
                  <div class="font-semibold text-gray-800 dark:text-gray-100">{{ solicitacao.titulo }}</div>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Criado em: {{ formatSupportDateTime(solicitacao.criadoEm) }}
                  </p>
                </td>
                <td class="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-200">
                  {{ getSupportMotivoLabel(solicitacao.motivo) }}
                </td>
                <td class="px-4 py-4 align-top">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset"
                    :class="getSupportStatusBadgeClass(solicitacao.status)"
                  >
                    {{ getSupportStatusLabel(solicitacao.status) }}
                  </span>
                </td>
                <td class="px-4 py-4 align-top text-sm text-gray-600 dark:text-gray-300">
                  {{ formatSupportDateTime(solicitacao.ultimaMensagemEm || solicitacao.atualizadoEm) }}
                </td>
                <td class="px-4 py-4 align-top text-center text-sm text-gray-700 dark:text-gray-200">
                  {{ solicitacao.totalMensagens }}
                </td>
                <td v-if="isAdminView" class="px-4 py-4 align-top text-sm text-gray-700 dark:text-gray-200">
                  {{ solicitacao.criadoPor?.nome || '-' }}
                </td>
                <td class="px-4 py-4 align-top text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    class-name="inline-flex items-center gap-1 px-3 py-2 text-xs"
                    @click.stop="abrirChat(solicitacao)"
                  >
                    Ver chat
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Modal v-if="modalNovaSolicitacaoAberto" :fullScreenBackdrop="true" @close="fecharModalNovaSolicitacao">
      <template #body>
        <div class="relative flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900">
          <button
            type="button"
            class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="fecharModalNovaSolicitacao"
            aria-label="Fechar criação de solicitação"
          >
            ×
          </button>

          <form class="flex flex-col gap-6 px-6 py-8" @submit.prevent="criarSolicitacao">
            <header>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Nova solicitação de suporte</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Informe o motivo, descreva o que precisa e, se desejar, anexe arquivos para facilitar o atendimento.
              </p>
            </header>

            <section class="space-y-4">
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">Qual é o motivo?</p>
                <div class="mt-3 grid gap-2">
                  <label class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-400">
                    <input
                      v-model="novoMotivo"
                      type="radio"
                      class="h-4 w-4 text-brand-600 focus:ring-brand-500"
                      value="melhoria"
                    />
                    Sugestão de Melhoria
                  </label>
                  <label class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-brand-400">
                    <input
                      v-model="novoMotivo"
                      type="radio"
                      class="h-4 w-4 text-brand-600 focus:ring-brand-500"
                      value="duvida_problema"
                    />
                    Dúvida / Problema
                  </label>
                </div>
              </div>

              <div>
                <label for="novo-titulo" class="text-sm font-medium text-gray-700 dark:text-gray-200">Título</label>
                <input
                  id="novo-titulo"
                  v-model="novoTitulo"
                  type="text"
                  class="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-400/70 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  maxlength="180"
                  placeholder="Descreva um título curto"
                  required
                />
              </div>

              <div>
                <label for="nova-descricao" class="text-sm font-medium text-gray-700 dark:text-gray-200">Descrição</label>
                <textarea
                  id="nova-descricao"
                  v-model="novaDescricao"
                  rows="5"
                  class="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-400/70 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  maxlength="8000"
                  placeholder="Conte-nos o que está acontecendo"
                  required
                ></textarea>
              </div>

              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-gray-200">Anexos (opcional)</p>
                <div class="mt-3 flex flex-col gap-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <input
                      ref="inputNovosAnexos"
                      type="file"
                      class="hidden"
                      multiple
                      :accept="DEFAULT_ATTACHMENT_ACCEPT"
                      @change="onNovosAnexosSelecionados"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      :start-icon="PaperclipIcon"
                      class-name="inline-flex items-center gap-1"
                      :disabled="salvandoSolicitacao"
                      @click.prevent="abrirSeletorNovoAnexo"
                    >
                      Adicionar arquivos
                    </Button>
                    <span v-if="novosAnexos.length" class="text-xs text-gray-500 dark:text-gray-400">
                      {{ novosAnexos.length }} arquivo(s) selecionado(s)
                    </span>
                  </div>
                  <ul v-if="novosAnexos.length" class="space-y-2">
                    <li
                      v-for="(arquivo, index) in novosAnexos"
                      :key="`${arquivo.name}-${arquivo.size}-${index}`"
                      class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60"
                    >
                      <div class="min-w-0">
                        <p class="truncate font-medium text-gray-700 dark:text-gray-200">{{ arquivo.name }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatSupportFileSize(arquivo.size) }}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        class-name="inline-flex items-center gap-1 px-3 py-2 text-xs"
                        @click.prevent="removerNovoAnexo(index)"
                      >
                        Remover
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <footer class="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                class-name="w-full justify-center sm:w-auto"
                @click="fecharModalNovaSolicitacao"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                class-name="w-full justify-center sm:w-auto"
                :disabled="salvandoSolicitacao"
              >
                <template v-if="salvandoSolicitacao">Enviando...</template>
                <template v-else>Enviar solicitação</template>
              </Button>
            </footer>
          </form>
        </div>
      </template>
    </Modal>

    <SupportRequestChatModal
      v-if="chatAberto"
      :solicitacao="solicitacaoDetalhe ?? solicitacaoResumo"
      :mensagens="solicitacaoDetalhe?.mensagens ?? []"
      :carregando-mensagens="carregandoMensagens"
      :mensagens-erro="mensagensErro"
      :enviando-mensagem="enviandoMensagem"
      :upload-em-andamento="uploadAnexoEmAndamento"
      @close="fecharChat"
      @carregar="carregarMensagens"
      @enviar-mensagem="enviarMensagem"
      @enviar-anexo="enviarAnexos"
      @download-anexo="visualizarAnexo"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import SupportRequestChatModal from '@/components/support/SupportRequestChatModal.vue'
import { PaperclipIcon, RefreshIcon } from '@/icons'
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_ATTACHMENT_EXTENSIONS_LABEL,
  splitAttachmentsByValidity,
} from '@/constants/attachments'
import { openBlobInNewTab } from '@/utils/files'
import { useToast } from '@/composables/useToast'
import {
  createSupportRequest,
  downloadSupportAttachment,
  fetchSupportRequestDetail,
  fetchSupportRequests,
  sendSupportMessage,
  uploadSupportAttachments,
} from '@/services/support'
import type {
  SupportAttachment,
  SupportRequestDetail,
  SupportRequestSummary,
} from '@/types/support'
import {
  formatSupportDateTime,
  formatSupportFileSize,
  getSupportMotivoLabel,
  getSupportStatusBadgeClass,
  getSupportStatusLabel,
} from '@/utils/support'

const solicitacoes = ref<SupportRequestSummary[]>([])
const carregandoSolicitacoes = ref(false)
const erroSolicitacoes = ref<string | null>(null)

const filtroStatus = ref('')

const solicitacaoSelecionadaId = ref<number | null>(null)
const solicitacaoResumo = ref<SupportRequestSummary | null>(null)
const solicitacaoDetalhe = ref<SupportRequestDetail | null>(null)
const carregandoMensagens = ref(false)
const mensagensErro = ref<string | null>(null)
const enviandoMensagem = ref(false)
const uploadAnexoEmAndamento = ref(false)
const chatAberto = ref(false)

const modalNovaSolicitacaoAberto = ref(false)
const novoMotivo = ref<'melhoria' | 'duvida_problema' | ''>('')
const novoTitulo = ref('')
const novaDescricao = ref('')
const novosAnexos = ref<File[]>([])
const salvandoSolicitacao = ref(false)
const inputNovosAnexos = ref<HTMLInputElement | null>(null)

const route = useRoute()
const toast = useToast()

const isAdminView = computed(() => route.meta?.adminView === true)
const pageTitle = computed(() => (isAdminView.value ? 'Suporte - Administração' : 'Suporte'))
const breadcrumbButtons = computed(() => (isAdminView.value ? {} : { novo: true }))

const solicitacoesFiltradas = computed(() => {
  const lista = [...solicitacoes.value]
  const statusFiltro = filtroStatus.value
  const filtrarPorStatus = statusFiltro ? lista.filter((item) => (item.status || '').toLowerCase() === statusFiltro) : lista

  const parseData = (valor: string | null | undefined) => {
    if (!valor) {
      return 0
    }
    const data = new Date(valor)
    return Number.isNaN(data.getTime()) ? 0 : data.getTime()
  }

  return filtrarPorStatus.sort((a, b) => {
    const dataA = Math.max(parseData(a.ultimaMensagemEm), parseData(a.atualizadoEm))
    const dataB = Math.max(parseData(b.ultimaMensagemEm), parseData(b.atualizadoEm))
    return dataB - dataA
  })
})

const resetarFormularioNovaSolicitacao = () => {
  novoMotivo.value = ''
  novoTitulo.value = ''
  novaDescricao.value = ''
  novosAnexos.value = []
}

const abrirModalNovaSolicitacao = () => {
  if (isAdminView.value) {
    return
  }
  modalNovaSolicitacaoAberto.value = true
}

const fecharModalNovaSolicitacao = () => {
  modalNovaSolicitacaoAberto.value = false
  resetarFormularioNovaSolicitacao()
}

const abrirSeletorNovoAnexo = () => {
  if (salvandoSolicitacao.value) {
    return
  }

  inputNovosAnexos.value?.click()
}

const onNovosAnexosSelecionados = (event: Event) => {
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
      novosAnexos.value = [...novosAnexos.value, ...valid]
    }
  }

  if (alvo) {
    alvo.value = ''
  }
}

const removerNovoAnexo = (indice: number) => {
  novosAnexos.value = novosAnexos.value.filter((_, index) => index !== indice)
}

const upsertResumo = (resumo: SupportRequestSummary) => {
  if (!resumo.id) {
    return
  }
  const index = solicitacoes.value.findIndex((item) => item.id === resumo.id)
  if (index >= 0) {
    solicitacoes.value.splice(index, 1, { ...resumo })
  } else {
    solicitacoes.value.push({ ...resumo })
  }
}

const sincronizarResumoSelecionado = (id: number | null) => {
  if (id === null) {
    solicitacaoResumo.value = null
    return
  }

  const encontrado = solicitacoes.value.find((item) => item.id === id)
  if (encontrado) {
    solicitacaoResumo.value = { ...encontrado }
  }
}

const carregarSolicitacoes = async () => {
  carregandoSolicitacoes.value = true
  erroSolicitacoes.value = null
  try {
    const lista = await fetchSupportRequests()
    solicitacoes.value = lista.map((item) => ({ ...item }))
    sincronizarResumoSelecionado(solicitacaoSelecionadaId.value)
  } catch (error: any) {
    console.error('Erro ao carregar solicitações de suporte', error)
    erroSolicitacoes.value =
      error?.response?.data?.error || 'Não foi possível carregar as solicitações de suporte.'
    solicitacoes.value = []
    solicitacaoResumo.value = null
  } finally {
    carregandoSolicitacoes.value = false
  }
}

const carregarMensagens = async () => {
  const resumoAtual = solicitacaoResumo.value
  if (!resumoAtual?.id) {
    toast.error('Nenhuma solicitação selecionada.')
    return
  }

  carregandoMensagens.value = true
  mensagensErro.value = null
  try {
    const detalhe = await fetchSupportRequestDetail(resumoAtual.id)
    solicitacaoDetalhe.value = { ...detalhe, mensagens: [...detalhe.mensagens] }
    upsertResumo(detalhe)
    sincronizarResumoSelecionado(detalhe.id)
  } catch (error: any) {
    console.error('Erro ao carregar detalhes do suporte', error)
    mensagensErro.value = error?.response?.data?.error || 'Não foi possível carregar esta solicitação.'
  } finally {
    carregandoMensagens.value = false
  }
}

const abrirChat = async (resumo: SupportRequestSummary) => {
  if (!resumo.id) {
    toast.error('Solicitação inválida selecionada.')
    return
  }

  solicitacaoSelecionadaId.value = resumo.id
  solicitacaoResumo.value = { ...resumo }
  solicitacaoDetalhe.value = null
  chatAberto.value = true

  await carregarMensagens()
}

const fecharChat = () => {
  chatAberto.value = false
  solicitacaoDetalhe.value = null
  solicitacaoResumo.value = null
  solicitacaoSelecionadaId.value = null
  mensagensErro.value = null
}

const criarSolicitacao = async () => {
  if (!novoMotivo.value) {
    toast.error('Selecione o motivo da solicitação.')
    return
  }

  const titulo = novoTitulo.value.trim()
  if (!titulo) {
    toast.error('Informe um título para a solicitação.')
    return
  }

  const descricao = novaDescricao.value.trim()
  if (!descricao) {
    toast.error('Descreva o que precisa de suporte.')
    return
  }

  salvandoSolicitacao.value = true
  try {
    const detalhe = await createSupportRequest({
      motivo: novoMotivo.value,
      titulo,
      descricao,
      anexos: [...novosAnexos.value],
    })

    toast.success('Solicitação enviada com sucesso.')
    modalNovaSolicitacaoAberto.value = false
    resetarFormularioNovaSolicitacao()

    upsertResumo(detalhe)
    sincronizarResumoSelecionado(detalhe.id)
    solicitacaoDetalhe.value = { ...detalhe, mensagens: [...detalhe.mensagens] }
    solicitacaoSelecionadaId.value = detalhe.id ?? null
    chatAberto.value = true
  } catch (error: any) {
    console.error('Erro ao criar solicitação de suporte', error)
    const mensagem = error?.response?.data?.error || 'Não foi possível enviar a solicitação de suporte.'
    toast.error(mensagem)
  } finally {
    salvandoSolicitacao.value = false
  }
}

const garantirDetalheInicial = () => {
  if (solicitacaoDetalhe.value) {
    return
  }

  const resumoAtual = solicitacaoResumo.value
  if (!resumoAtual) {
    return
  }

  solicitacaoDetalhe.value = {
    ...resumoAtual,
    mensagens: [],
  }
}

const enviarMensagem = async (texto: string) => {
  const resumoAtual = solicitacaoResumo.value
  if (!resumoAtual?.id) {
    toast.error('Nenhuma solicitação selecionada.')
    return
  }

  enviandoMensagem.value = true
  try {
    const { mensagem, resumo } = await sendSupportMessage(resumoAtual.id, texto)

    if (mensagem) {
      garantirDetalheInicial()
      if (solicitacaoDetalhe.value) {
        solicitacaoDetalhe.value = {
          ...solicitacaoDetalhe.value,
          ...(resumo ?? solicitacaoDetalhe.value),
          mensagens: [...solicitacaoDetalhe.value.mensagens, mensagem],
        }
      }
    }

    if (resumo) {
      upsertResumo(resumo)
      sincronizarResumoSelecionado(resumo.id)
    }

    mensagensErro.value = null
    toast.success('Mensagem enviada com sucesso.')
  } catch (error: any) {
    console.error('Erro ao enviar mensagem de suporte', error)
    const mensagemErro = error?.response?.data?.error || 'Não foi possível enviar a mensagem.'
    toast.error(mensagemErro)
  } finally {
    enviandoMensagem.value = false
  }
}

const enviarAnexos = async (arquivos: File[]) => {
  const resumoAtual = solicitacaoResumo.value
  if (!resumoAtual?.id) {
    toast.error('Nenhuma solicitação selecionada.')
    return
  }

  uploadAnexoEmAndamento.value = true
  try {
    const { mensagem, resumo } = await uploadSupportAttachments(resumoAtual.id, arquivos)

    if (mensagem) {
      garantirDetalheInicial()
      if (solicitacaoDetalhe.value) {
        solicitacaoDetalhe.value = {
          ...solicitacaoDetalhe.value,
          ...(resumo ?? solicitacaoDetalhe.value),
          mensagens: [...solicitacaoDetalhe.value.mensagens, mensagem],
        }
      }
    }

    if (resumo) {
      upsertResumo(resumo)
      sincronizarResumoSelecionado(resumo.id)
    }

    mensagensErro.value = null
    toast.success(arquivos.length > 1 ? 'Arquivos enviados com sucesso.' : 'Arquivo enviado com sucesso.')
  } catch (error: any) {
    console.error('Erro ao enviar anexos para suporte', error)
    const mensagemErro = error?.response?.data?.error || 'Não foi possível enviar o arquivo selecionado.'
    toast.error(mensagemErro)
  } finally {
    uploadAnexoEmAndamento.value = false
  }
}

const visualizarAnexo = async (anexo: SupportAttachment) => {
  if (!anexo?.id) {
    toast.error('Anexo inválido.')
    return
  }

  try {
    const { blob } = await downloadSupportAttachment(anexo.id)
    openBlobInNewTab(blob)
  } catch (error: any) {
    console.error('Erro ao abrir anexo de suporte', error)
    const mensagemErro = error?.response?.data?.error || 'Não foi possível visualizar o anexo selecionado.'
    toast.error(mensagemErro)
  }
}

onMounted(() => {
  carregarSolicitacoes()
})
</script>
