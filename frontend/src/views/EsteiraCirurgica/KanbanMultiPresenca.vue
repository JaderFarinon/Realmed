<template>
  <AdminLayout>
    <PageBreadcrumb :page-title="pageTitle" />

    <div class="flex h-[calc(100vh-180px)] flex-col overflow-hidden">
      <ComponentCard
        title="Kanban Multi-presença"
        class-name="mb-[15px] flex flex-1 flex-col overflow-hidden"
        body-class="flex flex-1 min-h-0 flex-col overflow-hidden"
        content-class="flex flex-1 min-h-0 flex-col gap-6 overflow-y-auto"
        style="max-width: calc(100vw - 400px);"
      >
        <div class="flex shrink-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="flex flex-col gap-4 md:flex-row md:items-end md:gap-6">
            <div class="flex flex-col md:w-72">
              <label
                for="tipoProcedimento"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Tipo de procedimento
              </label>
              <select
                id="tipoProcedimento"
                v-model="tipoSelecionadoId"
                :disabled="carregandoTipos || !tipos.length"
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option v-if="carregandoTipos" value="" disabled>Carregando tipos...</option>
                <option v-else-if="!tipos.length" value="" disabled>Nenhum tipo cadastrado</option>
                <option v-for="tipo in tipos" :key="tipo.id" :value="tipo.id">
                  {{ tipo.nome }}
                </option>
              </select>
            </div>

            <div class="flex flex-col md:w-72">
              <label
                for="cirurgiaFiltro"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Cirurgia
              </label>
              <select
                id="cirurgiaFiltro"
                v-model="cirurgiaFiltroSelecionadaId"
                :disabled="carregandoKanban"
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Todas as cirurgias</option>
                <option
                  v-for="cirurgia in cirurgiasDisponiveis"
                  :key="`cirurgia-opcao-${cirurgia.id}`"
                  :value="cirurgia.id"
                >
                  {{ cirurgia.label }}
                </option>
              </select>
            </div>

            <div class="flex flex-col md:w-60">
              <label
                for="statusCard"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Status do card
              </label>
              <select
                id="statusCard"
                v-model="statusFiltroSelecionado"
                :disabled="carregandoKanban"
                class="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option
                  v-for="opcao in STATUS_FILTER_OPTIONS"
                  :key="`status-opcao-${opcao.value || 'todos'}`"
                  :value="opcao.value"
                >
                  {{ opcao.label }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-2 pt-2 md:pt-0">
              <input
                id="mostrarTarefasConcluidas"
                v-model="mostrarTarefasConcluidas"
                type="checkbox"
                :disabled="carregandoKanban"
                class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900"
              />
              <label
                for="mostrarTarefasConcluidas"
                class="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Mostrar tarefas concluídas
              </label>
            </div>

            <div class="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                :start-icon="RefreshIcon"
                :disabled="carregandoKanban || !tipoSelecionadoId"
                @click="handleRefresh"
              >
                Atualizar
              </Button>
              <span
                v-if="tipoSelecionado"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ tipoSelecionado.nome }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div
            v-if="carregandoKanban"
            class="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 py-16 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
          >
            Carregando Kanban...
          </div>

          <div
            v-else-if="erro"
            class="flex flex-1 flex-col justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-500/10 dark:text-red-300"
          >
            <div>
              <p class="font-medium">Não foi possível carregar o Kanban.</p>
              <p class="mt-1">{{ erro }}</p>
            </div>
            <div>
              <Button
                size="sm"
                variant="outline"
                :start-icon="RefreshIcon"
                @click="handleRefresh"
              >
                Tentar novamente
              </Button>
            </div>
          </div>

          <div
            v-else-if="!etapasOrdenadas.length"
            class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
          >
            Nenhuma etapa encontrada para o tipo selecionado.
          </div>

          <div v-else class="flex flex-1 min-h-0">
            <div class="flex flex-1 min-h-0 overflow-x-auto">
              <div class="flex h-full min-w-max gap-5 pr-1">
                <section
                  v-for="etapa in etapasOrdenadas"
                  :key="etapa.id"
                  class="flex h-full w-72 min-w-[18rem] flex-shrink-0 flex-col rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm transition hover:border-brand-200/80 dark:border-gray-800 dark:bg-gray-900/60"
                >
                <header class="border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-100">
                        {{ etapa.nome }}
                      </h3>
                      <p
                        class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                      >
                        <template v-if="etapa.especial === 'CONCLUIDO'">
                          Atualizada automaticamente
                        </template>
                        <template v-else>
                          Etapa dinâmica
                        </template>
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ etapa.total ?? etapa.solicitacoes.length }}
                        {{ (etapa.total ?? etapa.solicitacoes.length) === 1 ? 'solicitação' : 'solicitações' }}
                      </p>
                    </div>
                  </div>
                </header>

                <div class="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                  <article
                    v-for="card in etapa.solicitacoes"
                    :key="`${etapa.id}-${card.id}`"
                    class="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm transition hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900"
                    role="button"
                    tabindex="0"
                    @click="abrirDetalhesDoCard(card)"
                    @keydown.enter.prevent="abrirDetalhesDoCard(card)"
                    @keydown.space.prevent="abrirDetalhesDoCard(card)"
                  >
                    <div class="flex items-start gap-3">
                      <div class="flex-1">
                        <h4 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {{ descricaoPacienteCard(card) }}
                        </h4>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {{ formatarDataCurta(card.dataCirurgia) }}
                        </p>
                        <div
                          v-if="!cardEstaExpandido(card)"
                          class="mt-2 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          <span
                            class="h-2.5 w-2.5 rounded-full"
                            :class="statusDotClass(card.status)"
                          ></span>
                          <span
                            :class="[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                              statusBadgeClass(card.status),
                            ]"
                          >
                            {{ statusLabel(card.status) }}
                          </span>
                          <button
                            v-if="cardPossuiResponsavelVisivel(card)"
                            type="button"
                            class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 transition hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
                            title="Alterar responsável"
                            @click.stop="abrirModalSelecaoResponsavel(card)"
                          >
                            <span aria-hidden="true">•</span>
                            <span>{{ card.responsavelPrimeiroNome }}</span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-brand-200 hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-400"
                        :aria-expanded="cardEstaExpandido(card)"
                        :aria-label="cardEstaExpandido(card) ? 'Recolher informações' : 'Expandir informações'"
                        @click.stop="alternarCard(card)"
                      >
                        <ChevronDownIcon
                          class="h-4 w-4 transition-transform"
                          :class="{ 'rotate-180': cardEstaExpandido(card) }"
                        />
                      </button>
                    </div>

                    <div v-if="cardEstaExpandido(card)" class="mt-3 space-y-3">
                      <div class="flex items-center justify-between gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span class="inline-flex items-center gap-2">
                          <span
                            class="h-2.5 w-2.5 rounded-full"
                            :class="statusDotClass(card.status)"
                          ></span>
                          <span
                            :class="[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                              statusBadgeClass(card.status),
                            ]"
                          >
                            {{ statusLabel(card.status) }}
                          </span>
                          <button
                            v-if="cardPossuiResponsavelVisivel(card)"
                            type="button"
                            class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600 transition hover:text-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
                            title="Alterar responsável"
                            @click.stop="abrirModalSelecaoResponsavel(card)"
                          >
                            <span aria-hidden="true">•</span>
                            <span>{{ card.responsavelPrimeiroNome }}</span>
                          </button>
                        </span>
                        <span
                          v-if="card.prioridade"
                          class="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
                        >
                          {{ card.prioridade }}
                        </span>
                      </div>

                      <dl class="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <div v-if="card.numeroLiberacao">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Liberação</dt>
                          <dd>{{ card.numeroLiberacao }}</dd>
                        </div>
                        <div v-if="card.medico">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Médico</dt>
                          <dd>{{ card.medico }}</dd>
                        </div>
                        <div v-if="card.convenio">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Convênio</dt>
                          <dd>{{ card.convenio }}</dd>
                        </div>
                        <div v-if="cardPossuiResponsavelVisivel(card) && card.responsavel?.nome">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Responsável</dt>
                          <dd>
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 underline-offset-2 transition hover:text-brand-500 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-brand-300 dark:hover:text-brand-200"
                              title="Alterar responsável"
                              @click.stop="abrirModalSelecaoResponsavel(card)"
                            >
                              {{ card.responsavel.nome }}
                            </button>
                          </dd>
                        </div>
                        <div v-if="card.dataCirurgia">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Cirurgia</dt>
                          <dd>{{ formatarData(card.dataCirurgia) }}</dd>
                        </div>
                        <div v-if="procedimentosDoCard(card).length">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Procedimentos</dt>
                          <dd>{{ procedimentosDoCard(card).join(', ') }}</dd>
                        </div>
                        <div v-if="card.ultimaAtualizacao">
                          <dt class="font-medium text-gray-600 dark:text-gray-300">Atualizado em</dt>
                          <dd>{{ formatarData(card.ultimaAtualizacao) }}</dd>
                        </div>
                      </dl>

                      <div
                        v-if="card.permiteMovimentacao !== false"
                        class="space-y-2"
                        @click.stop
                      >
                        <label
                          class="text-xs font-medium text-gray-600 dark:text-gray-300"
                          :for="`etapa-card-${card.id}`"
                          @click.stop
                        >
                          Mudar status
                        </label>
                        <select
                          :id="`etapa-card-${card.id}`"
                          v-model="destinosSelecionados[String(card.id)]"
                          class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          @click.stop
                          @change.stop
                        >
                          <option
                            v-for="opcao in STATUS_OPTIONS"
                            :key="`destino-${card.id}-${opcao.value}`"
                            :value="opcao.value"
                            :disabled="
                              opcao.value === 'CONCLUIDO' ||
                              (opcao.value === 'ATRIBUIDO' && cardPossuiResponsavel(card))
                            "
                          >
                            {{ opcao.label }}
                          </option>
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          class-name="w-full justify-center text-xs"
                          :disabled="
                            atualizandoCards[String(card.id)] ||
                            destinosSelecionados[String(card.id)] === statusAtualDoCard(card)
                          "
                          @click.stop="moverSolicitacao(card)"
                        >
                          <template v-if="atualizandoCards[String(card.id)]">
                            Atualizando...
                          </template>
                          <template v-else>Aplicar</template>
                        </Button>
                      </div>
                      <p v-else :class="classeMensagemIndisponivel(card)">
                        <template v-if="statusAtualDoCard(card) === 'CONCLUIDO'">
                          Todas as etapas desta cirurgia foram concluídas.
                        </template>
                        <template v-else-if="statusAtualDoCard(card) === 'BLOQUEADA'">
                          Esta etapa está bloqueada aguardando a conclusão da tarefa dependente.
                          <template v-if="descricaoDependencia(card)">
                            <br />
                            Etapa dependente: {{ descricaoDependencia(card) }}
                          </template>
                        </template>
                        <template v-else>
                          Esta tarefa está indisponível para movimentação manual.
                        </template>
                      </p>
                    </div>
                    </article>

                    <p
                      v-if="!etapa.solicitacoes.length"
                      class="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500"
                    >
                      Nenhuma solicitação nesta etapa.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>

      <Modal
        v-if="modalPendenciaAberto"
        :fullScreenBackdrop="true"
        @close="cancelarModalPendencia"
      >
        <template #body>
          <div
            class="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 sm:p-8"
          >
            <button
              type="button"
              class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="cancelarModalPendencia"
              aria-label="Fechar registro de pendência"
            >
              ×
            </button>

            <header class="pr-10">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Registrar pendência
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Selecione o motivo da pendência
                <span v-if="etapaPendenciaNome">para a etapa {{ etapaPendenciaNome }}</span>
                <span v-else>para esta etapa</span>
                <template v-if="cardPendencia?.paciente">
                  da solicitação de {{ cardPendencia.paciente }}
                </template>
                .
              </p>
            </header>

            <section class="mt-6 space-y-5">
              <div class="space-y-2">
                <label
                  for="motivoPendenciaSelect"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Motivo da pendência
                </label>
                <div
                  v-if="carregandoMotivosPendencia"
                  class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300"
                >
                  Carregando motivos de pendência...
                </div>
                <div
                  v-else-if="!motivosPendenciaDisponiveis.length"
                  class="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  Nenhum motivo de pendência disponível para esta etapa.
                </div>
                <select
                  v-else
                  id="motivoPendenciaSelect"
                  v-model.number="motivoPendenciaSelecionadoId"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option
                    v-for="motivo in motivosPendenciaDisponiveis"
                    :key="`motivo-${motivo.id}`"
                    :value="motivo.id"
                  >
                    {{ motivo.descricao }}
                  </option>
                </select>
              </div>

              <div class="space-y-2">
                <label
                  for="descricaoPendencia"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Descrição (opcional)
                </label>
                <textarea
                  id="descricaoPendencia"
                  v-model="pendenciaDescricao"
                  rows="4"
                  class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  placeholder="Descreva detalhes adicionais, se necessário"
                ></textarea>
                <p class="text-xs text-gray-400 dark:text-gray-500">Campo opcional.</p>
              </div>
            </section>

            <footer class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                class-name="w-full justify-center sm:w-auto"
                @click="cancelarModalPendencia"
              >
                Cancelar
              </Button>
              <Button
                class-name="w-full justify-center sm:w-auto"
                :disabled="
                  carregandoMotivosPendencia ||
                  !motivoPendenciaSelecionadoId ||
                  !motivosPendenciaDisponiveis.length
                "
                @click="confirmarPendencia"
              >
                Registrar pendência
              </Button>
            </footer>
          </div>
        </template>
      </Modal>
      <Modal
        v-if="modalResponsavelAberto"
        :fullScreenBackdrop="true"
        @close="cancelarSelecaoResponsavel"
      >
        <template #body>
          <div
            class="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 sm:p-8"
          >
            <button
              type="button"
              class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="cancelarSelecaoResponsavel"
              aria-label="Fechar seleção de responsável"
            >
              ×
            </button>

            <header class="pr-10">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Selecionar responsável
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Escolha o usuário responsável para esta etapa
                <template v-if="cardResponsavelEdicao?.paciente">
                  da solicitação de {{ cardResponsavelEdicao.paciente }}
                </template>
                .
              </p>
            </header>

            <section class="mt-6 space-y-5">
              <div class="space-y-2">
                <label
                  for="responsavelSelect"
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Usuário responsável
                </label>
                <div
                  v-if="carregandoUsuariosResponsaveis && !usuariosResponsaveis.length"
                  class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300"
                >
                  Carregando usuários...
                </div>
                <div
                  v-else-if="responsavelSelecaoCarregarErro && !usuariosResponsaveis.length"
                  class="space-y-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  <p>{{ responsavelSelecaoCarregarErro }}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    class-name="w-full justify-center"
                    :disabled="carregandoUsuariosResponsaveis"
                    @click="tentarNovamenteCarregarUsuarios"
                  >
                    Tentar novamente
                  </Button>
                </div>
                <div v-else class="space-y-2">
                  <select
                    v-if="usuariosResponsaveis.length"
                    id="responsavelSelect"
                    :value="responsavelSelectValor"
                    class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    @change="handleResponsavelSelectChange"
                  >
                    <option value="" disabled>Selecione um usuário</option>
                    <option
                      v-for="usuario in usuariosResponsaveis"
                      :key="`responsavel-${usuario.id}`"
                      :value="String(usuario.id)"
                    >
                      {{ usuario.nome }}
                    </option>
                  </select>
                  <div
                    v-else
                    class="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    Nenhum usuário disponível para atribuição.
                  </div>
                  <p
                    v-if="responsavelSelecaoCarregarErro"
                    class="text-xs text-amber-600 dark:text-amber-300"
                  >
                    {{ responsavelSelecaoCarregarErro }}
                  </p>
                </div>
                <p
                  v-if="responsavelValidacaoErro"
                  class="text-xs text-red-600 dark:text-red-400"
                >
                  {{ responsavelValidacaoErro }}
                </p>
              </div>
            </section>

            <footer class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                class-name="w-full justify-center sm:w-auto"
                :disabled="salvandoResponsavel"
                @click="cancelarSelecaoResponsavel"
              >
                Cancelar
              </Button>
              <Button
                v-if="podeRemoverResponsavel"
                variant="outline"
                class-name="w-full justify-center text-red-600 ring-inset ring-red-200 hover:bg-red-50 focus-visible:ring-2 dark:text-red-300 dark:ring-red-500/60 dark:hover:bg-red-500/10 sm:w-auto"
                :disabled="salvandoResponsavel"
                @click="removerResponsavelSelecionado"
              >
                Remover atribuição
              </Button>
              <Button
                class-name="w-full justify-center sm:w-auto"
                :disabled="
                  salvandoResponsavel ||
                  carregandoUsuariosResponsaveis ||
                  (responsavelSelecionadoId === null && !usuariosResponsaveis.length)
                "
                @click="confirmarSelecaoResponsavel"
              >
                <template v-if="salvandoResponsavel">Salvando...</template>
                <template v-else>Confirmar</template>
              </Button>
            </footer>
          </div>
        </template>
      </Modal>
      <Modal
        v-if="modalAtribuicaoCirurgiaAberto"
        :fullScreenBackdrop="true"
        @close="cancelarModalAtribuicaoCirurgia"
      >
        <template #body>
          <div
            class="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 sm:p-8"
          >
            <button
              type="button"
              class="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              :disabled="atribuirCirurgiaCarregando"
              @click="cancelarModalAtribuicaoCirurgia"
              aria-label="Fechar confirmação de atribuição"
            >
              ×
            </button>

            <header class="pr-10">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Atribuir responsável para toda a cirurgia?
              </h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Você pode aplicar o mesmo responsável às demais etapas desta cirurgia.
              </p>
            </header>

            <section class="mt-6 space-y-4">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Deseja atribuir
                <strong class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ modalAtribuicaoCirurgiaUsuarioLabel }}
                </strong>
                a todas as etapas da cirurgia
                <template v-if="modalAtribuicaoCirurgiaDescricaoCirurgia">
                  <strong class="font-semibold text-gray-900 dark:text-gray-100">
                    {{ modalAtribuicaoCirurgiaDescricaoCirurgia }}
                  </strong>
                </template>
                <template v-else>selecionada</template>
                ?
              </p>
              <p
                v-if="modalAtribuicaoCirurgiaResumoQuantidade"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ modalAtribuicaoCirurgiaResumoQuantidade }}
              </p>
              <p
                v-if="modalAtribuicaoCirurgiaResumoSubstituicao"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ modalAtribuicaoCirurgiaResumoSubstituicao }}
              </p>
            </section>

            <footer class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                class-name="w-full justify-center sm:w-auto"
                :disabled="atribuirCirurgiaCarregando"
                @click="confirmarAtribuicaoSomenteAtual"
              >
                <template v-if="atribuirCirurgiaCarregando">Processando...</template>
                <template v-else>Não, apenas esta tarefa</template>
              </Button>
              <Button
                class-name="w-full justify-center sm:w-auto"
                :disabled="atribuirCirurgiaCarregando"
                @click="confirmarAtribuicaoParaTodaCirurgia"
              >
                <template v-if="atribuirCirurgiaCarregando">Atribuindo...</template>
                <template v-else>Sim, atribuir para todas</template>
              </Button>
            </footer>
          </div>
        </template>
      </Modal>
      <TaskDetailsModal
        v-if="cardDetalhesAberto"
        :card="cardDetalhesAberto"
        :detalhes="detalhesDoCardSelecionado"
        :anexos="anexosDoCard"
        :carregando-anexos="carregandoAnexos"
        :anexos-erro="anexosErro"
        :upload-anexo-em-andamento="uploadAnexoEmAndamento"
        :marcando-conclusao="marcandoConclusao"
        :esta-concluido="cardDetalhesEstaConcluido"
        :chat-mensagens="chatMensagens"
        :carregando-chat-mensagens="carregandoChatMensagens"
        :chat-mensagens-erro="chatMensagensErro"
        :enviando-chat-mensagem="enviandoChatMensagem"
        :upload-chat-anexo-em-andamento="uploadChatAnexoEmAndamento"
        :permite-vencimentos="etapaPermiteVencimentos"
        :vencimentos="vencimentos"
        :carregando-vencimentos="carregandoVencimentos"
        :vencimentos-erro="vencimentosErro"
        :enviando-vencimento="enviandoVencimento"
        :descricao-paciente-card="descricaoPacienteCard"
        :formatar-data="formatarData"
        :status-dot-class="statusDotClass"
        :status-badge-class="statusBadgeClass"
        :status-label="statusLabel"
        :formatar-tamanho-arquivo="formatarTamanhoArquivo"
        @close="fecharDetalhesDoCard"
        @upload="enviarAnexo"
        @download-anexo="downloadAnexo"
        @concluir="marcarCardComoConcluido"
        @carregar-chat="carregarChatMensagens"
        @enviar-chat-mensagem="enviarMensagemChat"
        @enviar-chat-anexo="enviarChatAnexo"
        @download-chat-anexo="downloadChatAnexo"
        @carregar-vencimentos="() => carregarVencimentosDoCard(cardDetalhesAberto)"
        @criar-vencimento="criarVencimento"
      />
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import TaskDetailsModal from '@/components/kanban/TaskDetailsModal.vue'
import api from '@/plugins/axios'
import { RefreshIcon, ChevronDownIcon } from '@/icons'
import { openBlobInNewTab } from '@/utils/files'
import { useToast } from '@/composables/useToast'

type CardIdentifier = string

interface ProcedimentoTipo {
  id: number
  nome: string
  ativo?: boolean
}

export interface KanbanCard {
  id: CardIdentifier
  originalId: number | string | null
  cirurgiaId?: number | string | null
  etapaId?: number
  dependencia?: { id: number | null; nome: string | null } | null
  status?: string
  statusChave?: string | null
  procedimentoTipoId?: number | null
  paciente?: string
  numeroLiberacao?: string
  medico?: string
  dataCirurgia?: string
  convenio?: string
  prioridade?: string
  ultimaAtualizacao?: string
  permiteMovimentacao?: boolean
  tipo?: string
  solicitaDataLimite?: boolean
  responsavel?: { id: number; nome: string | null } | null
  responsavelPrimeiroNome?: string | null
  raw?: Record<string, unknown>
}

interface KanbanStage {
  id: number
  nome: string
  ordem?: number
  total?: number
  especial?: string
  solicitacoes: KanbanCard[]
  procedimentoTipoIds?: number[] | null
}

interface MotivoPendenciaOption {
  id: number
  descricao: string
  ativo: boolean
  etapaIds: number[]
}

export interface KanbanAnexo {
  id: number
  nomeOriginal: string | null
  mimeType: string | null
  tamanhoBytes: number | null
  criadoEm: string | null
  criadoPor: { id: number | null; nome: string | null } | null
}

export interface KanbanChatAnexo {
  id: number
  nomeOriginal: string | null
  mimeType: string | null
  tamanhoBytes: number | null
  criadoEm: string | null
}

export interface KanbanChatMensagem {
  id: number
  conteudo: string
  criadoEm: string | null
  autor: { id: number | null; nome: string | null } | null
  anexos: KanbanChatAnexo[]
}

export interface KanbanVencimento {
  id: number
  descricao: string | null
  dataLimite: string | null
  criadoEm: string | null
  criadoPor: { id: number | null; nome: string | null } | null
}

interface UsuarioResponsavel {
  id: number
  nome: string
  primeiroNome: string | null
}

interface AtualizarStatusOpcoes {
  mostrarToastSucesso?: boolean
  mostrarToastErro?: boolean
  recarregarKanban?: boolean
}

interface AvaliacaoAtribuicaoCirurgia {
  outrosParaAtualizar: KanbanCard[]
}

const KANBAN_ENDPOINT = '/esteira-procedimentos/kanban'

const route = useRoute()
const toast = useToast()

const tipos = ref<ProcedimentoTipo[]>([])
const tipoSelecionadoId = ref<number | null>(null)
const cirurgiaFiltroSelecionadaId = ref('')
const carregandoTipos = ref(false)
const carregandoKanban = ref(false)
const erro = ref<string | null>(null)
const etapas = ref<KanbanStage[]>([])
const destinosSelecionados = ref<Record<CardIdentifier, string>>({})
const atualizandoCards = ref<Record<CardIdentifier, boolean>>({})
const cardsExpandidos = ref<Record<CardIdentifier, boolean>>({})
const cardDetalhesAberto = ref<KanbanCard | null>(null)
const anexosDoCard = ref<KanbanAnexo[]>([])
const carregandoAnexos = ref(false)
const anexosErro = ref<string | null>(null)
const uploadAnexoEmAndamento = ref(false)
const marcandoConclusao = ref(false)
const chatMensagens = ref<KanbanChatMensagem[]>([])
const carregandoChatMensagens = ref(false)
const chatMensagensErro = ref<string | null>(null)
const enviandoChatMensagem = ref(false)
const uploadChatAnexoEmAndamento = ref(false)
const chatCarregadoParaCardId = ref<number | null>(null)
const vencimentos = ref<KanbanVencimento[]>([])
const carregandoVencimentos = ref(false)
const vencimentosErro = ref<string | null>(null)
const enviandoVencimento = ref(false)
const vencimentosCarregadosParaCardId = ref<number | null>(null)
const modalPendenciaAberto = ref(false)
const cardPendencia = ref<KanbanCard | null>(null)
const statusPendenciaDestino = ref<string | null>(null)
const pendenciaDescricao = ref('')
const motivoPendenciaSelecionadoId = ref<number | null>(null)
const motivosPendenciaLista = ref<MotivoPendenciaOption[]>([])
const motivosPendenciaCarregados = ref(false)
const carregandoMotivosPendencia = ref(false)
const usuariosResponsaveis = ref<UsuarioResponsavel[]>([])
const usuariosResponsaveisCarregados = ref(false)
const carregandoUsuariosResponsaveis = ref(false)
const responsavelSelecaoCarregarErro = ref<string | null>(null)
const modalResponsavelAberto = ref(false)
const cardResponsavelEdicao = ref<KanbanCard | null>(null)
const responsavelSelecionadoId = ref<number | null>(null)
const responsavelSelecaoReverterStatus = ref(false)
const responsavelSelecaoStatusAnterior = ref<string | null>(null)
const responsavelSelecaoDestinoPosterior = ref<string | null>(null)
const responsavelSelecaoPendenciaResponsavelId = ref<number | null>(null)
const salvandoResponsavel = ref(false)
const responsavelValidacaoErro = ref<string | null>(null)
const modalAtribuicaoCirurgiaAberto = ref(false)
const modalAtribuicaoCirurgiaCards = ref<KanbanCard[]>([])
const modalAtribuicaoCirurgiaCardOrigem = ref<KanbanCard | null>(null)
const modalAtribuicaoCirurgiaDestino = ref<string | null>(null)
const modalAtribuicaoCirurgiaResponsavelId = ref<number | null>(null)
const modalAtribuicaoCirurgiaUsuarioNome = ref<string | null>(null)
const atribuirCirurgiaCarregando = ref(false)
const statusFiltroSelecionado = ref('')
const mostrarTarefasConcluidas = ref(true)
let requisicaoKanbanAtual = 0
let anexosRequisicaoAtual = 0
let chatMensagensRequisicaoAtual = 0
let vencimentosRequisicaoAtual = 0

const pageTitle = computed(() => (route.meta.title as string) || 'Kanban Multi-presença')

const tipoSelecionado = computed(() =>
  tipos.value.find((tipo) => tipo.id === tipoSelecionadoId.value) ?? null,
)

const etapaPermiteVencimentos = computed(() =>
  Boolean(cardDetalhesAberto.value?.solicitaDataLimite),
)

const cardEstaExpandido = (card: KanbanCard) =>
  Boolean(cardsExpandidos.value[String(card.id)])

const descricaoDependencia = (card: KanbanCard) => {
  const dependencia = card.dependencia

  if (!dependencia) {
    return null
  }

  if (dependencia.nome) {
    return dependencia.nome
  }

  const id = dependencia.id
  if (id) {
    const etapa = etapas.value.find((item) => item.id === id)
    if (etapa?.nome) {
      return etapa.nome
    }
    return `Etapa ${id}`
  }

  return null
}

const cardPossuiResponsavel = (card: KanbanCard) => {
  const status = statusAtualDoCard(card)
  return status !== 'PENDENTE' && Boolean(card.responsavel?.id)
}

const cardPossuiResponsavelVisivel = (card: KanbanCard) =>
  cardPossuiResponsavel(card) && Boolean(card.responsavelPrimeiroNome)

const formatarIdSolicitacao = (
  valor: KanbanCard['originalId'] | KanbanCard['cirurgiaId'] | undefined,
) => {
  if (valor === null || valor === undefined) {
    return null
  }

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      return null
    }

    return String(Math.trunc(valor))
  }

  const texto = String(valor).trim()
  return texto ? texto : null
}

const descricaoPacienteCard = (card: KanbanCard | null | undefined) => {
  const nome = card?.paciente ?? 'Paciente não informado'
  const id = formatarIdSolicitacao(card?.cirurgiaId ?? undefined)

  if (!id) {
    return nome
  }

  return `${id} - ${nome}`
}

const modalAtribuicaoCirurgiaUsuarioLabel = computed(() => {
  const nome = modalAtribuicaoCirurgiaUsuarioNome.value?.trim()
  return nome ? nome : 'o usuário selecionado'
})

const modalAtribuicaoCirurgiaDescricaoCirurgia = computed(() =>
  descricaoPacienteCard(modalAtribuicaoCirurgiaCardOrigem.value),
)

const modalAtribuicaoCirurgiaQuantidade = computed(
  () => modalAtribuicaoCirurgiaCards.value.length,
)

const modalAtribuicaoCirurgiaOutrasQuantidade = computed(() =>
  Math.max(modalAtribuicaoCirurgiaCards.value.length - 1, 0),
)

const modalAtribuicaoCirurgiaResumoQuantidade = computed(() => {
  const outras = modalAtribuicaoCirurgiaOutrasQuantidade.value

  if (!modalAtribuicaoCirurgiaQuantidade.value) {
    return ''
  }

  if (!outras) {
    return 'Essa ação atualizará apenas a etapa selecionada.'
  }

  if (outras === 1) {
    return 'Essa ação atualizará a etapa selecionada e mais 1 etapa desta cirurgia.'
  }

  return `Essa ação atualizará a etapa selecionada e mais ${outras} etapas desta cirurgia.`
})

const modalAtribuicaoCirurgiaOutrosComResponsavelQuantidade = computed(() => {
  const origemId = modalAtribuicaoCirurgiaCardOrigem.value
    ? String(modalAtribuicaoCirurgiaCardOrigem.value.id)
    : null

  return modalAtribuicaoCirurgiaCards.value.reduce((total, card) => {
    const cardId = String(card.id)
    if (origemId && cardId === origemId) {
      return total
    }

    return total + (cardPossuiResponsavel(card) ? 1 : 0)
  }, 0)
})

const modalAtribuicaoCirurgiaResumoSubstituicao = computed(() => {
  const quantidade = modalAtribuicaoCirurgiaOutrosComResponsavelQuantidade.value

  if (!quantidade) {
    return ''
  }

  if (quantidade === 1) {
    return 'Essa ação substituirá o responsável de 1 etapa.'
  }

  return `Essa ação substituirá o responsável de ${quantidade} etapas.`
})

const cirurgiasResumo = computed(() => {
  const mapa = new Map<string, { pendentes: number; concluidos: number }>()

  etapas.value.forEach((etapa) => {
    if (etapa.especial === 'CONCLUIDO') {
      return
    }

    etapa.solicitacoes.forEach((card) => {
      const cirurgiaId = formatarIdSolicitacao(card.cirurgiaId ?? undefined)
      if (!cirurgiaId) {
        return
      }

      const status = statusAtualDoCard(card)
      const resumo = mapa.get(cirurgiaId) ?? { pendentes: 0, concluidos: 0 }

      if (status === 'CONCLUIDO') {
        resumo.concluidos += 1
      } else {
        resumo.pendentes += 1
      }

      mapa.set(cirurgiaId, resumo)
    })
  })

  return mapa
})

const cirurgiasComPendencias = computed(() => {
  const pendentes = new Set<string>()

  etapas.value.forEach((etapa) => {
    if (etapa.especial === 'CONCLUIDO') {
      return
    }

    etapa.solicitacoes.forEach((card) => {
      const cirurgiaId = formatarIdSolicitacao(card.cirurgiaId ?? undefined)
      if (!cirurgiaId) {
        return
      }

      const status = statusAtualDoCard(card)
      if (status !== 'CONCLUIDO') {
        pendentes.add(cirurgiaId)
      }
    })
  })

  return pendentes
})

const cirurgiasDisponiveis = computed(() => {
  const mapa = new Map<string, { id: string; label: string }>()

  const pendentes = cirurgiasComPendencias.value
  const resumoCirurgias = cirurgiasResumo.value

  etapas.value.forEach((etapa) => {
    if (etapa.especial === 'CONCLUIDO') {
      return
    }

    etapa.solicitacoes.forEach((card) => {
      const cirurgiaId = formatarIdSolicitacao(card.cirurgiaId ?? undefined)
      if (!cirurgiaId || mapa.has(cirurgiaId)) {
        return
      }

      const status = statusAtualDoCard(card)
      if (status === 'CONCLUIDO') {
        const resumo = resumoCirurgias.get(cirurgiaId)
        if (!resumo || resumo.pendentes === 0) {
          return
        }
      }

      mapa.set(cirurgiaId, {
        id: cirurgiaId,
        label: descricaoPacienteCard(card),
      })
    })
  })

  return Array.from(mapa.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
})

const obterCardsDaMesmaCirurgia = (card: KanbanCard | null | undefined) => {
  if (!card) {
    return [] as KanbanCard[]
  }

  const cirurgiaId = formatarIdSolicitacao(card.cirurgiaId ?? undefined)
  if (!cirurgiaId) {
    return [] as KanbanCard[]
  }

  const relacionados: KanbanCard[] = []

  etapas.value.forEach((etapa) => {
    etapa.solicitacoes.forEach((item) => {
      if (formatarIdSolicitacao(item.cirurgiaId ?? undefined) === cirurgiaId) {
        relacionados.push(item)
      }
    })
  })

  return relacionados
}

const avaliarOfertaAtribuicaoCirurgia = (
  card: KanbanCard | null,
  destino: string,
): AvaliacaoAtribuicaoCirurgia | null => {
  if (!card) {
    return null
  }

  if (destino !== 'ATRIBUIDO') {
    return null
  }

  const cardsRelacionados = obterCardsDaMesmaCirurgia(card)
  if (!cardsRelacionados.length) {
    return null
  }

  const cardId = String(card.id)
  const outros = cardsRelacionados.filter((item) => String(item.id) !== cardId)
  if (!outros.length) {
    return null
  }

  const outrosParaAtualizar = outros.filter(
    (item) => statusAtualDoCard(item) !== 'CONCLUIDO',
  )
  if (!outrosParaAtualizar.length) {
    return null
  }

  return {
    outrosParaAtualizar,
  }
}

const alternarCard = (card: KanbanCard) => {
  const chave = String(card.id)
  const atual = { ...cardsExpandidos.value }

  if (atual[chave]) {
    delete atual[chave]
  } else {
    atual[chave] = true
  }

  cardsExpandidos.value = atual
}

const abrirDetalhesDoCard = (card: KanbanCard) => {
  cardDetalhesAberto.value = card
}

const fecharDetalhesDoCard = () => {
  cardDetalhesAberto.value = null
}

const detalhesDoCardSelecionado = computed(() => {
  const card = cardDetalhesAberto.value
  if (!card) {
    return [] as { label: string; valor: string }[]
  }

  const detalhes: { label: string; valor: string }[] = []
  const statusAtual = statusAtualDoCard(card)

  detalhes.push({
    label: 'Paciente',
    valor: card.paciente ?? 'Paciente não informado',
  })

  if (card.numeroLiberacao) {
    detalhes.push({ label: 'Liberação', valor: card.numeroLiberacao })
  }

  if (card.medico) {
    detalhes.push({ label: 'Médico', valor: card.medico })
  }

  if (card.convenio) {
    detalhes.push({ label: 'Convênio', valor: card.convenio })
  }

  if (statusAtual !== 'PENDENTE' && card.responsavel?.nome) {
    detalhes.push({ label: 'Responsável', valor: card.responsavel.nome })
  }

  if (card.dataCirurgia) {
    detalhes.push({ label: 'Data da cirurgia', valor: formatarData(card.dataCirurgia) })
  }

  if (card.ultimaAtualizacao) {
    detalhes.push({ label: 'Última atualização', valor: formatarData(card.ultimaAtualizacao) })
  }

  const procedimentos = procedimentosDoCard(card)
  if (procedimentos.length) {
    detalhes.push({ label: 'Procedimentos', valor: procedimentos.join(', ') })
  }

  if (card.tipo) {
    detalhes.push({ label: 'Tipo', valor: card.tipo })
  }

  if (card.permiteMovimentacao === false) {
    detalhes.push({ label: 'Movimentação', valor: 'Movimentação não permitida' })
  }

  return detalhes
})

const cardDetalhesEstaConcluido = computed(() => {
  const card = cardDetalhesAberto.value
  if (!card) {
    return false
  }

  return statusAtualDoCard(card) === 'CONCLUIDO'
})

const normalizarAnexoResposta = (entrada: any): KanbanAnexo | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const bruto = entrada as Record<string, any>
  const candidatoId =
    bruto.id ?? bruto.ID ?? bruto.anexoId ?? bruto.anexo_id ?? bruto.solicitacao_anexo_id
  const idNumero = Number(candidatoId)

  if (!Number.isFinite(idNumero) || idNumero <= 0) {
    return null
  }

  const nomeOriginal =
    typeof bruto.nomeOriginal === 'string'
      ? bruto.nomeOriginal
      : typeof bruto.nome_original === 'string'
        ? bruto.nome_original
        : null

  const mimeType =
    typeof bruto.mimeType === 'string'
      ? bruto.mimeType
      : typeof bruto.mime_type === 'string'
        ? bruto.mime_type
        : null

  const tamanhoEntrada =
    bruto.tamanhoBytes ?? bruto.tamanho_bytes ?? bruto.tamanho ?? bruto.size ?? null
  const tamanhoNumero = Number(tamanhoEntrada)
  const tamanhoBytes =
    Number.isFinite(tamanhoNumero) && tamanhoNumero >= 0 ? Math.trunc(tamanhoNumero) : null

  const criadoEmEntrada =
    bruto.criadoEm ??
    bruto.criado_em ??
    bruto.createdAt ??
    bruto.created_at ??
    bruto.data_criacao ??
    null
  let criadoEm: string | null = null
  if (typeof criadoEmEntrada === 'string') {
    criadoEm = criadoEmEntrada
  } else if (criadoEmEntrada instanceof Date) {
    criadoEm = criadoEmEntrada.toISOString()
  } else if (typeof criadoEmEntrada === 'number') {
    const data = new Date(criadoEmEntrada)
    criadoEm = Number.isNaN(data.getTime()) ? null : data.toISOString()
  }

  let criadoPor: { id: number | null; nome: string | null } | null = null
  const criadoPorEntrada =
    bruto.criadoPor ?? bruto.usuario ?? bruto.usuario_criacao ?? bruto.created_by ?? null

  if (criadoPorEntrada && typeof criadoPorEntrada === 'object') {
    const candidatoUsuarioId =
      (criadoPorEntrada as any).id ??
      (criadoPorEntrada as any).usuario_id ??
      (criadoPorEntrada as any).created_by ??
      null
    const usuarioIdNumero = Number(candidatoUsuarioId)
    const usuarioNome =
      typeof (criadoPorEntrada as any).nome === 'string'
        ? (criadoPorEntrada as any).nome
        : typeof (criadoPorEntrada as any).nome_completo === 'string'
          ? (criadoPorEntrada as any).nome_completo
          : typeof (criadoPorEntrada as any).full_name === 'string'
            ? (criadoPorEntrada as any).full_name
            : typeof (criadoPorEntrada as any).usuario === 'string'
              ? (criadoPorEntrada as any).usuario
              : null

    criadoPor = {
      id: Number.isFinite(usuarioIdNumero) ? Math.trunc(usuarioIdNumero) : null,
      nome: usuarioNome,
    }
  } else if (Number.isFinite(Number(criadoPorEntrada))) {
    const usuarioIdNumero = Number(criadoPorEntrada)
    criadoPor = {
      id: Number.isFinite(usuarioIdNumero) ? Math.trunc(usuarioIdNumero) : null,
      nome:
        typeof bruto.created_by_nome === 'string'
          ? bruto.created_by_nome
          : typeof bruto.usuario_nome === 'string'
            ? bruto.usuario_nome
            : null,
    }
  }

  return {
    id: Math.trunc(idNumero),
    nomeOriginal,
    mimeType,
    tamanhoBytes,
    criadoEm,
    criadoPor,
  }
}

const normalizarVencimentoResposta = (entrada: any): KanbanVencimento | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const bruto = entrada as Record<string, any>
  const candidatoId = bruto.id ?? bruto.vencimento_id ?? bruto.vencimentoId
  const idNumero = Number(candidatoId)

  if (!Number.isFinite(idNumero) || idNumero <= 0) {
    return null
  }

  const descricao = typeof bruto.descricao === 'string' ? bruto.descricao : null
  const dataLimite =
    typeof bruto.dataLimite === 'string'
      ? bruto.dataLimite
      : typeof bruto.data_limite === 'string'
        ? bruto.data_limite
        : null

  const criadoEm =
    typeof bruto.criadoEm === 'string'
      ? bruto.criadoEm
      : typeof bruto.created_at === 'string'
        ? bruto.created_at
        : typeof bruto.createdAt === 'string'
          ? bruto.createdAt
          : null

  const criadoPorFonte = bruto.criadoPor ?? bruto.created_by ?? bruto.createdBy
  let criadoPor: KanbanVencimento['criadoPor'] = null

  if (criadoPorFonte && typeof criadoPorFonte === 'object') {
    const idBruto =
      (criadoPorFonte as any).id ?? (criadoPorFonte as any).usuarioId ?? (criadoPorFonte as any).usuario_id
    const idAutor = Number(idBruto)
    const nomeAutor =
      typeof (criadoPorFonte as any).nome === 'string'
        ? (criadoPorFonte as any).nome
        : typeof (criadoPorFonte as any).full_name === 'string'
          ? (criadoPorFonte as any).full_name
          : null

    criadoPor = Number.isFinite(idAutor)
      ? { id: Math.trunc(idAutor), nome: nomeAutor || null }
      : null
  } else {
    const idAutor = Number(criadoPorFonte)
    const nomeAutor =
      typeof bruto.created_by_nome === 'string'
        ? bruto.created_by_nome
        : typeof bruto.criado_por_nome === 'string'
          ? bruto.criado_por_nome
          : null

    if (Number.isFinite(idAutor)) {
      criadoPor = { id: Math.trunc(idAutor), nome: nomeAutor }
    }
  }

  return {
    id: Math.trunc(idNumero),
    descricao,
    dataLimite,
    criadoEm,
    criadoPor,
  }
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

const numeroInteiroOuNull = (valor: unknown): number | null => {
  const numero = typeof valor === 'number' ? valor : Number(valor)

  if (!Number.isFinite(numero)) {
    return null
  }

  return Math.trunc(numero)
}

const textoNaoVazioOuNull = (valor: unknown): string | null => {
  if (typeof valor !== 'string') {
    return null
  }

  const texto = valor.trim()
  return texto.length ? texto : null
}

const dataIsoOuNull = (valor: unknown): string | null => {
  if (typeof valor === 'string') {
    return valor
  }

  if (valor instanceof Date) {
    return valor.toISOString()
  }

  if (typeof valor === 'number') {
    const data = new Date(valor)
    return Number.isNaN(data.getTime()) ? null : data.toISOString()
  }

  return null
}

const normalizarChatAnexoResposta = (entrada: unknown): KanbanChatAnexo | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const bruto = entrada as Record<string, unknown>
  const id = numeroInteiroOuNull(
    bruto.id ??
      bruto.ID ??
      bruto.anexoId ??
      bruto.anexo_id ??
      bruto.chatAnexoId ??
      bruto.chat_anexo_id ??
      null,
  )

  if (!id || id <= 0) {
    return null
  }

  const nomeOriginal =
    textoNaoVazioOuNull(bruto.nomeOriginal) ??
    textoNaoVazioOuNull(bruto.nome) ??
    textoNaoVazioOuNull(bruto.filename) ??
    null

  const mimeType =
    textoNaoVazioOuNull(bruto.mimeType) ??
    textoNaoVazioOuNull(bruto.mime_type) ??
    textoNaoVazioOuNull(bruto.tipo) ??
    null

  const tamanhoBytes = numeroInteiroOuNull(
    bruto.tamanhoBytes ??
      bruto.tamanho_bytes ??
      bruto.tamanho ??
      bruto.size ??
      bruto.file_size ??
      null,
  )

  const criadoEm =
    dataIsoOuNull(bruto.criadoEm) ??
    dataIsoOuNull(bruto.criado_em) ??
    dataIsoOuNull(bruto.createdAt) ??
    dataIsoOuNull(bruto.created_at) ??
    dataIsoOuNull(bruto.data_criacao) ??
    null

  return {
    id,
    nomeOriginal,
    mimeType,
    tamanhoBytes,
    criadoEm,
  }
}

const normalizarChatMensagemResposta = (entrada: unknown): KanbanChatMensagem | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const bruto = entrada as Record<string, unknown>
  const id = numeroInteiroOuNull(
    bruto.id ??
      bruto.ID ??
      bruto.mensagemId ??
      bruto.mensagem_id ??
      bruto.chatMensagemId ??
      bruto.chat_mensagem_id ??
      null,
  )

  if (!id || id <= 0) {
    return null
  }

  const conteudo =
    textoNaoVazioOuNull(bruto.conteudo) ??
    textoNaoVazioOuNull(bruto.mensagem) ??
    textoNaoVazioOuNull(bruto.content) ??
    ''

  const criadoEm =
    dataIsoOuNull(bruto.criadoEm) ??
    dataIsoOuNull(bruto.criado_em) ??
    dataIsoOuNull(bruto.createdAt) ??
    dataIsoOuNull(bruto.created_at) ??
    dataIsoOuNull(bruto.data) ??
    dataIsoOuNull(bruto.data_criacao) ??
    null

  let autor: { id: number | null; nome: string | null } | null = null
  const autorEntrada =
    bruto.autor ??
    bruto.usuario ??
    bruto.remetente ??
    bruto.criadoPor ??
    bruto.created_by ??
    null

  if (autorEntrada && typeof autorEntrada === 'object') {
    const autorObjeto = autorEntrada as Record<string, unknown>
    const autorId = numeroInteiroOuNull(
      autorObjeto.id ??
        autorObjeto.usuario_id ??
        autorObjeto.autor_id ??
        autorObjeto.created_by ??
        null,
    )
    const autorNome =
      textoNaoVazioOuNull(autorObjeto.nome) ??
      textoNaoVazioOuNull(autorObjeto.nome_completo) ??
      textoNaoVazioOuNull(autorObjeto.full_name) ??
      textoNaoVazioOuNull(autorObjeto.usuario) ??
      null

    autor = {
      id: autorId,
      nome: autorNome,
    }
  } else {
    const nomeFallback =
      textoNaoVazioOuNull(bruto.usuario_nome) ?? textoNaoVazioOuNull(bruto.autor_nome) ?? null

    if (nomeFallback) {
      autor = {
        id: null,
        nome: nomeFallback,
      }
    }
  }

  const anexosEntrada =
    Array.isArray(bruto.anexos)
      ? bruto.anexos
      : Array.isArray(bruto.attachments)
        ? bruto.attachments
        : []

  const anexosNormalizados = anexosEntrada
    .map((item) => normalizarChatAnexoResposta(item))
    .filter((anexo): anexo is KanbanChatAnexo => Boolean(anexo))

  return {
    id,
    conteudo,
    criadoEm,
    autor,
    anexos: anexosNormalizados,
  }
}

const carregarChatMensagens = async (forcar = false) => {
  const card = cardDetalhesAberto.value

  if (!card) {
    chatMensagens.value = []
    chatMensagensErro.value = null
    return
  }

  const etapaId = obterIdNumericoDoCard(card)

  if (!etapaId) {
    chatMensagensErro.value = 'Não foi possível identificar a tarefa selecionada.'
    chatMensagens.value = []
    return
  }

  if (
    !forcar &&
    chatCarregadoParaCardId.value === etapaId &&
    chatMensagens.value.length &&
    !chatMensagensErro.value
  ) {
    return
  }

  const requisicaoId = ++chatMensagensRequisicaoAtual
  carregandoChatMensagens.value = true
  chatMensagensErro.value = null

  try {
    const { data } = await api.get(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/chat/mensagens`,
    )

    if (requisicaoId !== chatMensagensRequisicaoAtual) {
      return
    }

    const lista = Array.isArray(data) ? data : []
    const normalizados = lista
      .map((item) => normalizarChatMensagemResposta(item))
      .filter((mensagem): mensagem is KanbanChatMensagem => Boolean(mensagem))

    chatMensagens.value = normalizados
    chatCarregadoParaCardId.value = etapaId
  } catch (error: any) {
    if (requisicaoId === chatMensagensRequisicaoAtual) {
      chatMensagens.value = []
      chatMensagensErro.value =
        error?.response?.data?.error || 'Não foi possível carregar o chat desta tarefa.'
    }
    console.error('Erro ao carregar mensagens do chat da etapa', error)
  } finally {
    if (requisicaoId === chatMensagensRequisicaoAtual) {
      carregandoChatMensagens.value = false
    }
  }
}

const enviarMensagemChat = async (mensagem: string) => {
  const texto = mensagem.trim()
  if (!texto) {
    return
  }

  const card = cardDetalhesAberto.value
  if (!card) {
    toast.error('Selecione uma tarefa para enviar mensagens.')
    return
  }

  const etapaId = obterIdNumericoDoCard(card)
  if (!etapaId) {
    toast.error('Não foi possível identificar a tarefa selecionada.')
    return
  }

  enviandoChatMensagem.value = true
  chatMensagensErro.value = null

  try {
    await api.post(`/esteira-procedimentos/kanban/solicitacoes/${etapaId}/chat/mensagens`, {
      conteudo: texto,
    })

    await carregarChatMensagens(true)
    toast.success('Mensagem enviada no chat.')
  } catch (error: any) {
    console.error('Erro ao enviar mensagem do chat da etapa', error)
    const mensagemErro =
      error?.response?.data?.error || 'Não foi possível enviar a mensagem. Tente novamente.'
    toast.error(mensagemErro)
  } finally {
    enviandoChatMensagem.value = false
  }
}

const enviarChatAnexo = async (arquivo: File) => {
  if (!arquivo) {
    return
  }

  const card = cardDetalhesAberto.value
  if (!card) {
    toast.error('Selecione uma tarefa para enviar o arquivo.')
    return
  }

  const etapaId = obterIdNumericoDoCard(card)
  if (!etapaId) {
    toast.error('Não foi possível identificar a tarefa selecionada.')
    return
  }

  const formData = new FormData()
  formData.append('arquivo', arquivo)

  uploadChatAnexoEmAndamento.value = true
  chatMensagensErro.value = null

  try {
    await api.post(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/chat/anexos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )

    await carregarChatMensagens(true)
    toast.success('Arquivo enviado para o chat da tarefa.')
  } catch (error: any) {
    console.error('Erro ao enviar arquivo para o chat da etapa', error)
    const mensagemErro =
      error?.response?.data?.error || 'Não foi possível enviar o arquivo. Tente novamente.'
    toast.error(mensagemErro)
  } finally {
    uploadChatAnexoEmAndamento.value = false
  }
}

const downloadChatAnexo = async (anexo: KanbanChatAnexo) => {
  const card = cardDetalhesAberto.value
  if (!card) {
    toast.error('Nenhuma tarefa selecionada para visualizar o arquivo.')
    return
  }

  const etapaId = obterIdNumericoDoCard(card)
  if (!etapaId) {
    toast.error('Não foi possível identificar a tarefa selecionada.')
    return
  }

  try {
    const { data } = await api.get(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/chat/anexos/${anexo.id}/download`,
      { responseType: 'blob' },
    )

    const blob = new Blob([data], {
      type: anexo.mimeType || 'application/octet-stream',
    })
    openBlobInNewTab(blob)
  } catch (error: any) {
    console.error('Erro ao abrir arquivo do chat da etapa', error)
    const mensagem =
      error?.response?.data?.error || 'Não foi possível visualizar o arquivo selecionado.'
    toast.error(mensagem)
  }
}

const resetarChatDoCard = () => {
  chatMensagensRequisicaoAtual += 1
  chatMensagens.value = []
  chatMensagensErro.value = null
  carregandoChatMensagens.value = false
  enviandoChatMensagem.value = false
  uploadChatAnexoEmAndamento.value = false
  chatCarregadoParaCardId.value = null
}

const resetarVencimentos = () => {
  vencimentosCarregadosParaCardId.value = null
  vencimentos.value = []
  vencimentosErro.value = null
  carregandoVencimentos.value = false
  enviandoVencimento.value = false
}

const carregarAnexosDoCard = async (card: KanbanCard) => {
  const etapaId = obterIdNumericoDoCard(card)
  anexosErro.value = null

  if (!etapaId) {
    anexosDoCard.value = []
    return
  }

  const requisicaoId = ++anexosRequisicaoAtual
  carregandoAnexos.value = true

  try {
    const { data } = await api.get(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/anexos`,
    )

    if (requisicaoId !== anexosRequisicaoAtual) {
      return
    }

    const lista = Array.isArray(data) ? data : []
    const normalizados = lista
      .map((item) => normalizarAnexoResposta(item))
      .filter((anexo): anexo is KanbanAnexo => Boolean(anexo))

    anexosDoCard.value = normalizados
  } catch (error: any) {
    if (requisicaoId === anexosRequisicaoAtual) {
      anexosDoCard.value = []
      anexosErro.value =
        error?.response?.data?.error || 'Não foi possível carregar os anexos desta etapa.'
    }
    console.error('Erro ao carregar anexos da etapa', error)
  } finally {
    if (requisicaoId === anexosRequisicaoAtual) {
      carregandoAnexos.value = false
    }
  }
}

const enviarAnexo = async (arquivo: File) => {
  if (!arquivo) {
    return
  }

  const card = cardDetalhesAberto.value
  if (!card) {
    toast.error('Selecione uma tarefa para anexar o documento.')
    return
  }

  const etapaId = obterIdNumericoDoCard(card)
  if (!etapaId) {
    toast.error('Não foi possível identificar a tarefa selecionada.')
    return
  }

  const formData = new FormData()
  formData.append('arquivo', arquivo)

  uploadAnexoEmAndamento.value = true
  anexosErro.value = null

  try {
    const { data } = await api.post(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/anexos`,
      formData,
    )

    const anexo = normalizarAnexoResposta(data)
    if (anexo) {
      anexosDoCard.value = [
        anexo,
        ...anexosDoCard.value.filter((item) => item.id !== anexo.id),
      ]
    }

    if (cardDetalhesAberto.value) {
      await carregarAnexosDoCard(cardDetalhesAberto.value)
    }

    toast.success('Documento anexado com sucesso.')
  } catch (error: any) {
    console.error('Erro ao anexar documento à etapa', error)
    const mensagem =
      error?.response?.data?.error || 'Não foi possível anexar o documento. Tente novamente.'
    toast.error(mensagem)
  } finally {
    uploadAnexoEmAndamento.value = false
  }
}

const downloadAnexo = async (anexo: KanbanAnexo) => {
  const card = cardDetalhesAberto.value
  if (!card) {
    toast.error('Nenhuma tarefa selecionada para visualizar o documento.')
    return
  }

  const etapaId = obterIdNumericoDoCard(card)
  if (!etapaId) {
    toast.error('Não foi possível identificar a tarefa selecionada.')
    return
  }

  try {
    const { data } = await api.get(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/anexos/${anexo.id}/download`,
      { responseType: 'blob' },
    )

    const blob = new Blob([data], {
      type: anexo.mimeType || 'application/octet-stream',
    })
    openBlobInNewTab(blob)
  } catch (error: any) {
    console.error('Erro ao abrir anexo da etapa', error)
    const mensagem =
      error?.response?.data?.error || 'Não foi possível visualizar o documento selecionado.'
    toast.error(mensagem)
  }
}

const carregarVencimentosDoCard = async (
  card: KanbanCard | null = cardDetalhesAberto.value,
  { forcar = false } = {},
) => {
  const etapaId = card ? obterIdNumericoDoCard(card) : null
  vencimentosErro.value = null

  if (!card || !etapaPermiteVencimentos.value || !etapaId) {
    resetarVencimentos()
    return
  }

  if (!forcar && vencimentosCarregadosParaCardId.value === etapaId) {
    return
  }

  const requisicaoId = ++vencimentosRequisicaoAtual
  carregandoVencimentos.value = true

  try {
    const { data } = await api.get(
      `/esteira-procedimentos/kanban/solicitacoes/${etapaId}/vencimentos`,
    )

    if (requisicaoId !== vencimentosRequisicaoAtual) {
      return
    }

    const lista = Array.isArray(data) ? data : []
    const normalizados = lista
      .map((item) => normalizarVencimentoResposta(item))
      .filter((vencimento): vencimento is KanbanVencimento => Boolean(vencimento?.id))

    vencimentos.value = normalizados
    vencimentosCarregadosParaCardId.value = etapaId
  } catch (error: any) {
    if (requisicaoId === vencimentosRequisicaoAtual) {
      vencimentosErro.value =
        error?.response?.data?.error || 'Não foi possível carregar os vencimentos desta etapa.'
      vencimentos.value = []
    }
    console.error('Erro ao carregar vencimentos da etapa', error)
  } finally {
    if (requisicaoId === vencimentosRequisicaoAtual) {
      carregandoVencimentos.value = false
    }
  }
}

const criarVencimento = async ({
  descricao,
  dataLimite,
}: {
  descricao: string
  dataLimite: string
}) => {
  if (!etapaPermiteVencimentos.value) {
    toast.info('Esta etapa não aceita cadastro de vencimentos.')
    return
  }

  const card = cardDetalhesAberto.value
  const etapaId = obterIdNumericoDoCard(card)

  if (!card || !etapaId) {
    toast.error('Nenhuma tarefa selecionada para registrar o vencimento.')
    return
  }

  const dataFinal = dataLimite?.trim()
  if (!dataFinal) {
    toast.error('Informe a data do vencimento.')
    return
  }

  enviandoVencimento.value = true
  vencimentosErro.value = null

  try {
    await api.post(`/esteira-procedimentos/kanban/solicitacoes/${etapaId}/vencimentos`, {
      descricao: descricao?.trim() || null,
      data: dataFinal,
    })

    await carregarVencimentosDoCard(card, { forcar: true })
    toast.success('Vencimento registrado com sucesso.')
  } catch (error: any) {
    console.error('Erro ao registrar vencimento da etapa', error)
    const mensagem =
      error?.response?.data?.error || 'Não foi possível salvar o vencimento. Tente novamente.'
    toast.error(mensagem)
  } finally {
    enviandoVencimento.value = false
  }
}

const normalizarDataSemHorario = (valor?: string | null) => {
  if (!valor) return null

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return null
  }

  data.setHours(0, 0, 0, 0)
  return data
}

const obterResumoDatasVencimentos = () => {
  const datasValidas = vencimentos.value
    .map((item) => ({ data: normalizarDataSemHorario(item.dataLimite), original: item.dataLimite }))
    .filter((item): item is { data: Date; original: string } => Boolean(item.data && item.original))

  if (!datasValidas.length) {
    return { possuiVencimento: false, dataMaisRecente: null as Date | null, dataMaisRecenteTexto: null as string | null }
  }

  const dataMaisRecente = datasValidas.reduce((maisRecente, atual) => (atual.data > maisRecente.data ? atual : maisRecente))

  return {
    possuiVencimento: true,
    dataMaisRecente: dataMaisRecente.data,
    dataMaisRecenteTexto: dataMaisRecente.original,
  }
}

const marcarCardComoConcluido = async () => {
  const card = cardDetalhesAberto.value
  if (!card) {
    return
  }

  if (statusAtualDoCard(card) === 'CONCLUIDO') {
    toast.info('Esta tarefa já está concluída.')
    return
  }

  if (card.permiteMovimentacao === false) {
    toast.info('Esta tarefa está bloqueada para movimentação manual.')
    return
  }

  if (etapaPermiteVencimentos.value) {
    await carregarVencimentosDoCard(card, { forcar: true })

    const { possuiVencimento, dataMaisRecente, dataMaisRecenteTexto } = obterResumoDatasVencimentos()
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    if (!possuiVencimento) {
      toast.error('Informe pelo menos um vencimento para concluir esta tarefa.')
      return
    }

    if (dataMaisRecente && dataMaisRecente < hoje) {
      const mensagem = dataMaisRecenteTexto
        ? `O vencimento registrado (${formatarData(dataMaisRecenteTexto)}) já expirou. Atualize a data limite.`
        : 'O vencimento desta tarefa já expirou. Atualize a data limite.'

      toast.error(mensagem)
      return
    }
  }

  marcandoConclusao.value = true

  try {
    await atualizarStatusDoCard(card, 'CONCLUIDO')
    toast.success('Tarefa marcada como concluída.')
    fecharDetalhesDoCard()
  } catch (error) {
    console.error('Erro ao marcar tarefa como concluída', error)
    toast.error('Não foi possível concluir a tarefa selecionada.')
  } finally {
    marcandoConclusao.value = false
  }
}

const carregarTipos = async () => {
  carregandoTipos.value = true
  try {
    const { data } = await api.get<ProcedimentoTipo[]>('/procedimento-tipos')
    const tiposOrdenados = Array.isArray(data)
      ? [...data].sort((a, b) => String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR'))
      : []
    tipos.value = tiposOrdenados

    if (!tiposOrdenados.length) {
      tipoSelecionadoId.value = null
      etapas.value = []
      destinosSelecionados.value = {}
      return
    }

    const tipoValido = tiposOrdenados.some((tipo) => tipo.id === tipoSelecionadoId.value)

    if (!tipoValido) {
      tipoSelecionadoId.value = tiposOrdenados[0]?.id ?? null
    } else {
      await carregarKanban()
    }
  } catch (error) {
    console.error('Erro ao carregar tipos de procedimento', error)
    toast.error('Erro ao carregar tipos de procedimento')
  } finally {
    carregandoTipos.value = false
  }
}

const extrairListaDeEtapas = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && typeof payload === 'object') {
    const objeto = payload as Record<string, unknown>
    if (Array.isArray(objeto.etapas)) return objeto.etapas
    if (Array.isArray(objeto.colunas)) return objeto.colunas
    if (Array.isArray(objeto.columns)) return objeto.columns
    if (Array.isArray(objeto.data)) return objeto.data
  }
  return []
}

const paraTexto = (valor: unknown): string | undefined => {
  if (valor === undefined || valor === null) {
    return undefined
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()
    return texto.length ? texto : undefined
  }

  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) {
      return undefined
    }
    return String(valor)
  }

  if (typeof valor === 'bigint') {
    return valor.toString()
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não'
  }

  if (valor instanceof Date) {
    return valor.toISOString()
  }

  return undefined
}

const extrairTextoGenerico = (valor: unknown): string | undefined => {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const texto = extrairTextoGenerico(item)
      if (texto) {
        return texto
      }
    }
    return undefined
  }

  const direto = paraTexto(valor)
  if (direto) {
    return direto
  }

  if (valor && typeof valor === 'object') {
    const registro = valor as Record<string, unknown>
    const chaves = [
      'nome',
      'name',
      'nome_completo',
      'full_name',
      'descricao',
      'description',
      'label',
      'titulo',
      'title',
      'texto',
      'text',
      'valor',
      'value',
    ]

    for (const chave of chaves) {
      if (!(chave in registro)) {
        continue
      }

      const texto = paraTexto(registro[chave])
      if (texto) {
        return texto
      }
    }
  }

  return undefined
}

const obterPrimeiroTexto = (...valores: unknown[]): string | undefined => {
  for (const valor of valores) {
    const texto = extrairTextoGenerico(valor)
    if (texto) {
      return texto
    }
  }
  return undefined
}

const extrairPrimeiroNome = (nome?: string | null): string | null => {
  if (nome === undefined || nome === null) {
    return null
  }

  const texto = String(nome).trim()
  if (!texto.length) {
    return null
  }

  const [primeiro] = texto.split(/\s+/)
  return primeiro && primeiro.length ? primeiro : null
}

const extrairNumeroGenerico = (valor: unknown): number | undefined => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()
    if (!texto.length) {
      return undefined
    }
    const numero = Number(texto)
    if (!Number.isNaN(numero)) {
      return numero
    }
  }

  if (valor && typeof valor === 'object') {
    const registro = valor as Record<string, unknown>
    if ('id' in registro) {
      const numero = extrairNumeroGenerico(registro.id)
      if (numero !== undefined) {
        return numero
      }
    }
    if ('value' in registro) {
      const numero = extrairNumeroGenerico(registro.value)
      if (numero !== undefined) {
        return numero
      }
    }
  }

  return undefined
}

const extrairRegistro = (valor: unknown): Record<string, unknown> | null => {
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    return valor as Record<string, unknown>
  }
  return null
}

const normalizarListaNumerica = (valor: unknown): number[] => {
  const numeros = new Set<number>()
  const visitados = new Set<unknown>()

  const registrarNumero = (entrada: unknown) => {
    const numero = extrairNumeroGenerico(entrada)
    if (numero !== undefined) {
      numeros.add(numero)
    }
  }

  const processar = (entrada: unknown) => {
    if (entrada === undefined || entrada === null) {
      return
    }

    if (typeof entrada === 'string') {
      const texto = entrada.trim()
      if (!texto.length) {
        return
      }

      if ((texto.startsWith('[') && texto.endsWith(']')) || (texto.startsWith('{') && texto.endsWith('}'))) {
        try {
          const json = JSON.parse(texto)
          processar(json)
          return
        } catch {
          // ignora JSON inválido
        }
      }

      if (texto.includes(',')) {
        texto.split(',').forEach((parte) => processar(parte))
        return
      }

      registrarNumero(texto)
      return
    }

    if (typeof entrada === 'number' || typeof entrada === 'bigint' || typeof entrada === 'boolean') {
      registrarNumero(entrada)
      return
    }

    if (visitados.has(entrada)) {
      return
    }

    if (Array.isArray(entrada)) {
      visitados.add(entrada)
      entrada.forEach((item) => processar(item))
      return
    }

    if (typeof entrada === 'object') {
      visitados.add(entrada)
      const registro = entrada as Record<string, unknown>
      const chavesPrioritarias = [
        'ids',
        'values',
        'items',
        'itens',
        'lista',
        'list',
        'dados',
        'data',
        'entries',
        'registros',
        'records',
        'tipos',
        'tipo',
        'procedimentos',
        'procedure_types',
        'procedureTypes',
        'procedimento_tipos',
        'procedimentoTipo',
        'procedimento_tipo_ids',
        'procedimentoTipoIds',
        'procedimento_tipo_id',
        'procedimentoTipoId',
        'tipo_procedimento_id',
        'tipoProcedimentoId',
        'tipo_ids',
        'tipoIds',
        'tipo_id',
        'tipoId',
        'value',
        'id',
      ]

      chavesPrioritarias.forEach((chave) => {
        if (chave in registro) {
          processar(registro[chave])
        }
      })
      return
    }
  }

  processar(valor)

  return Array.from(numeros)
}

const extrairProcedimentoTipoIds = (...valores: unknown[]): number[] => {
  const set = new Set<number>()
  valores.forEach((valor) => {
    normalizarListaNumerica(valor).forEach((numero) => set.add(numero))
  })
  return Array.from(set)
}

const obterPrimeiroNumero = (...valores: unknown[]): number | undefined => {
  for (const valor of valores) {
    const numero = extrairNumeroGenerico(valor)
    if (numero !== undefined) {
      return numero
    }
  }
  return undefined
}

const normalizarCards = (lista: unknown, etapaId: number): KanbanCard[] => {
  if (!Array.isArray(lista)) {
    return []
  }

  return lista
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const card = item as Record<string, unknown>
      const candidatoId =
        card.id ??
        card.solicitacao_id ??
        card.solicitacaoId ??
        card.request_id ??
        card.uuid ??
        card.identificador

      const candidatoIdNumerico = obterPrimeiroNumero(
        card.solicitacao_etapa_id,
        card.solicitacaoEtapaId,
        card.id,
        card.solicitacao_id,
        card.solicitacaoId,
        card.request_id,
        card.requestId,
        card.uuid,
        card.identificador,
      )

      const cardId = candidatoId != null ? String(candidatoId) : `${etapaId}-${index}`
      const dadosDatas =
        card.datas ??
        card.datas_relacionadas ??
        card.datasRelacionadas ??
        card.dates ??
        card.date_info ??
        null
      const datasBrutas =
        dadosDatas && typeof dadosDatas === 'object'
          ? (dadosDatas as Record<string, unknown>)
          : null
      const numeroLiberacao = obterPrimeiroTexto(
        card.numero_liberacao,
        card.liberacao,
        card.protocolo,
        card.codigo,
        datasBrutas?.['numero_liberacao'],
      )
      const dataCirurgia = obterPrimeiroTexto(
        card.data_cirurgia,
        card.dataCirurgia,
        datasBrutas?.['cirurgia'],
        datasBrutas?.['data_cirurgia'],
        datasBrutas?.['dataCirurgia'],
        datasBrutas?.['surgery_date'],
        card.data,
        card.previsao,
        card.data_prevista,
        card.schedule_date,
      )
      const ultimaAtualizacao = obterPrimeiroTexto(
        card.updated_at,
        card.atualizado_em,
        card.data_atualizacao,
        card.ultima_atualizacao,
        card.last_update,
        datasBrutas?.['ultima_atualizacao'],
        datasBrutas?.['updated_at'],
        datasBrutas?.['atualizado_em'],
      )
      const permiteMovimentacaoBruto =
        card.permite_movimentacao ??
        card.permiteMovimentacao ??
        card.can_move ??
        card.permiteMover
      let permiteMovimentar = true
      if (permiteMovimentacaoBruto !== undefined && permiteMovimentacaoBruto !== null) {
        if (typeof permiteMovimentacaoBruto === 'boolean') {
          permiteMovimentar = permiteMovimentacaoBruto
        } else if (typeof permiteMovimentacaoBruto === 'number') {
          permiteMovimentar = permiteMovimentacaoBruto !== 0
        } else if (typeof permiteMovimentacaoBruto === 'string') {
          const texto = permiteMovimentacaoBruto.trim().toLowerCase()
          permiteMovimentar = ![
            '0',
            'false',
            'nao',
            'não',
            'n',
            'no',
          ].includes(texto)
        } else {
          permiteMovimentar = Boolean(permiteMovimentacaoBruto)
        }
      }
      const tipoBruto =
        card.tipo ??
        card.tipo_card ??
        card.card_type ??
        card.cardType ??
        card.kind ??
        card.especial
      const tipoRelacionado = extrairRegistro(
        card.tipo ??
          card.tipo_card ??
          card.card_type ??
          card.cardType ??
          card.tipo_procedimento ??
          card.procedimento_tipo,
      )
      const procedimentoRelacionado = extrairRegistro(card.procedimento)
      const solicitacaoRelacionada =
        extrairRegistro(card.solicitacao) || extrairRegistro(card.request)
      const solicitacaoTipoRelacionado =
        solicitacaoRelacionada &&
        extrairRegistro(
          solicitacaoRelacionada.tipo ??
            solicitacaoRelacionada.tipo_procedimento ??
            solicitacaoRelacionada.procedimento_tipo,
        )
      const statusTexto = obterPrimeiroTexto(
        card.status,
        card.situacao,
        card.etapa_atual,
        card.stage,
        card.stage_name,
        card.state,
      )
      const statusChave = normalizarStatusChave(statusTexto)
      const pacienteTexto = obterPrimeiroTexto(
        card.paciente_nome,
        card.nome_paciente,
        card.paciente,
        card.patient,
        card.patient_name,
      )
      const medicoTexto = obterPrimeiroTexto(
        card.medico_nome,
        card.medico,
        card.medico_responsavel,
        card.doctor,
        card.surgeon,
      )
      const convenioTexto = obterPrimeiroTexto(
        card.convenio_nome,
        card.convenio,
        card.health_insurance,
        card.convenio_nome_integracao,
        card.convenio_nome_exibicao,
      )
      const prioridadeTexto = obterPrimeiroTexto(
        card.prioridade,
        card.priority,
        card.nivel_prioridade,
        card.priority_level,
      )
      const tipoTexto =
        typeof tipoBruto === 'string' && tipoBruto.trim().length
          ? tipoBruto
          : obterPrimeiroTexto(tipoBruto)
      const solicitaDataLimite = Boolean(
        card.solicitaDataLimite ??
          card.solicitar_data_limite ??
          card.solicitarDataLimite ??
          card.permite_vencimentos ??
          card.permiteVencimentos,
      )
      const responsavelRelacionado = extrairRegistro(card.responsavel)
      const responsavelId = obterPrimeiroNumero(
        card.responsavel_id,
        card.responsavelId,
        responsavelRelacionado?.id,
      )
      const responsavelNome = obterPrimeiroTexto(
        responsavelRelacionado?.nome,
        responsavelRelacionado?.nome_completo,
        responsavelRelacionado?.full_name,
        card.responsavel_nome,
        card.responsavel_nome_completo,
        card.responsavel_nome_exibicao,
      )
      let responsavel =
        responsavelId !== undefined &&
        responsavelId !== null &&
        Number.isFinite(responsavelId)
          ? {
              id: Math.trunc(responsavelId),
              nome: responsavelNome ?? null,
            }
          : null
      let responsavelPrimeiroNome = responsavel
        ? extrairPrimeiroNome(responsavel.nome)
        : null

      if (statusChave === 'PENDENTE') {
        responsavel = null
        responsavelPrimeiroNome = null
      }
      const procedimentoTipoIdNumero = obterPrimeiroNumero(
        card.procedimento_tipo_id,
        card.procedimentoTipoId,
        card.tipo_id,
        card.tipoId,
        card.tipo_procedimento_id,
        card.tipoProcedimentoId,
        card.solicitacao_tipo_id,
        card.solicitacaoTipoId,
        tipoRelacionado?.id,
        tipoRelacionado?.tipo_id,
        tipoRelacionado?.value,
        procedimentoRelacionado?.tipo_id,
        procedimentoRelacionado?.procedimento_tipo_id,
        solicitacaoRelacionada?.procedimento_tipo_id,
        solicitacaoRelacionada?.tipo_id,
        solicitacaoRelacionada?.tipo_procedimento_id,
        solicitacaoRelacionada?.tipoId,
        solicitacaoTipoRelacionado?.id,
        solicitacaoTipoRelacionado?.tipo_id,
        solicitacaoTipoRelacionado?.value,
      )

      const solicitacaoIdValor =
        obterPrimeiroNumero(
          card.solicitacao_id,
          card.solicitacaoId,
          card.request_id,
          card.requestId,
          card.cirurgia_id,
          card.cirurgiaId,
          solicitacaoRelacionada?.id,
          solicitacaoRelacionada?.solicitacao_id,
          solicitacaoRelacionada?.solicitacaoId,
          solicitacaoRelacionada?.request_id,
          solicitacaoRelacionada?.requestId,
        ) ??
        obterPrimeiroTexto(
          card.solicitacao_id,
          card.solicitacaoId,
          card.request_id,
          card.requestId,
          card.cirurgia_id,
          card.cirurgiaId,
          solicitacaoRelacionada?.id,
          solicitacaoRelacionada?.solicitacao_id,
          solicitacaoRelacionada?.solicitacaoId,
          solicitacaoRelacionada?.request_id,
          solicitacaoRelacionada?.requestId,
        ) ??
        null

      const etapaDependencia = extrairRegistro(
        card.etapa_dependencia || card.etapaDependencia || card.depende_de,
      )
      const etapaDependenciaId =
        obterPrimeiroNumero(
          card.etapa_dependencia_id,
          card.etapaDependenciaId,
          card.depende_de_id,
          etapaDependencia?.id,
        ) ?? null
      const etapaDependenciaNome =
        obterPrimeiroTexto(
          card.etapa_dependencia_nome,
          card.etapaDependenciaNome,
          card.depende_de_nome,
          etapaDependencia?.nome,
        ) || null
      const dependencia =
        etapaDependenciaId !== null || etapaDependenciaNome !== null
          ? { id: etapaDependenciaId, nome: etapaDependenciaNome }
          : null

      return {
        id: cardId,
        originalId: candidatoIdNumerico ??
          ((candidatoId as number | string | null | undefined) ?? null),
        cirurgiaId: solicitacaoIdValor,
        etapaId,
        dependencia,
        status: statusTexto,
        statusChave,
        procedimentoTipoId: procedimentoTipoIdNumero ?? null,
        paciente: pacienteTexto,
        numeroLiberacao: numeroLiberacao,
        medico: medicoTexto,
        dataCirurgia: dataCirurgia,
        convenio: convenioTexto,
        prioridade: prioridadeTexto,
        ultimaAtualizacao: ultimaAtualizacao,
        permiteMovimentacao: permiteMovimentar,
        tipo: tipoTexto ?? undefined,
        solicitaDataLimite,
        responsavel,
        responsavelPrimeiroNome,
        raw: card,
      }
    })
}

const normalizarEtapas = (payload: unknown): KanbanStage[] => {
  const lista = extrairListaDeEtapas(payload)

  return lista
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const etapa = item as Record<string, unknown>
      const idBruto = etapa.id ?? etapa.etapa_id ?? etapa.stage_id ?? index + 1
      const etapaId = Number.isFinite(Number(idBruto)) ? Number(idBruto) : index + 1
      const nome =
        (etapa.nome ?? etapa.name ?? etapa.titulo ?? etapa.title ?? `Etapa ${index + 1}`) as string
      const ordem = (etapa.ordem ?? etapa.order ?? etapa.posicao ?? index) as number | undefined
      const especialBruto =
        etapa.especial ?? etapa.tipo ?? etapa.kind ?? etapa.stage_type ?? etapa.category
      const cards = normalizarCards(
        etapa.solicitacoes ?? etapa.cards ?? etapa.itens ?? etapa.items ?? [],
        etapaId,
      )
      const procedimentoTipoIds = extrairProcedimentoTipoIds(
        etapa.procedimento_tipo_ids,
        etapa.procedimentoTipoIds,
        etapa.procedimento_tipo_id,
        etapa.procedimentoTipoId,
        etapa.tipo_procedimento_id,
        etapa.tipoProcedimentoId,
        etapa.tipo_ids,
        etapa.tipoIds,
        etapa.tipos,
        etapa.tipo,
      )

      return {
        id: etapaId,
        nome,
        ordem,
        especial: typeof especialBruto === 'string' ? especialBruto : undefined,
        total: (etapa.total ?? etapa.total_cards ?? cards.length) as number | undefined,
        solicitacoes: cards,
        procedimentoTipoIds: procedimentoTipoIds.length ? procedimentoTipoIds : undefined,
      }
    })
}

const sincronizarDestinos = (stages: KanbanStage[]) => {
  const destinos: Record<CardIdentifier, string> = {}
  const chavesValidas = new Set<CardIdentifier>()
  stages.forEach((stage) => {
    stage.solicitacoes.forEach((card) => {
      const statusAtual = statusAtualDoCard(card) ?? 'PENDENTE'
      destinos[String(card.id)] = statusAtual
      card.statusChave = statusAtual
      card.etapaId = stage.id
      chavesValidas.add(String(card.id))
    })
  })
  destinosSelecionados.value = destinos

  const expansoesAtualizadas: Record<CardIdentifier, boolean> = {}
  Object.entries(cardsExpandidos.value).forEach(([chave, valor]) => {
    if (valor && chavesValidas.has(chave)) {
      expansoesAtualizadas[chave] = true
    }
  })
  cardsExpandidos.value = expansoesAtualizadas

  if (cardDetalhesAberto.value && !chavesValidas.has(String(cardDetalhesAberto.value.id))) {
    cardDetalhesAberto.value = null
  }
}

const carregarKanban = async (opcoes?: { mostrarToast?: boolean }) => {
  if (!tipoSelecionadoId.value) {
    etapas.value = []
    destinosSelecionados.value = {}
    return
  }

  const tipoId = tipoSelecionadoId.value
  const requisicaoId = ++requisicaoKanbanAtual
  carregandoKanban.value = true
  erro.value = null

  try {
    const { data } = await api.get(KANBAN_ENDPOINT, {
      params: {
        procedimento_tipo_id: tipoId,
        procedimentoTipoId: tipoId,
        tipo_id: tipoId,
      },
    })

    if (requisicaoId !== requisicaoKanbanAtual) {
      return
    }

    const etapasNormalizadas = normalizarEtapas(data)
    etapas.value = etapasNormalizadas
    sincronizarDestinos(etapasNormalizadas)

    if (opcoes?.mostrarToast) {
      toast.success('Kanban atualizado com sucesso')
    }
  } catch (error) {
    if (requisicaoId !== requisicaoKanbanAtual) {
      return
    }
    console.error('Erro ao carregar Kanban', error)
    erro.value = 'Erro ao carregar os dados do Kanban. Tente novamente mais tarde.'
    toast.error('Erro ao carregar Kanban')
  } finally {
    if (requisicaoId === requisicaoKanbanAtual) {
      carregandoKanban.value = false
    }
  }
}

const handleRefresh = () => {
  if (!tipoSelecionadoId.value) {
    toast.info('Selecione um tipo de procedimento para atualizar o Kanban.')
    return
  }
  carregarKanban({ mostrarToast: true })
}

const moverSolicitacao = async (card: KanbanCard) => {
  if (card.permiteMovimentacao === false) {
    toast.info('Esta solicitação já está concluída.')
    return
  }

  const destinoStatus = destinosSelecionados.value[String(card.id)]

  if (!tipoSelecionadoId.value || !destinoStatus) {
    toast.info('Selecione um status para atualizar a solicitação.')
    return
  }

  const statusAtual = statusAtualDoCard(card)

  if (statusAtual && destinoStatus === statusAtual) {
    toast.info('Selecione um status diferente para atualizar a solicitação.')
    return
  }

  if (destinoStatus === 'ATRIBUIDO') {
    abrirModalSelecaoResponsavel(card, {
      reverterAoCancelar: !statusAtual || statusAtual !== 'ATRIBUIDO',
      statusAnterior: statusAtual ?? null,
      destinoStatus: 'ATRIBUIDO',
    })
    return
  }

  if (destinoStatus === 'CONCLUIDO') {
    toast.info('O status Concluído é atualizado automaticamente quando todas as etapas forem finalizadas.')
    return
  }

  const precisaAtribuirAntes =
    destinoStatus !== 'PENDENTE' && (!cardPossuiResponsavel(card) || !statusAtual || statusAtual === 'PENDENTE')

  if (precisaAtribuirAntes) {
    abrirModalSelecaoResponsavel(card, {
      reverterAoCancelar: true,
      statusAnterior: statusAtual ?? null,
      destinoStatus,
    })
    return
  }

  if (statusRequerPendencia(destinoStatus)) {
    await abrirModalPendencia(card, destinoStatus)
    return
  }

  await atualizarStatusDoCard(card, destinoStatus)
}

const atualizarStatusDoCard = async (
  card: KanbanCard,
  destinoStatus: string,
  extras?: {
    motivoPendenciaId?: number
    pendenciaDescricao?: string | null | undefined
    responsavelId?: number | null
  },
  opcoes?: AtualizarStatusOpcoes,
) => {
  const chave = String(card.id)
  atualizandoCards.value[chave] = true

  const recursoId = obterIdNumericoDoCard(card)

  if (!recursoId) {
    toast.error('Não foi possível identificar a solicitação selecionada.')
    console.warn('Kanban Multi-presença: card sem identificador numérico para atualização', {
      card,
    })
    destinosSelecionados.value[chave] = statusAtualDoCard(card) ?? 'PENDENTE'
    delete atualizandoCards.value[chave]
    return
  }

  const mostrarToastSucesso = opcoes?.mostrarToastSucesso ?? true
  const mostrarToastErro = opcoes?.mostrarToastErro ?? true
  const deveRecarregarKanban = opcoes?.recarregarKanban ?? true

  try {
    const payload: Record<string, unknown> = {
      status: destinoStatus,
      status_atualizado: destinoStatus,
      statusAtualizado: destinoStatus,
      procedimento_tipo_id: tipoSelecionadoId.value,
      procedimentoTipoId: tipoSelecionadoId.value,
    }

    if (extras?.motivoPendenciaId) {
      payload.motivo_pendencia_id = extras.motivoPendenciaId
      payload.pendencia_motivo_id = extras.motivoPendenciaId
    }

    if (extras?.pendenciaDescricao) {
      const texto = String(extras.pendenciaDescricao).trim()
      if (texto.length) {
        payload.pendencia_descricao = texto
        payload.descricao_pendencia = texto
      }
    }

    if (extras?.responsavelId !== undefined) {
      payload.responsavel_id = extras.responsavelId
      payload.responsavelId = extras.responsavelId
    }

    await api.patch(`${KANBAN_ENDPOINT}/solicitacoes/${recursoId}`, payload)
    if (mostrarToastSucesso) {
      toast.success('Status da solicitação atualizado')
    }
    if (deveRecarregarKanban) {
      await carregarKanban()
    }
  } catch (error) {
    console.error('Erro ao atualizar status da solicitação', error)
    if (mostrarToastErro) {
      toast.error('Não foi possível atualizar o status da solicitação')
    }
    destinosSelecionados.value[chave] = statusAtualDoCard(card) ?? 'PENDENTE'
    throw error
  } finally {
    delete atualizandoCards.value[chave]
  }
}

const normalizarEtapaIds = (valor: unknown): number[] => {
  if (!Array.isArray(valor)) {
    return []
  }

  const set = new Set<number>()
  valor.forEach((item) => {
    if (item === undefined || item === null) {
      return
    }

    if (typeof item === 'object' && 'id' in (item as Record<string, unknown>)) {
      const numero = Number((item as Record<string, unknown>).id)
      if (Number.isFinite(numero)) {
        const inteiro = Math.trunc(numero)
        if (inteiro > 0) {
          set.add(inteiro)
        }
      }
      return
    }

    const numeroDireto = Number(item)
    if (Number.isFinite(numeroDireto)) {
      const inteiro = Math.trunc(numeroDireto)
      if (inteiro > 0) {
        set.add(inteiro)
      }
    }
  })

  return Array.from(set)
}

const obterMotivosPendenciaParaEtapa = (etapaId: number | null) => {
  const etapaNumero = Number.isFinite(Number(etapaId)) ? Number(etapaId) : null

  return motivosPendenciaLista.value
    .filter((motivo) => motivo.ativo)
    .filter((motivo) => {
      if (etapaNumero === null) {
        return true
      }

      if (!motivo.etapaIds.length) {
        return true
      }

      return motivo.etapaIds.includes(etapaNumero)
    })
    .slice()
    .sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
}

const carregarMotivosPendencia = async () => {
  if (motivosPendenciaCarregados.value) {
    return
  }

  carregandoMotivosPendencia.value = true

  try {
    const { data } = await api.get('/motivos-pendencia')
    const listaBruta = Array.isArray(data) ? data : []

    const normalizados = listaBruta
      .map((item: any) => {
        const id = Number(item?.id)
        if (!Number.isFinite(id) || id <= 0) {
          return null
        }

        const descricao = typeof item?.descricao === 'string' ? item.descricao.trim() : ''
        if (!descricao.length) {
          return null
        }

        const etapaDireta = normalizarEtapaIds(item?.etapa_ids)
        const etapaRelacionada = normalizarEtapaIds(item?.etapas)
        const etapaIds = Array.from(new Set([...etapaDireta, ...etapaRelacionada]))
        const ativo = item?.ativo === undefined ? true : Boolean(item.ativo)

        const motivo: MotivoPendenciaOption = {
          id,
          descricao,
          ativo,
          etapaIds,
        }

        return motivo
      })
      .filter((motivo): motivo is MotivoPendenciaOption => Boolean(motivo))

    motivosPendenciaLista.value = normalizados
    motivosPendenciaCarregados.value = true
  } catch (error: any) {
    console.error('Erro ao carregar motivos de pendência', error)
    const mensagem =
      error?.response?.data?.error || 'Erro ao carregar motivos de pendência. Tente novamente mais tarde.'
    toast.error(mensagem)
    throw error
  } finally {
    carregandoMotivosPendencia.value = false
  }
}

const normalizarUsuarioResponsavel = (entrada: unknown): UsuarioResponsavel | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const registro = entrada as Record<string, unknown>
  const id = obterPrimeiroNumero(
    registro.id,
    registro.usuario_id,
    registro.user_id,
  )

  if (id === undefined || id === null || !Number.isFinite(id)) {
    return null
  }

  const nome =
    obterPrimeiroTexto(
      registro.full_name,
      registro.nome,
      registro.nome_completo,
      registro.username,
    ) || `Usuário ${Math.trunc(id)}`

  return {
    id: Math.trunc(id),
    nome,
    primeiroNome: extrairPrimeiroNome(nome),
  }
}

const carregarUsuariosResponsaveis = async (forcar = false) => {
  if (!forcar && (usuariosResponsaveisCarregados.value || carregandoUsuariosResponsaveis.value)) {
    return
  }

  if (carregandoUsuariosResponsaveis.value) {
    return
  }

  carregandoUsuariosResponsaveis.value = true
  responsavelSelecaoCarregarErro.value = null

  try {
    const { data } = await api.get('/users')
    const listaBruta = Array.isArray(data) ? data : []

    const normalizados = listaBruta
      .map((item) => normalizarUsuarioResponsavel(item))
      .filter((usuario): usuario is UsuarioResponsavel => Boolean(usuario))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    usuariosResponsaveis.value = normalizados
    usuariosResponsaveisCarregados.value = true
  } catch (error: any) {
    console.error('Erro ao carregar usuários responsáveis', error)
    toast.error('Não foi possível carregar os usuários para atribuição')
    if (!usuariosResponsaveis.value.length) {
      usuariosResponsaveisCarregados.value = false
      responsavelSelecaoCarregarErro.value =
        'Não foi possível carregar os usuários. Tente novamente.'
    } else {
      responsavelSelecaoCarregarErro.value =
        'Não foi possível atualizar a lista de usuários. Tente novamente.'
    }
    throw error
  } finally {
    carregandoUsuariosResponsaveis.value = false
  }
}

const responsavelSelectValor = computed(() =>
  responsavelSelecionadoId.value !== null
    ? String(responsavelSelecionadoId.value)
    : '',
)

const podeRemoverResponsavel = computed(() => {
  const card = cardResponsavelEdicao.value
  if (!card) {
    return false
  }
  return cardPossuiResponsavel(card)
})

const handleResponsavelSelectChange = (event: Event) => {
  responsavelValidacaoErro.value = null
  const alvo = event.target as HTMLSelectElement | null
  if (!alvo) {
    responsavelSelecionadoId.value = null
    return
  }

  const valor = alvo.value
  if (!valor) {
    responsavelSelecionadoId.value = null
    return
  }

  const numero = Number(valor)
  responsavelSelecionadoId.value = Number.isFinite(numero) ? Math.trunc(numero) : null
}

const prepararModalAtribuicaoCirurgia = (
  cardBase: KanbanCard,
  destino: string,
  responsavelId: number,
  avaliacao: AvaliacaoAtribuicaoCirurgia,
) => {
  modalAtribuicaoCirurgiaDestino.value = destino
  modalAtribuicaoCirurgiaResponsavelId.value = responsavelId
  modalAtribuicaoCirurgiaCardOrigem.value = cardBase

  const mapa = new Map<string, KanbanCard>()
  mapa.set(String(cardBase.id), cardBase)
  avaliacao.outrosParaAtualizar.forEach((item) => {
    mapa.set(String(item.id), item)
  })
  modalAtribuicaoCirurgiaCards.value = Array.from(mapa.values())

  const usuarioSelecionado = usuariosResponsaveis.value.find(
    (usuario) => usuario.id === responsavelId,
  )
  modalAtribuicaoCirurgiaUsuarioNome.value =
    usuarioSelecionado?.nome ?? cardBase.responsavel?.nome ?? null

  modalAtribuicaoCirurgiaAberto.value = true
}

const resetarModalAtribuicaoCirurgia = () => {
  modalAtribuicaoCirurgiaAberto.value = false
  modalAtribuicaoCirurgiaCards.value = []
  modalAtribuicaoCirurgiaCardOrigem.value = null
  modalAtribuicaoCirurgiaDestino.value = null
  modalAtribuicaoCirurgiaResponsavelId.value = null
  modalAtribuicaoCirurgiaUsuarioNome.value = null
}

const cancelarModalAtribuicaoCirurgia = () => {
  if (atribuirCirurgiaCarregando.value) {
    return
  }

  resetarModalAtribuicaoCirurgia()
  modalResponsavelAberto.value = true
}

const confirmarAtribuicaoSomenteAtual = async () => {
  if (atribuirCirurgiaCarregando.value) {
    return
  }

  const card = modalAtribuicaoCirurgiaCardOrigem.value
  const destino = modalAtribuicaoCirurgiaDestino.value
  const responsavelId = modalAtribuicaoCirurgiaResponsavelId.value

  if (!card || !destino || responsavelId === null) {
    resetarModalAtribuicaoCirurgia()
    modalResponsavelAberto.value = true
    return
  }

  atribuirCirurgiaCarregando.value = true
  try {
    await atualizarStatusDoCard(card, destino, { responsavelId })
    fecharModalResponsavel(true)
    resetarModalAtribuicaoCirurgia()
  } catch (error) {
    console.debug('Falha ao atribuir responsável apenas para a tarefa atual', error)
    resetarModalAtribuicaoCirurgia()
    modalResponsavelAberto.value = true
  } finally {
    atribuirCirurgiaCarregando.value = false
  }
}

const confirmarAtribuicaoParaTodaCirurgia = async () => {
  if (atribuirCirurgiaCarregando.value) {
    return
  }

  const destino = modalAtribuicaoCirurgiaDestino.value
  const responsavelId = modalAtribuicaoCirurgiaResponsavelId.value
  const cards = modalAtribuicaoCirurgiaCards.value

  if (!destino || responsavelId === null || !cards.length) {
    resetarModalAtribuicaoCirurgia()
    modalResponsavelAberto.value = true
    return
  }

  atribuirCirurgiaCarregando.value = true
  try {
    const resultados = await Promise.allSettled(
      cards.map((card) =>
        atualizarStatusDoCard(
          card,
          destino,
          { responsavelId },
          { mostrarToastSucesso: false, mostrarToastErro: false, recarregarKanban: false },
        ),
      ),
    )

    const houveErro = resultados.some((resultado) => resultado.status === 'rejected')

    if (houveErro) {
      toast.error(
        'Não foi possível atribuir o responsável para todas as tarefas. Algumas etapas podem não ter sido atualizadas.',
      )
    } else {
      toast.success('Responsável atribuído para todas as tarefas desta cirurgia.')
    }

    await carregarKanban()
    fecharModalResponsavel(true)
    resetarModalAtribuicaoCirurgia()
  } catch (error) {
    console.error('Erro ao atribuir responsável para todas as tarefas da cirurgia', error)
    toast.error('Não foi possível concluir a atribuição das tarefas desta cirurgia.')
    resetarModalAtribuicaoCirurgia()
    modalResponsavelAberto.value = true
  } finally {
    atribuirCirurgiaCarregando.value = false
  }
}

const abrirModalSelecaoResponsavel = (
  card: KanbanCard,
  opcoes?: {
    reverterAoCancelar?: boolean
    statusAnterior?: string | null
    destinoStatus?: string | null
  },
) => {
  responsavelValidacaoErro.value = null
  responsavelSelecaoCarregarErro.value = null
  cardResponsavelEdicao.value = card
  responsavelSelecionadoId.value = card.responsavel?.id ?? null
  responsavelSelecaoReverterStatus.value = Boolean(opcoes?.reverterAoCancelar)
  responsavelSelecaoStatusAnterior.value =
    opcoes?.statusAnterior !== undefined
      ? opcoes.statusAnterior
      : statusAtualDoCard(card) ?? null
  responsavelSelecaoDestinoPosterior.value =
    opcoes?.destinoStatus ?? statusAtualDoCard(card) ?? 'ATRIBUIDO'
  modalResponsavelAberto.value = true

  if (!usuariosResponsaveisCarregados.value) {
    void carregarUsuariosResponsaveis().catch(() => {})
  }
}

const fecharModalResponsavel = (manterStatus = false) => {
  if (!manterStatus && responsavelSelecaoReverterStatus.value && cardResponsavelEdicao.value) {
    const chave = String(cardResponsavelEdicao.value.id)
    const statusAnterior = responsavelSelecaoStatusAnterior.value
    if (statusAnterior) {
      destinosSelecionados.value[chave] = statusAnterior
    } else {
      delete destinosSelecionados.value[chave]
    }
  }

  modalResponsavelAberto.value = false
  cardResponsavelEdicao.value = null
  responsavelSelecionadoId.value = null
  responsavelSelecaoReverterStatus.value = false
  responsavelSelecaoStatusAnterior.value = null
  responsavelSelecaoDestinoPosterior.value = null
  responsavelValidacaoErro.value = null
  responsavelSelecaoCarregarErro.value = null
}

const cancelarSelecaoResponsavel = () => {
  fecharModalResponsavel(false)
}

const confirmarSelecaoResponsavel = async () => {
  if (!cardResponsavelEdicao.value) {
    return
  }

  responsavelValidacaoErro.value = null

  if (responsavelSelecionadoId.value === null) {
    responsavelValidacaoErro.value = 'Selecione um usuário responsável.'
    return
  }

  const destino =
    responsavelSelecaoDestinoPosterior.value ??
    statusAtualDoCard(cardResponsavelEdicao.value) ??
    'ATRIBUIDO'

  if (statusRequerPendencia(destino)) {
    const cardSelecionado = cardResponsavelEdicao.value
    const responsavelId = responsavelSelecionadoId.value
    responsavelSelecaoPendenciaResponsavelId.value = responsavelId
    fecharModalResponsavel(true)
    try {
      await abrirModalPendencia(cardSelecionado, destino)
      if (!modalPendenciaAberto.value) {
        responsavelSelecaoPendenciaResponsavelId.value = null
      }
    } catch (error) {
      responsavelSelecaoPendenciaResponsavelId.value = null
      console.debug('Falha ao abrir pendência após seleção de responsável', error)
    }
    return
  }

  const avaliacao = avaliarOfertaAtribuicaoCirurgia(cardResponsavelEdicao.value, destino)
  if (avaliacao && responsavelSelecionadoId.value !== null) {
    modalResponsavelAberto.value = false
    prepararModalAtribuicaoCirurgia(
      cardResponsavelEdicao.value,
      destino,
      responsavelSelecionadoId.value,
      avaliacao,
    )
    return
  }

  salvandoResponsavel.value = true
  try {
    await atualizarStatusDoCard(cardResponsavelEdicao.value, destino, {
      responsavelId: responsavelSelecionadoId.value,
    })
    fecharModalResponsavel(true)
  } catch (error) {
    // Erro tratado em atualizarStatusDoCard
  } finally {
    salvandoResponsavel.value = false
  }
}

const tentarNovamenteCarregarUsuarios = async () => {
  responsavelSelecaoCarregarErro.value = null
  try {
    await carregarUsuariosResponsaveis(true)
  } catch (error) {
    console.error('Nova tentativa de carregar usuários falhou', error)
  }
}

const removerResponsavelSelecionado = async () => {
  if (!cardResponsavelEdicao.value) {
    return
  }

  salvandoResponsavel.value = true
  try {
    await atualizarStatusDoCard(cardResponsavelEdicao.value, 'PENDENTE', {
      responsavelId: null,
    })
    fecharModalResponsavel(true)
  } catch (error) {
    // Erro tratado em atualizarStatusDoCard
  } finally {
    salvandoResponsavel.value = false
  }
}

const resetarPendenciaEstado = () => {
  modalPendenciaAberto.value = false
  cardPendencia.value = null
  statusPendenciaDestino.value = null
  pendenciaDescricao.value = ''
  motivoPendenciaSelecionadoId.value = null
  responsavelSelecaoPendenciaResponsavelId.value = null
}

const reverterStatusSelecionado = (card: KanbanCard) => {
  const chave = String(card.id)
  const statusAtual = statusAtualDoCard(card) ?? 'PENDENTE'
  destinosSelecionados.value[chave] = statusAtual
}

const abrirModalPendencia = async (card: KanbanCard, destinoStatus: string) => {
  try {
    await carregarMotivosPendencia()
  } catch {
    reverterStatusSelecionado(card)
    return
  }

  const opcoes = obterMotivosPendenciaParaEtapa(card.etapaId ?? null)

  if (!opcoes.length) {
    toast.info('Nenhum motivo de pendência cadastrado para esta etapa.')
    reverterStatusSelecionado(card)
    return
  }

  cardPendencia.value = card
  statusPendenciaDestino.value = destinoStatus
  pendenciaDescricao.value = ''
  modalPendenciaAberto.value = true
  motivoPendenciaSelecionadoId.value = opcoes[0]?.id ?? null
}

const cancelarModalPendencia = () => {
  if (cardPendencia.value) {
    reverterStatusSelecionado(cardPendencia.value)
  }
  resetarPendenciaEstado()
}

const confirmarPendencia = async () => {
  if (!cardPendencia.value || !statusPendenciaDestino.value) {
    return
  }

  if (!motivoPendenciaSelecionadoId.value) {
    toast.info('Selecione um motivo de pendência.')
    return
  }

  const cardSelecionado = cardPendencia.value
  const destino = statusPendenciaDestino.value
  const motivoId = motivoPendenciaSelecionadoId.value
  const responsavelId = responsavelSelecaoPendenciaResponsavelId.value
  const descricaoTexto = pendenciaDescricao.value.trim()
  const descricaoParaEnvio = descricaoTexto.length ? descricaoTexto : undefined

  resetarPendenciaEstado()

  try {
    await atualizarStatusDoCard(cardSelecionado, destino, {
      motivoPendenciaId: motivoId,
      pendenciaDescricao: descricaoParaEnvio,
      responsavelId: responsavelId ?? undefined,
    })
  } catch (error) {
    console.debug('Falha ao atualizar status com pendência', error)
  }
}

const motivosPendenciaDisponiveis = computed(() =>
  obterMotivosPendenciaParaEtapa(cardPendencia.value?.etapaId ?? null),
)

const etapaPendenciaNome = computed(() => {
  const etapaId = cardPendencia.value?.etapaId
  if (etapaId === undefined || etapaId === null) {
    return null
  }
  const etapa = etapas.value.find((item) => item.id === etapaId)
  return etapa?.nome ?? null
})

watch(
  () => cardDetalhesAberto.value,
  (card) => {
    anexosRequisicaoAtual += 1
    anexosDoCard.value = []
    anexosErro.value = null
    uploadAnexoEmAndamento.value = false
    resetarChatDoCard()
    resetarVencimentos()

    if (card) {
      carregarAnexosDoCard(card)
      if (etapaPermiteVencimentos.value) {
        carregarVencimentosDoCard(card)
      }
    }
  },
)

watch(
  () => motivosPendenciaDisponiveis.value,
  (opcoes) => {
    if (!modalPendenciaAberto.value) {
      return
    }

    if (!opcoes.length) {
      motivoPendenciaSelecionadoId.value = null
      return
    }

    if (!opcoes.some((opcao) => opcao.id === motivoPendenciaSelecionadoId.value)) {
      motivoPendenciaSelecionadoId.value = opcoes[0].id
    }
  },
)

const STATUS_REQUER_PENDENCIA = new Set(['PARADO', 'ATRASADO'])

const statusRequerPendencia = (status: string | null | undefined) =>
  Boolean(status && STATUS_REQUER_PENDENCIA.has(status))

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  PENDENTE: {
    label: 'Pendente',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  BLOQUEADA: {
    label: 'Bloqueada',
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300',
  },
  ATRIBUIDO: {
    label: 'Atribuído',
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  },
  EM_ANDAMENTO: {
    label: 'Em andamento',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
  PARADO: {
    label: 'Parado',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  },
  ATRASADO: {
    label: 'Atrasado',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  },
  CONCLUIDO: {
    label: 'Concluído',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
}

const STATUS_OPTIONS = (
  [
    'PENDENTE',
    'ATRIBUIDO',
    'EM_ANDAMENTO',
    'PARADO',
    'ATRASADO',
    'CONCLUIDO',
  ] as const
).map((status) => ({
  value: status,
  label: STATUS_CONFIG[status]?.label ?? status,
}))

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos os status' },
  ...STATUS_OPTIONS,
  {
    value: 'BLOQUEADA',
    label: STATUS_CONFIG.BLOQUEADA?.label ?? 'Bloqueada',
  },
]

const CLASSE_MENSAGEM_CONCLUIDO =
  'rounded-lg border border-dashed border-emerald-300/60 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
const CLASSE_MENSAGEM_BLOQUEADA =
  'rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-600 dark:border-gray-600/50 dark:bg-gray-800/40 dark:text-gray-200'
const CLASSE_MENSAGEM_INDISPONIVEL =
  'rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-600 dark:border-slate-500/50 dark:bg-slate-800/40 dark:text-slate-200'

const normalizarStatusChave = (status?: string): string | null => {
  if (!status) return null
  const chave = status
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
  return STATUS_CONFIG[chave] ? chave : null
}

const statusInfo = (status?: string) => {
  const chave = normalizarStatusChave(status)
  return chave ? STATUS_CONFIG[chave] : null
}

const statusLabel = (status?: string) => {
  const info = statusInfo(status)
  if (info) {
    return info.label
  }
  if (typeof status === 'string' && status.trim().length) {
    return status
  }
  return 'Sem status'
}

const statusDotClass = (status?: string) => {
  const info = statusInfo(status)
  return info?.dot ?? 'bg-gray-300'
}

const statusBadgeClass = (status?: string) => {
  const info = statusInfo(status)
  return info?.badge ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800/80 dark:text-gray-300'
}

const obterIdNumericoDoCard = (card: KanbanCard): number | null => {
  if (!card) {
    return null
  }

  const raw =
    card.raw && typeof card.raw === 'object' ? (card.raw as Record<string, unknown>) : null

  const numero = obterPrimeiroNumero(
    card.originalId,
    raw?.['solicitacao_etapa_id'],
    raw?.['solicitacaoEtapaId'],
    raw?.['id'],
    card.id,
    raw?.['solicitacao_id'],
    raw?.['solicitacaoId'],
    raw?.['request_id'],
    raw?.['requestId'],
  )

  return numero ?? null
}

const statusAtualDoCard = (card: KanbanCard) =>
  card.statusChave ?? normalizarStatusChave(card.status) ?? undefined

const classeMensagemIndisponivel = (card: KanbanCard) => {
  const status = statusAtualDoCard(card)
  if (status === 'CONCLUIDO') {
    return CLASSE_MENSAGEM_CONCLUIDO
  }
  if (status === 'BLOQUEADA') {
    return CLASSE_MENSAGEM_BLOQUEADA
  }
  return CLASSE_MENSAGEM_INDISPONIVEL
}

const formatarDataCurta = (valor?: string) => {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleDateString('pt-BR')
}

const formatarData = (valor?: string) => {
  if (!valor) return '-'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const obterTimestampDeData = (valor?: string | null): number | null => {
  if (!valor) return null

  const texto = String(valor).trim()
  if (!texto) return null

  const dataPadrao = new Date(texto)
  if (!Number.isNaN(dataPadrao.getTime())) {
    return dataPadrao.getTime()
  }

  const match = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  )

  if (!match) {
    return null
  }

  const dia = Number.parseInt(match[1] ?? '', 10)
  const mes = Number.parseInt(match[2] ?? '', 10) - 1
  const anoTexto = match[3] ?? ''
  const anoNumero =
    anoTexto.length === 2
      ? 2000 + Number.parseInt(anoTexto, 10)
      : Number.parseInt(anoTexto, 10)
  const hora = match[4] !== undefined ? Number.parseInt(match[4], 10) : 0
  const minuto = match[5] !== undefined ? Number.parseInt(match[5], 10) : 0
  const segundo = match[6] !== undefined ? Number.parseInt(match[6], 10) : 0

  if (
    Number.isNaN(dia) ||
    Number.isNaN(mes) ||
    Number.isNaN(anoNumero) ||
    dia <= 0 ||
    mes < 0 ||
    anoNumero <= 0
  ) {
    return null
  }

  const data = new Date(anoNumero, mes, dia, hora, minuto, segundo)

  if (Number.isNaN(data.getTime())) {
    return null
  }

  return data.getTime()
}

const obterPesoOrdenacaoPorCirurgia = (card: KanbanCard): number => {
  const cirurgiaId = formatarIdSolicitacao(card.cirurgiaId ?? undefined)

  if (!cirurgiaId) {
    return Number.POSITIVE_INFINITY
  }

  const numero = Number.parseFloat(cirurgiaId)

  if (Number.isFinite(numero)) {
    return -numero
  }

  return Number.POSITIVE_INFINITY
}

const procedimentosDoCard = (card: KanbanCard): string[] => {
  const raw = card.raw
  if (!raw) return []
  const candidatos = (raw.procedimentos ?? raw.procedures ?? raw.listaProcedimentos ?? raw.items) as
    | unknown[]
    | undefined
  if (!Array.isArray(candidatos)) return []
  return candidatos
    .map((item) => extrairTextoGenerico(item))
    .filter((valor): valor is string => Boolean(valor))
}

const obterProcedimentoTipoIdDoCard = (card: KanbanCard): number | null => {
  if (card.procedimentoTipoId !== undefined && card.procedimentoTipoId !== null) {
    return card.procedimentoTipoId
  }

  const raw = extrairRegistro(card.raw)
  if (!raw) {
    return null
  }

  const solicitacaoRelacionada =
    extrairRegistro(raw.solicitacao) || extrairRegistro(raw.request)
  const solicitacaoTipoRelacionado =
    solicitacaoRelacionada &&
    extrairRegistro(
      solicitacaoRelacionada.tipo ??
        solicitacaoRelacionada.tipo_procedimento ??
        solicitacaoRelacionada.procedimento_tipo,
    )
  const cardTipoRelacionado = extrairRegistro(
    raw.tipo ??
      raw.tipo_card ??
      raw.card_type ??
      raw.cardType ??
      raw.tipo_procedimento ??
      raw.procedimento_tipo,
  )

  const numero = obterPrimeiroNumero(
    raw.procedimento_tipo_id,
    raw.procedimentoTipoId,
    raw.tipo_procedimento_id,
    raw.tipoProcedimentoId,
    raw.tipo_id,
    raw.tipoId,
    raw.solicitacao_tipo_id,
    raw.solicitacaoTipoId,
    solicitacaoRelacionada?.procedimento_tipo_id,
    solicitacaoRelacionada?.tipo_procedimento_id,
    solicitacaoRelacionada?.tipo_id,
    solicitacaoRelacionada?.tipoId,
    solicitacaoTipoRelacionado?.id,
    solicitacaoTipoRelacionado?.tipo_id,
    solicitacaoTipoRelacionado?.value,
    cardTipoRelacionado?.id,
    cardTipoRelacionado?.tipo_id,
    cardTipoRelacionado?.value,
  )

  if (numero !== undefined) {
    card.procedimentoTipoId = numero
    return numero
  }

  return null
}

const etapasOrdenadas = computed(() => {
  const listaOrdenada = [...etapas.value].sort((a, b) => (a.ordem ?? a.id) - (b.ordem ?? b.id))
  const tipoFiltroId =
    tipoSelecionadoId.value !== null && tipoSelecionadoId.value !== undefined
      ? String(tipoSelecionadoId.value)
      : null
  const statusFiltro = statusFiltroSelecionado.value
  const exibirTarefasConcluidas = mostrarTarefasConcluidas.value
  const cirurgiaFiltroId = cirurgiaFiltroSelecionadaId.value

  const etapasFiltradasPorTipo = listaOrdenada.filter((etapa) => {
    if (!tipoFiltroId) {
      return true
    }

    const ids = etapa.procedimentoTipoIds
    if (!Array.isArray(ids) || !ids.length) {
      return true
    }

    return ids.some((id) => String(id) === tipoFiltroId)
  })

  const resumoCirurgias = cirurgiasResumo.value

  return etapasFiltradasPorTipo.map((etapa) => {
    const etapaEhConcluida = etapa.especial === 'CONCLUIDO'

    const solicitacoesFiltradas = etapa.solicitacoes.filter((card) => {
      const statusDoCard = statusAtualDoCard(card)
      const cardCirurgiaId = formatarIdSolicitacao(card.cirurgiaId ?? undefined)
      const resumoCirurgia =
        cardCirurgiaId && resumoCirurgias.has(cardCirurgiaId)
          ? resumoCirurgias.get(cardCirurgiaId) ?? null
          : null
      const cirurgiaTotalmenteConcluida =
        resumoCirurgia !== null && resumoCirurgia.pendentes === 0 && resumoCirurgia.concluidos > 0

      if (!etapaEhConcluida && cirurgiaTotalmenteConcluida) {
        return false
      }

      if (!etapaEhConcluida && statusDoCard === 'CONCLUIDO') {
        if (!exibirTarefasConcluidas) {
          return false
        }
      }

      if (tipoFiltroId) {
        const cardTipoId = obterProcedimentoTipoIdDoCard(card)
        if (cardTipoId !== null && String(cardTipoId) !== tipoFiltroId) {
          return false
        }

        const raw = card.raw && typeof card.raw === 'object' ? (card.raw as Record<string, unknown>) : null

        if (!cardTipoId && raw) {
          const solicitacaoRaw =
            extrairRegistro(raw.solicitacao) || extrairRegistro(raw.request)
          const rawTipoRelacionado =
            extrairRegistro(
              raw.tipo ??
                raw.tipo_card ??
                raw.card_type ??
                raw.cardType ??
                raw.tipo_procedimento ??
                raw.procedimento_tipo,
            ) ||
            (solicitacaoRaw
              ? extrairRegistro(
                  solicitacaoRaw.tipo ??
                    solicitacaoRaw.tipo_procedimento ??
                    solicitacaoRaw.procedimento_tipo,
                )
              : null)
          const rawTipoId = obterPrimeiroNumero(
            raw.procedimento_tipo_id,
            raw.procedimentoTipoId,
            raw.tipo_procedimento_id,
            raw.tipoProcedimentoId,
            raw.tipo_id,
            raw.tipoId,
            raw.solicitacao_tipo_id,
            raw.solicitacaoTipoId,
            solicitacaoRaw?.procedimento_tipo_id,
            solicitacaoRaw?.tipo_procedimento_id,
            solicitacaoRaw?.tipo_id,
            solicitacaoRaw?.tipoId,
            rawTipoRelacionado?.procedimento_tipo_id,
            rawTipoRelacionado?.tipo_procedimento_id,
            rawTipoRelacionado?.tipo_id,
            rawTipoRelacionado?.id,
            rawTipoRelacionado?.value,
          )
          if (rawTipoId !== undefined && String(rawTipoId) !== tipoFiltroId) {
            return false
          }
        }
      }

      if (cirurgiaFiltroId) {
        if (!cardCirurgiaId || cardCirurgiaId !== cirurgiaFiltroId) {
          return false
        }
      }

      if (statusFiltro) {
        if (statusDoCard !== statusFiltro) {
          return false
        }
      }

      return true
    })

    const solicitacoesOrdenadas = solicitacoesFiltradas
      .map((card, indiceOriginal) => ({ card, indiceOriginal }))
      .sort((a, b) => {
        const pesoA = obterPesoOrdenacaoPorCirurgia(a.card)
        const pesoB = obterPesoOrdenacaoPorCirurgia(b.card)

        if (pesoA !== pesoB) {
          return pesoA - pesoB
        }

        return a.indiceOriginal - b.indiceOriginal
      })
      .map((item) => item.card)

    return {
      ...etapa,
      total: solicitacoesOrdenadas.length,
      solicitacoes: solicitacoesOrdenadas,
    }
  })
})

watch(
  () => cirurgiasDisponiveis.value,
  (lista) => {
    if (!lista.some((item) => item.id === cirurgiaFiltroSelecionadaId.value)) {
      cirurgiaFiltroSelecionadaId.value = ''
    }
  },
  { immediate: true },
)

watch(
  () => tipoSelecionadoId.value,
  (novo, anterior) => {
    if (novo === anterior) return
    if (novo) {
      carregarKanban()
    } else {
      etapas.value = []
      destinosSelecionados.value = {}
    }
  },
)

onMounted(() => {
  carregarTipos()
})
</script>
