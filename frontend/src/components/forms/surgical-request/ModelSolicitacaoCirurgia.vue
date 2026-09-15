<template>
  <Modal v-if="isModalVisible" @close="emitClose">
    <template #body>
      <div
        class="relative flex h-[80vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900 sm:w-[80vw] sm:min-w-[850px] sm:max-w-[1100px]"
      >
        <header
          class="flex shrink-0 flex-col gap-4 border-b border-gray-200 px-4 pb-4 pt-6 sm:flex-row sm:items-start sm:justify-between dark:border-gray-800 lg:px-8"
        >
          <div>
            <h5 class="text-xl font-semibold text-gray-900 dark:text-white/90">
              Ficha de Agendamento do Procedimento Cirúrgico
            </h5>
            <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Revise os dados e organize a solicitação informando os detalhes do paciente, procedimento e recursos necessários.
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="emitClose"
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div class="flex shrink-0 flex-wrap gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800 lg:px-8">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            @click="activeTab = tab"
            :class="[
              'rounded-full px-4 py-2 text-sm font-medium transition',
              activeTab === tab
                ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-200'
                : 'text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-200'
            ]"
          >
            {{ tab }}
          </button>
        </div>

        <form class="flex h-full min-h-0 flex-col" @submit.prevent="submit">
          <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-6 lg:px-8">
            <div class="space-y-6">
              <div v-show="activeTab === 'Paciente'" class="space-y-6">
            <section class="form-section">
              <h6 class="form-section__title">Informações da solicitação</h6>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label class="form-label">Nº Liberação</label>
                  <IMaskComponent
                    v-model="form.numero_liberacao"
                    :mask="numeroLiberacaoMask"
                    :class="inputClasses"
                    inputmode="numeric"
                  />
                </div>
                <div>
                  <label class="form-label">Convênio</label>
                  <select
                    v-model="form.convenio"
                    :class="inputClasses"
                    :disabled="conveniosCarregando"
                    required
                  >
                    <option value="" disabled>
                      {{
                        conveniosCarregando
                          ? 'Carregando convênios...'
                          : 'Selecione um convênio'
                      }}
                    </option>
                    <option
                      v-for="item in convenios"
                      :key="`convenio-${item.id}`"
                      :value="item.nome"
                    >
                      {{ item.nomeExibicao }}
                    </option>
                  </select>
                  <p v-if="erroConvenios" class="mt-1 text-xs text-red-500">{{ erroConvenios }}</p>
                </div>
                <div>
                  <label class="form-label">Carteirinha</label>
                  <IMaskComponent
                    v-model="form.carteirinha"
                    :mask="carteirinhaMask"
                    :class="inputClasses"
                    autocapitalize="characters"
                  />
                </div>
              </div>
            </section>

            <section class="form-section">
              <h6 class="form-section__title">Dados do paciente</h6>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div class="md:col-span-2">
                  <label class="form-label">Nome Paciente</label>
                  <div ref="pacienteWrapperRef" class="relative">
                    <input
                      v-model="form.nome_paciente"
                      type="text"
                      :class="inputClasses"
                      placeholder="Digite ao menos 3 letras para buscar"
                      @focus="abrirDropdownPaciente"
                      @keydown.esc.prevent="fecharDropdownPaciente"
                      required
                    />
                    <div
                      v-if="pacienteDropdownAberto"
                      class="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
                    >
                      <p v-if="pacienteCarregando" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Buscando pacientes...
                      </p>
                      <p v-else-if="pacienteErro" class="px-4 py-2 text-sm text-red-500 dark:text-red-400">
                        {{ pacienteErro }}
                      </p>
                      <template v-else>
                        <ul v-if="pacienteResultados.length" class="divide-y divide-gray-100 dark:divide-gray-800">
                          <li
                            v-for="paciente in pacienteResultados"
                            :key="paciente.id"
                            class="cursor-pointer bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/80"
                            @mousedown.prevent="selecionarPaciente(paciente)"
                          >
                            <p class="font-medium">{{ paciente.nome }}</p>
                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {{ obterDescricaoPaciente(paciente) }}
                            </p>
                          </li>
                        </ul>
                        <p v-else class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                          Nenhum paciente encontrado
                        </p>
                      </template>
                    </div>
                  </div>
                </div>
                <div>
                  <label class="form-label">Data de Nascimento</label>
                  <IMaskComponent
                    v-model="form.data_nascimento"
                    :mask="dataMask"
                    :class="inputClasses"
                    placeholder="dd/mm/aaaa"
                    inputmode="numeric"
                  />
                </div>
                <div class="md:col-span-3">
                  <span class="form-label">Acomodação</span>
                  <div class="flex flex-wrap gap-4 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
                      <input
                        type="radio"
                        name="acomodacao"
                        value="apartamento"
                        v-model="form.acomodacao"
                        class="text-brand-500 focus:ring-brand-500"
                      />
                      Apartamento
                    </label>
                    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
                      <input
                        type="radio"
                        name="acomodacao"
                        value="enfermaria"
                        v-model="form.acomodacao"
                        class="text-brand-500 focus:ring-brand-500"
                      />
                      Enfermaria
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section class="form-section">
              <h6 class="form-section__title">Contato</h6>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="md:col-span-2">
                  <label class="form-label">Telefone para Contato</label>
                  <IMaskComponent v-model="form.telefone_contato" :mask="telefoneMask" :class="inputClasses" />
                </div>
              </div>
            </section>
          </div>

          <div v-show="activeTab === 'Cirurgia'" class="space-y-6">
            <section class="form-section">
              <h6 class="form-section__title">Detalhes do procedimento</h6>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label class="form-label">Tipo de Procedimento</label>
                  <select
                    v-model="form.procedimento_tipo_id"
                    :class="inputClasses"
                    :disabled="procedimentoTiposCarregando"
                    required
                  >
                    <option :value="null" disabled>
                      {{
                        procedimentoTiposCarregando
                          ? 'Carregando tipos de procedimento...'
                          : 'Selecione um tipo de procedimento'
                      }}
                    </option>
                    <option
                      v-for="tipo in procedimentoTipos"
                      :key="`procedimento-tipo-${tipo.id}`"
                      :value="tipo.id"
                    >
                      {{ tipo.nome }}
                    </option>
                  </select>
                  <p v-if="erroListaProcedimentoTipos" class="mt-1 text-xs text-red-500">
                    {{ erroListaProcedimentoTipos }}
                  </p>
                  <p v-else-if="erroSelecionarProcedimentoTipo" class="mt-1 text-xs text-red-500">
                    {{ erroSelecionarProcedimentoTipo }}
                  </p>
                </div>
                <div>
                  <label class="form-label">Data da Cirurgia</label>
                  <IMaskComponent
                    v-model="form.data_cirurgia"
                    :mask="dataHoraMask"
                    :class="inputClasses"
                    placeholder="dd/mm/aaaa hh:mm"
                    inputmode="numeric"
                  />
                </div>
                <div>
                  <label class="form-label">Duração Estimada</label>
                  <IMaskComponent v-model="form.duracao_estimada" :mask="duracaoMask" :class="inputClasses" placeholder="hh:mm" />
                </div>
                <div>
                  <label class="form-label">Médico</label>
                  <select
                    v-model="form.medico"
                    :class="inputClasses"
                    :disabled="medicosCarregando"
                  >
                    <option value="">
                      {{ medicosCarregando ? 'Carregando médicos...' : 'Selecione um médico' }}
                    </option>
                    <option
                      v-for="medico in medicos"
                      :key="medico.id"
                      :value="medico.nome"
                    >
                      {{ medico.nome }}<template v-if="medico.crm"> (CRM {{ medico.crm }})</template>
                      - {{ formatarOrigemMedico(medico.origem) }}
                    </option>
                  </select>
                  <p v-if="erroMedicos" class="mt-1 text-xs text-red-500">{{ erroMedicos }}</p>
                  <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lista integrada de médicos internos e externos.
                  </p>
                </div>
                <div>
                  <label class="form-label">Auxiliar</label>
                  <select
                    v-model="form.auxiliar"
                    :class="inputClasses"
                    :disabled="medicosCarregando"
                  >
                    <option value="">
                      {{ medicosCarregando ? 'Carregando médicos...' : 'Selecione um auxiliar' }}
                    </option>
                    <option
                      v-for="medico in medicos"
                      :key="`${medico.id}-aux`"
                      :value="medico.nome"
                    >
                      {{ medico.nome }}<template v-if="medico.crm"> (CRM {{ medico.crm }})</template>
                      - {{ formatarOrigemMedico(medico.origem) }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Fornecedor</label>
                  <input v-model="form.fornecedor" type="text" :class="inputClasses" />
                </div>
                <div>
                  <label class="form-label">Qtde Diárias</label>
                  <input v-model="form.internacao" type="numeric" :class="inputClasses" />
                </div>
                <label class="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-400">
                  <input type="checkbox" v-model="form.pernoite" class="h-5 w-5 text-brand-500 focus:ring-brand-500" />
                  Pernoite
                </label>
              </div>
            </section>

            <section class="form-section">
              <h6 class="form-section__title">Equipe e procedimentos</h6>
              <div class="grid gap-6 md:grid-cols-2">
                <div>
                  <p class="form-section__subtitle">Instrumentadores</p>
                  <div class="space-y-3">
                    <div
                      v-for="(inst, idx) in form.instrumentadores"
                      :key="`inst-${idx}`"
                      class="flex items-center gap-3"
                    >
                      <input v-model="form.instrumentadores[idx]" type="text" :class="inputClasses" />
                      <div class="flex gap-2">
                        <button
                          v-if="idx !== 0"
                          type="button"
                          class="icon-button icon-button--danger"
                          @click="removeItem(form.instrumentadores, idx)"
                          aria-label="Remover instrumentador"
                        >
                          –
                        </button>
                        <button
                          v-if="idx === form.instrumentadores.length - 1"
                          type="button"
                          class="icon-button"
                          @click="addItem(form.instrumentadores)"
                          aria-label="Adicionar instrumentador"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p class="form-section__subtitle">Procedimentos</p>
                  <div class="space-y-3">
                    <div v-for="(proc, idx) in form.procedimentos" :key="`proc-${idx}`" class="flex items-center gap-3">
                      <input v-model="form.procedimentos[idx]" type="text" :class="inputClasses" />
                      <div class="flex gap-2">
                        <button
                          v-if="idx !== 0"
                          type="button"
                          class="icon-button icon-button--danger"
                          @click="removeItem(form.procedimentos, idx)"
                          aria-label="Remover procedimento"
                        >
                          –
                        </button>
                        <button
                          v-if="idx === form.procedimentos.length - 1"
                          type="button"
                          class="icon-button"
                          @click="addItem(form.procedimentos)"
                          aria-label="Adicionar procedimento"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div v-show="activeTab === 'Recursos'" class="space-y-6">
            <section class="form-section">
              <h6 class="form-section__title">Classificação da cirurgia</h6>
              <div class="flex flex-wrap gap-4">
                <label class="choice-pill">
                  <input type="radio" name="classificacao" value="limpa" v-model="form.classificacao" class="choice-pill__input" />
                  <span class="choice-pill__label">Cirurgia Limpa</span>
                </label>
                <label class="choice-pill">
                  <input
                    type="radio"
                    name="classificacao"
                    value="potencial"
                    v-model="form.classificacao"
                    class="choice-pill__input"
                  />
                  <span class="choice-pill__label"> Potencialmente Contaminada</span>
                </label>
                <label class="choice-pill">
                  <input
                    type="radio"
                    name="classificacao"
                    value="contaminada"
                    v-model="form.classificacao"
                    class="choice-pill__input"
                  />
                  <span class="choice-pill__label">Contaminada</span>
                </label>
                <label class="choice-pill">
                  <input
                    type="radio"
                    name="classificacao"
                    value="infectada"
                    v-model="form.classificacao"
                    class="choice-pill__input"
                  />
                  <span class="choice-pill__label">Infectada</span>
                </label>
              </div>
            </section>

            <section class="form-section">
              <h6 class="form-section__title">Recursos necessários</h6>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.intensificador_imagem"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  Intensificador de Imagem
                </label>
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.perfurador_serra"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  <span class="checkbox-item__label"> Perfurador/Serra</span>
                </label>
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.reserva_sangue"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  <span class="checkbox-item__label">Reserva de Sangue</span>
                </label>
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.anestesia"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  <span class="checkbox-item__label">Anestesia</span>
                </label>
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.isolamento"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  <span class="checkbox-item__label">Isolamento/Infectada</span>
                </label>
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.anatomia_patologica"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  <span class="checkbox-item__label">Anatomia Patológica</span>
                </label>
                <label class="checkbox-item">
                  <input
                    type="checkbox"
                    v-model="form.recursos.mesa_tracao"
                    class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                  />
                  <span class="checkbox-item__label">Mesa de Tração</span>
                </label>
              </div>
            </section>

            <section class="form-section">
              <h6 class="form-section__title">Materiais</h6>
              <div class="space-y-3">
                <div v-for="(mat, idx) in form.materiais" :key="`mat-${idx}`" class="flex items-center gap-3">
                  <input v-model="form.materiais[idx]" type="text" :class="inputClasses" />
                  <div class="flex gap-2">
                    <button
                      v-if="idx !== 0"
                      type="button"
                      class="icon-button icon-button--danger"
                      @click="removeItem(form.materiais, idx)"
                      aria-label="Remover material"
                    >
                      –
                    </button>
                    <button
                      v-if="idx === form.materiais.length - 1"
                      type="button"
                      class="icon-button"
                      @click="addItem(form.materiais)"
                      aria-label="Adicionar material"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div v-show="activeTab === 'Informações Importantes'" class="space-y-6">
            <section class="form-section">
              <h6 class="form-section__title">Observações gerais</h6>
              <label class="form-label">Resumo clínico</label>
              <textarea
                v-model="form.observacoes"
                :class="textareaClasses"
                placeholder="Inclua informações clínicas relevantes, detalhes das evoluções ou instruções adicionais."
              ></textarea>

              <label class="checkbox-item">
                <input
                  type="checkbox"
                  v-model="form.testemunha_jeova"
                  class="checkbox-item__input h-5 w-5 text-brand-500 focus:ring-brand-500"
                />
                <span class="checkbox-item__label">Testemunha de Jeová</span>
              </label>
            </section>

            <section class="form-section">
              <h6 class="form-section__title">Intolerâncias e alergias</h6>
              <div class="grid gap-6 md:grid-cols-2">
                <div>
                  <p class="form-section__subtitle">Alimentos</p>
                  <div class="space-y-3">
                    <div v-for="(al, idx) in form.alergias_alimentos" :key="`alimento-${idx}`" class="flex items-center gap-3">
                      <input v-model="form.alergias_alimentos[idx]" type="text" :class="inputClasses" />
                      <div class="flex gap-2">
                        <button
                          v-if="idx !== 0"
                          type="button"
                          class="icon-button icon-button--danger"
                          @click="removeItem(form.alergias_alimentos, idx)"
                          aria-label="Remover alergia alimentar"
                        >
                          –
                        </button>
                        <button
                          v-if="idx === form.alergias_alimentos.length - 1"
                          type="button"
                          class="icon-button"
                          @click="addItem(form.alergias_alimentos)"
                          aria-label="Adicionar alergia alimentar"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p class="form-section__subtitle">Medicamentos</p>
                  <div class="space-y-3">
                    <div
                      v-for="(al, idx) in form.alergias_medicamentos"
                      :key="`medicamento-${idx}`"
                      class="flex items-center gap-3"
                    >
                      <input v-model="form.alergias_medicamentos[idx]" type="text" :class="inputClasses" />
                      <div class="flex gap-2">
                        <button
                          v-if="idx !== 0"
                          type="button"
                          class="icon-button icon-button--danger"
                          @click="removeItem(form.alergias_medicamentos, idx)"
                          aria-label="Remover alergia a medicamento"
                        >
                          –
                        </button>
                        <button
                          v-if="idx === form.alergias_medicamentos.length - 1"
                          type="button"
                          class="icon-button"
                          @click="addItem(form.alergias_medicamentos)"
                          aria-label="Adicionar alergia a medicamento"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div v-show="activeTab === 'Anexos'" class="space-y-6">
            <section class="form-section">
              <h6 class="form-section__title">Documentos complementares</h6>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Adicione documentos relevantes para a solicitação. Tipos permitidos:
                {{ DEFAULT_ATTACHMENT_EXTENSIONS_LABEL }}.
              </p>
              <div class="mt-4 space-y-4">
                <div class="flex flex-wrap items-center gap-3">
                  <input
                    ref="anexosInputRef"
                    type="file"
                    class="hidden"
                    multiple
                    :accept="DEFAULT_ATTACHMENT_ACCEPT"
                    @change="onAnexosSelecionados"
                  />
                  <button type="button" class="icon-button" @click="abrirSeletorAnexos">
                    Adicionar documento
                  </button>
                  <span v-if="anexosAdicionados.length" class="text-xs text-gray-500 dark:text-gray-400">
                    {{ anexosAdicionados.length }} arquivo(s) selecionado(s)
                  </span>
                </div>
                <ul v-if="anexosAdicionados.length" class="space-y-2">
                  <li
                    v-for="(arquivo, index) in anexosAdicionados"
                    :key="`${arquivo.name}-${arquivo.size}-${index}`"
                    class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60"
                  >
                    <div class="min-w-0">
                      <p class="truncate font-medium text-gray-700 dark:text-gray-200">{{ arquivo.name }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatSupportFileSize(arquivo.size) }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="icon-button icon-button--danger"
                      @click="removerAnexoSelecionado(index)"
                      aria-label="Remover documento"
                    >
                      Remover
                    </button>
                  </li>
                </ul>
              </div>
            </section>
          </div>

            </div>
          </div>

          <footer
            class="flex shrink-0 flex-col gap-3 border-t border-gray-200 px-4 pb-6 pt-5 sm:flex-row sm:justify-end dark:border-gray-800 lg:px-8"
          >
            <button
              type="button"
              @click="emitClose"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/5 sm:w-auto"
            >
              Fechar
            </button>
            <button
              v-if="podeRebuildTarefas"
              type="button"
              :disabled="rebuildingTasks"
              @click="rebuildTasks"
              class="flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-100 focus:outline-hidden focus:ring-2 focus:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-100 dark:hover:bg-brand-500/20 sm:w-auto"
            >
              <svg
                v-if="rebuildingTasks"
                class="h-4 w-4 animate-spin text-brand-600 dark:text-brand-200"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span>{{ rebuildingTasks ? 'Atualizando...' : 'Reprocessar tarefas' }}</span>
            </button>
            <button
              type="submit"
              class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400 sm:w-auto"
            >
              Salvar
            </button>
          </footer>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Modal from '@/components/profile/Modal.vue'
import api from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import { IMaskComponent } from 'vue-imask'
import {
  buscarMedicosIntegrados,
  formatarOrigemMedico,
  type MedicoIntegrado,
  type MedicoOrigem,
} from '@/services/medicos'
import {
  buscarConveniosIntegrados,
  type ConvenioIntegrado,
  type ConvenioOrigem,
} from '@/services/convenios'
import {
  ORIGEM_LOCAL,
  buscarPacientesIntegrados,
  formatarOrigemPaciente,
  type PacienteIntegrado,
  type PacienteOrigem,
} from '@/services/pacientes'
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_ATTACHMENT_EXTENSIONS_LABEL,
  splitAttachmentsByValidity,
} from '@/constants/attachments'
import { formatSupportFileSize } from '@/utils/support'
import {
  buscarTiposProcedimento,
  type ProcedimentoTipoIntegrado,
} from '@/services/procedimentoTipos'

interface ResourceSelection {
  intensificador_imagem: boolean
  perfurador_serra: boolean
  reserva_sangue: boolean
  anestesia: boolean
  isolamento: boolean
  anatomia_patologica: boolean
  mesa_tracao: boolean
}

interface SurgicalRequestForm {
  numero_liberacao: string
  convenio: string
  convenio_integracao_codigo: string
  convenio_integracao_origem: ConvenioOrigem | ''
  carteirinha: string
  nome_paciente: string
  paciente_id: number | null
  paciente_integracao_codigo: string
  paciente_integracao_origem: PacienteOrigem | ''
  acomodacao: string
  data_nascimento: string
  telefone_contato: string
  data_cirurgia: string
  medico: string
  medico_integracao_codigo: string
  medico_integracao_origem: MedicoOrigem | ''
  auxiliar: string
  auxiliar_integracao_codigo: string
  auxiliar_integracao_origem: MedicoOrigem | ''
  fornecedor: string
  duracao_estimada: string
  internacao: string
  pernoite: boolean
  classificacao: string
  observacoes: string
  recursos: ResourceSelection
  testemunha_jeova: boolean
  instrumentadores: string[]
  procedimentos: string[]
  materiais: string[]
  alergias_medicamentos: string[]
  alergias_alimentos: string[]
  procedimento_tipo_id: number | null
  anexos?: SurgicalRequestAttachmentPayload[]
}

interface SurgicalRequestAttachmentPayload {
  nome: string
  tipo: string
  tamanho: number
  conteudo: string
}

type SurgicalRequestData = Partial<SurgicalRequestForm> & Record<string, unknown>

interface RebuildTasksResponse {
  solicitacao_id: number
  created: number
  deleted: number
  kept: number
  rules_expected?: number
  rules_available?: number
  tasks_total?: number
  changes_detected?: boolean
  message?: string
}

interface Props {
  isOpen: boolean
  dados?: SurgicalRequestData | null
}

const props = defineProps<Props>()
const isModalVisible = computed(() => props.isOpen)
const emit = defineEmits(['close', 'saved'])

const toast = useToast()

const emitClose = () => {
  emit('close')
}

const tabs = ['Paciente', 'Cirurgia', 'Recursos', 'Informações Importantes', 'Anexos']
const activeTab = ref('Paciente')

interface ConvenioOption {
  id: number | string
  nome: string
  origem: ConvenioOrigem
  nomeExibicao: string
}

const convenios = ref<ConvenioOption[]>([])
const conveniosCarregando = ref(false)
const erroConvenios = ref('')

interface MedicoSelectOption {
  id: string
  nome: string
  crm: string | null
  origem: MedicoOrigem
  codigo: string
}

const medicos = ref<MedicoSelectOption[]>([])
const medicosCarregando = ref(false)
const erroMedicos = ref('')

interface PacienteBuscaOption {
  id: string
  nome: string
  codigo: string
  dataNascimento: string | null
  cpf: string | null
  origem: PacienteOrigem
}

const pacienteWrapperRef = ref<HTMLElement | null>(null)
const pacienteResultados = ref<PacienteBuscaOption[]>([])
const pacienteCarregando = ref(false)
const pacienteErro = ref('')
const pacienteDropdownAberto = ref(false)
const ignorarBuscaPaciente = ref(false)
const MINIMO_CARACTERES_PACIENTE = 3
let pacienteBuscaTimeout: ReturnType<typeof setTimeout> | null = null
let ultimoTermoPesquisado = ''
const anexosAdicionados = ref<File[]>([])
const anexosInputRef = ref<HTMLInputElement | null>(null)

const abrirSeletorAnexos = () => {
  anexosInputRef.value?.click()
}

const onAnexosSelecionados = (event: Event) => {
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
      anexosAdicionados.value = [...anexosAdicionados.value, ...valid]
    }
  }

  if (alvo) {
    alvo.value = ''
  }
}

const removerAnexoSelecionado = (indice: number) => {
  anexosAdicionados.value = anexosAdicionados.value.filter((_, index) => index !== indice)
}

const lerArquivoComoBase64 = (arquivo: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const conteudo = reader.result.includes(',') ? reader.result.split(',').pop() || '' : reader.result
        resolve(conteudo)
      } else {
        reject(new Error('Resultado inválido ao ler arquivo.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Não foi possível ler o arquivo selecionado.'))
    }

    reader.readAsDataURL(arquivo)
  })
}

const procedimentoTipos = ref<ProcedimentoTipoIntegrado[]>([])
const procedimentoTiposCarregando = ref(false)
const erroListaProcedimentoTipos = ref('')
const erroSelecionarProcedimentoTipo = ref('')

const numeroLiberacaoMask: RegExp = /^\d{0,15}$/
const carteirinhaMask: RegExp = /^[A-Za-z0-9-]{0,20}$/
const telefoneMask = ['(00) 0000-0000', '(00) 00000-0000']
const duracaoMask = '00:00'
const dataMask = '00/00/0000'
const dataHoraMask = '00/00/0000 00:00'

const criarFormularioInicial = (): SurgicalRequestForm => ({
  numero_liberacao: '',
  convenio: '',
  convenio_integracao_codigo: '',
  convenio_integracao_origem: '',
  carteirinha: '',
  nome_paciente: '',
  paciente_id: null,
  paciente_integracao_codigo: '',
  paciente_integracao_origem: '',
  acomodacao: '',
  data_nascimento: '',
  telefone_contato: '',
  data_cirurgia: '',
  medico: '',
  medico_integracao_codigo: '',
  medico_integracao_origem: '',
  auxiliar: '',
  auxiliar_integracao_codigo: '',
  auxiliar_integracao_origem: '',
  fornecedor: '',
  duracao_estimada: '',
  internacao: '',
  pernoite: false,
  classificacao: '',
  observacoes: '',
  recursos: {
    intensificador_imagem: false,
    perfurador_serra: false,
    reserva_sangue: false,
    anestesia: false,
    isolamento: false,
    anatomia_patologica: false,
    mesa_tracao: false,
  },
  testemunha_jeova: false,
  instrumentadores: [''],
  procedimentos: [''],
  materiais: [''],
  alergias_medicamentos: [''],
  alergias_alimentos: [''],
  procedimento_tipo_id: null,
})

const form = reactive<SurgicalRequestForm>(criarFormularioInicial())

const solicitacaoId = ref('')

const rebuildingTasks = ref(false)
const podeRebuildTarefas = computed(() => Boolean(solicitacaoId.value))

const obterIdSolicitacao = (dados?: SurgicalRequestData | null): string => {
  if (!dados) {
    return ''
  }

  const registro = dados as Record<string, unknown>
  const chaves = [
    'id',
    'esteira_procedimento_id',
    'esteiraProcedimentoId',
    'solicitacao_id',
    'solicitacaoId',
    'numero_liberacao',
    'numeroLiberacao',
    'numero',
    'codigo',
  ]

  for (const chave of chaves) {
    if (chave in registro) {
      const valor = registro[chave]
      const texto = textoOuVazio(valor)
      if (texto) {
        return texto
      }
    }
  }

  return ''
}

const definirSolicitacaoId = (dados?: SurgicalRequestData | null) => {
  solicitacaoId.value = obterIdSolicitacao(dados)
}

const resetForm = () => {
  Object.assign(form, criarFormularioInicial())
  ignorarBuscaPaciente.value = false
  ultimoTermoPesquisado = ''
  solicitacaoId.value = ''
  anexosAdicionados.value = []
  if (anexosInputRef.value) {
    anexosInputRef.value.value = ''
  }
}

const textoOuVazio = (valor: unknown, padrao = ''): string => {
  if (valor === undefined || valor === null) {
    return padrao
  }

  if (typeof valor === 'string') {
    return valor.trim()
  }

  if (valor instanceof Date) {
    const ano = valor.getFullYear()
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    return `${dia}/${mes}/${ano}`
  }

  if (typeof valor === 'number' || typeof valor === 'boolean' || typeof valor === 'bigint') {
    return String(valor)
  }

  return String(valor)
}

const numeroPositivoOuNull = (valor: unknown): number | null => {
  if (valor === undefined || valor === null) {
    return null
  }

  const numero = typeof valor === 'number' ? valor : Number(String(valor))

  if (!Number.isFinite(numero)) {
    return null
  }

  const inteiro = Math.trunc(numero)
  return inteiro > 0 ? inteiro : null
}

const booleano = (valor: unknown, padrao = false): boolean => {
  if (typeof valor === 'boolean') {
    return valor
  }

  if (typeof valor === 'number') {
    return valor !== 0
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase()
    if (!normalizado.length) {
      return padrao
    }

    if (['1', 'true', 't', 'sim', 's', 'y', 'yes', 'on'].includes(normalizado)) {
      return true
    }

    if (['0', 'false', 'f', 'nao', 'não', 'n', 'no', 'off'].includes(normalizado)) {
      return false
    }
  }

  return padrao
}

const formatarDataParaCampo = (valor: unknown): string => {
  if (valor === undefined || valor === null || valor === '') {
    return ''
  }

  if (valor instanceof Date) {
    const ano = valor.getFullYear()
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    return `${dia}/${mes}/${ano}`
  }

  const texto = String(valor).trim()
  if (!texto.length) {
    return ''
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto
  }

  const [dataParte] = texto.replace('T', ' ').split(' ')
  if (!dataParte) {
    return texto
  }

  const [ano, mes, dia] = dataParte.split('-')
  if (ano && mes && dia) {
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano.padStart(4, '0')}`
  }

  return texto
}

const formatarDataHoraParaCampo = (valor: unknown): string => {
  if (valor === undefined || valor === null || valor === '') {
    return ''
  }

  if (valor instanceof Date) {
    const ano = valor.getFullYear()
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    const horas = String(valor.getHours()).padStart(2, '0')
    const minutos = String(valor.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`
  }

  const texto = String(valor).trim()
  if (!texto.length) {
    return ''
  }

  if (/^\d{2}\/\d{2}\/\d{4}( \d{2}:\d{2})?$/.test(texto)) {
    return texto
  }

  const [dataParte, horaParte] = texto.replace('T', ' ').split(' ')
  if (!dataParte) {
    return texto
  }

  const [ano, mes, dia] = dataParte.split('-')
  if (ano && mes && dia) {
    const dataFormatada = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano.padStart(4, '0')}`

    if (!horaParte) {
      return dataFormatada
    }

    const [horas, minutos] = horaParte.split(':')
    if (horas && minutos) {
      return `${dataFormatada} ${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`
    }

    return dataFormatada
  }

  return texto
}

const normalizarListaTexto = (valor: unknown): string[] => {
  if (Array.isArray(valor)) {
    const itens = valor
      .map((entrada) => {
        if (entrada === undefined || entrada === null) {
          return ''
        }

        if (typeof entrada === 'string') {
          return entrada
        }

        if (typeof entrada === 'number') {
          return String(entrada)
        }

        if (typeof entrada === 'object') {
          const registro = entrada as Record<string, unknown>
          const camposPossiveis = [
            registro.descricao,
            registro.nome,
            registro.label,
            registro.texto,
            registro.text,
          ]
          for (const campo of camposPossiveis) {
            if (typeof campo === 'string' && campo.trim().length) {
              return campo
            }
          }
        }

        return ''
      })
      .map((entrada) => entrada.replace(/\s+/g, ' ').trim())
      .filter((entrada) => entrada.length > 0)

    return itens.length ? itens : ['']
  }

  if (typeof valor === 'string') {
    const texto = valor.trim()
    if (!texto.length) {
      return ['']
    }

    const separadores = ['||', '\n', ';', ',']
    for (const separador of separadores) {
      if (texto.includes(separador)) {
        const partes = texto
          .split(separador)
          .map((parte) => parte.replace(/\s+/g, ' ').trim())
          .filter((parte) => parte.length > 0)

        if (partes.length) {
          return partes
        }
      }
    }

    return [texto]
  }

  if (typeof valor === 'number') {
    return [String(valor)]
  }

  return ['']
}

const preencherFormulario = (dados: SurgicalRequestData) => {
  definirSolicitacaoId(dados)
  form.numero_liberacao = textoOuVazio(dados.numero_liberacao ?? dados.numeroLiberacao ?? '')
  form.convenio = textoOuVazio(dados.convenio ?? '')
  form.convenio_integracao_codigo = textoOuVazio(
    dados.convenio_integracao_codigo ?? dados.convenioIntegracaoCodigo ?? '',
  )
  form.convenio_integracao_origem = (textoOuVazio(
    dados.convenio_integracao_origem ?? dados.convenioIntegracaoOrigem ?? '',
  ) || '') as ConvenioOrigem | ''
  form.carteirinha = textoOuVazio(dados.carteirinha ?? '')

  ignorarBuscaPaciente.value = true
  form.nome_paciente = textoOuVazio(dados.nome_paciente ?? dados.nomePaciente ?? '')
  const pacienteId = numeroPositivoOuNull(dados.paciente_id ?? dados.pacienteId ?? null)
  form.paciente_id = pacienteId
  form.paciente_integracao_codigo = textoOuVazio(
    dados.paciente_integracao_codigo ?? dados.pacienteIntegracaoCodigo ?? '',
  )
  form.paciente_integracao_origem = (textoOuVazio(
    dados.paciente_integracao_origem ?? dados.pacienteIntegracaoOrigem ?? '',
  ) || '') as PacienteOrigem | ''

  form.acomodacao = textoOuVazio(dados.acomodacao ?? '')
  form.data_nascimento = formatarDataParaCampo(
    dados.data_nascimento ?? dados.dataNascimento ?? '',
  )
  form.telefone_contato = textoOuVazio(dados.telefone_contato ?? dados.telefoneContato ?? '')
  form.data_cirurgia = formatarDataHoraParaCampo(
    dados.data_cirurgia ?? dados.dataCirurgia ?? '',
  )

  form.medico = textoOuVazio(dados.medico ?? '')
  form.medico_integracao_codigo = textoOuVazio(
    dados.medico_integracao_codigo ?? dados.medicoIntegracaoCodigo ?? '',
  )
  form.medico_integracao_origem = (textoOuVazio(
    dados.medico_integracao_origem ?? dados.medicoIntegracaoOrigem ?? '',
  ) || '') as MedicoOrigem | ''

  form.auxiliar = textoOuVazio(dados.auxiliar ?? '')
  form.auxiliar_integracao_codigo = textoOuVazio(
    dados.auxiliar_integracao_codigo ?? dados.auxiliarIntegracaoCodigo ?? '',
  )
  form.auxiliar_integracao_origem = (textoOuVazio(
    dados.auxiliar_integracao_origem ?? dados.auxiliarIntegracaoOrigem ?? '',
  ) || '') as MedicoOrigem | ''

  form.fornecedor = textoOuVazio(dados.fornecedor ?? '')
  form.duracao_estimada = textoOuVazio(dados.duracao_estimada ?? dados.duracaoEstimada ?? '')
  form.internacao = textoOuVazio(dados.internacao ?? '')
  form.pernoite = booleano(dados.pernoite ?? dados.pernoiteCirurgia ?? false)
  form.classificacao = textoOuVazio(dados.classificacao ?? '')

  const recursosAninhados =
    typeof dados.recursos === 'object' && dados.recursos !== null
      ? (dados.recursos as Partial<Record<keyof ResourceSelection, unknown>>)
      : {}
  const recursosPlanos = dados as Record<string, unknown>

  const obterValorRecurso = (chave: keyof ResourceSelection, camelKey: string) =>
    recursosAninhados[chave] ?? recursosPlanos[chave as string] ?? recursosPlanos[camelKey]

  Object.assign(form.recursos, {
    intensificador_imagem: booleano(
      obterValorRecurso('intensificador_imagem', 'intensificadorImagem') ?? false,
    ),
    perfurador_serra: booleano(obterValorRecurso('perfurador_serra', 'perfuradorSerra') ?? false),
    reserva_sangue: booleano(obterValorRecurso('reserva_sangue', 'reservaSangue') ?? false),
    anestesia: booleano(obterValorRecurso('anestesia', 'anestesia') ?? false),
    isolamento: booleano(obterValorRecurso('isolamento', 'isolamento') ?? false),
    anatomia_patologica: booleano(
      obterValorRecurso('anatomia_patologica', 'anatomiaPatologica') ?? false,
    ),
    mesa_tracao: booleano(obterValorRecurso('mesa_tracao', 'mesaTracao') ?? false),
  })

  form.testemunha_jeova = booleano(dados.testemunha_jeova ?? dados.testemunhaJeova ?? false)
  form.observacoes = textoOuVazio(
    dados.observacoes ?? dados.observacoes_gerais ?? dados.observacoesGerais ?? '',
  )

  form.instrumentadores = normalizarListaTexto(dados.instrumentadores ?? [])
  form.procedimentos = normalizarListaTexto(dados.procedimentos ?? [])
  form.materiais = normalizarListaTexto(dados.materiais ?? [])
  form.alergias_medicamentos = normalizarListaTexto(
    dados.alergias_medicamentos ?? dados.alergiasMedicamentos ?? [],
  )
  form.alergias_alimentos = normalizarListaTexto(
    dados.alergias_alimentos ?? dados.alergiasAlimentos ?? [],
  )

  const procedimentoTipoId = numeroPositivoOuNull(
    dados.procedimento_tipo_id ?? dados.procedimentoTipoId ?? null,
  )
  form.procedimento_tipo_id = procedimentoTipoId
}

const inputClasses = [
  'dark:bg-dark-900',
  'h-11',
  'w-full',
  'appearance-none',
  'rounded-lg',
  'border',
  'border-gray-300',
  'bg-transparent',
  'px-4',
  'py-2.5',
  'text-sm',
  'text-gray-800',
  'shadow-theme-xs',
  'placeholder:text-gray-400',
  'transition',
  'focus:border-brand-300',
  'focus:outline-hidden',
  'focus:ring-3',
  'focus:ring-brand-500/10',
  'dark:border-gray-700',
  'dark:bg-gray-900',
  'dark:text-white/90',
  'dark:placeholder:text-white/30',
  'dark:focus:border-brand-800',
].join(' ')

const textareaClasses = `${inputClasses.replace('h-11', 'h-auto')} min-h-[140px] resize-y`

const abrirDropdownPaciente = () => {
  if (pacienteCarregando.value || pacienteErro.value || pacienteResultados.value.length) {
    pacienteDropdownAberto.value = true
  }
}

const fecharDropdownPaciente = () => {
  pacienteDropdownAberto.value = false
}

const carregarProcedimentoTipos = async () => {
  procedimentoTiposCarregando.value = true
  erroListaProcedimentoTipos.value = ''

  try {
    const tipos = await buscarTiposProcedimento()
    procedimentoTipos.value = tipos.filter((item) => item.ativo)

    if (!procedimentoTipos.value.length) {
      erroListaProcedimentoTipos.value = 'Nenhum tipo de procedimento disponível.'
    }
    if (
      form.procedimento_tipo_id &&
      !procedimentoTipos.value.some((tipo) => tipo.id === form.procedimento_tipo_id)
    ) {
      form.procedimento_tipo_id = null
    }
  } catch (err) {
    console.error('Erro ao carregar tipos de procedimento', err)
    erroListaProcedimentoTipos.value = 'Não foi possível carregar os tipos de procedimento.'
  } finally {
    procedimentoTiposCarregando.value = false
  }
}

const criarOpcaoPaciente = (paciente: PacienteIntegrado): PacienteBuscaOption | null => {
  const nome = paciente.nome_completo?.trim()
  if (!nome) {
    return null
  }

  const chave = `${paciente.origem}:${String(paciente.id)}`
  const codigo = String(paciente.id ?? '').trim() || nome

  return {
    id: chave,
    nome,
    codigo,
    dataNascimento: paciente.data_nascimento ?? null,
    cpf: paciente.cpf ?? null,
    origem: paciente.origem,
  }
}

const formatarCpf = (valor: string | null) => {
  if (!valor) return ''
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length !== 11) return valor
  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const formatarDataNascimento = (valor: string | null) => {
  if (!valor) return ''
  const normalizado = valor.slice(0, 10)
  const [ano, mes, dia] = normalizado.split('-')
  if (!ano || !mes || !dia) {
    return valor
  }
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
}

const obterDescricaoPaciente = (paciente: PacienteBuscaOption) => {
  const partes: string[] = []
  if (paciente.dataNascimento) {
    partes.push(`Nascimento: ${formatarDataNascimento(paciente.dataNascimento)}`)
  }
  if (paciente.cpf) {
    partes.push(`CPF: ${formatarCpf(paciente.cpf)}`)
  }
  partes.push(formatarOrigemPaciente(paciente.origem))
  return partes.join(' • ')
}

const buscarPacientes = async (termo: string) => {
  pacienteCarregando.value = true
  pacienteErro.value = ''
  pacienteDropdownAberto.value = true

  try {
    const lista = await buscarPacientesIntegrados({ termo })
    const normalizados = lista
      .map((item) => criarOpcaoPaciente(item))
      .filter((item): item is PacienteBuscaOption => Boolean(item))

    if (termo !== ultimoTermoPesquisado) {
      return
    }

    pacienteResultados.value = normalizados
    pacienteDropdownAberto.value = true
  } catch (err) {
    console.error('Erro ao buscar pacientes', err)
    if (termo === ultimoTermoPesquisado) {
      pacienteErro.value = 'Não foi possível buscar pacientes.'
      pacienteResultados.value = []
      pacienteDropdownAberto.value = true
    }
  } finally {
    if (termo === ultimoTermoPesquisado) {
      pacienteCarregando.value = false
    }
  }
}

const selecionarPaciente = (paciente: PacienteBuscaOption) => {
  ignorarBuscaPaciente.value = true
  form.nome_paciente = paciente.nome
  form.paciente_id = null
  form.paciente_integracao_codigo = paciente.codigo
  form.paciente_integracao_origem = paciente.origem

  if (paciente.origem === ORIGEM_LOCAL) {
    const numero = Number(paciente.codigo)
    form.paciente_id = Number.isInteger(numero) && numero > 0 ? numero : null
  }
  if (paciente.dataNascimento) {
    form.data_nascimento = formatarDataNascimento(paciente.dataNascimento)
  }
  fecharDropdownPaciente()
}

const handleClickOutsidePaciente = (event: MouseEvent) => {
  if (pacienteWrapperRef.value && !pacienteWrapperRef.value.contains(event.target as Node)) {
    fecharDropdownPaciente()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutsidePaciente)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutsidePaciente)
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      activeTab.value = 'Paciente'
      resetForm()
      definirSolicitacaoId(props.dados)
      rebuildingTasks.value = false
      if (props.dados) {
        preencherFormulario(props.dados)
      }
      void carregarConvenios()
      void carregarMedicos()
      void carregarProcedimentoTipos()
      pacienteResultados.value = []
      pacienteErro.value = ''
      pacienteDropdownAberto.value = false
      pacienteCarregando.value = false
    } else {
      resetForm()
      erroConvenios.value = ''
      erroMedicos.value = ''
      pacienteResultados.value = []
      pacienteErro.value = ''
      pacienteDropdownAberto.value = false
      pacienteCarregando.value = false
      ultimoTermoPesquisado = ''
      erroSelecionarProcedimentoTipo.value = ''
      rebuildingTasks.value = false
      if (!procedimentoTiposCarregando.value) {
        erroListaProcedimentoTipos.value = ''
      }
      if (pacienteBuscaTimeout) {
        clearTimeout(pacienteBuscaTimeout)
        pacienteBuscaTimeout = null
      }
    }
  },
)

watch(
  () => props.dados,
  (dados) => {
    if (!props.isOpen) {
      return
    }

    if (dados) {
      resetForm()
      definirSolicitacaoId(dados)
      preencherFormulario(dados)
    } else {
      resetForm()
    }

    rebuildingTasks.value = false

    if (pacienteBuscaTimeout) {
      clearTimeout(pacienteBuscaTimeout)
      pacienteBuscaTimeout = null
    }
    pacienteResultados.value = []
    pacienteErro.value = ''
    pacienteDropdownAberto.value = false
    pacienteCarregando.value = false
  },
)

watch(
  () => form.procedimento_tipo_id,
  () => {
    erroSelecionarProcedimentoTipo.value = ''
  },
)

watch(
  () => form.nome_paciente,
  (valorAtual) => {
    if (ignorarBuscaPaciente.value) {
      ignorarBuscaPaciente.value = false
      return
    }

    form.paciente_id = null
    form.paciente_integracao_codigo = ''
    form.paciente_integracao_origem = ''

    const termo = valorAtual?.trim() ?? ''

    if (pacienteBuscaTimeout) {
      clearTimeout(pacienteBuscaTimeout)
      pacienteBuscaTimeout = null
    }

    if (termo.length < MINIMO_CARACTERES_PACIENTE) {
      ultimoTermoPesquisado = ''
      pacienteResultados.value = []
      pacienteErro.value = ''
      pacienteDropdownAberto.value = false
      pacienteCarregando.value = false
      return
    }

    ultimoTermoPesquisado = termo
    pacienteCarregando.value = true
    pacienteDropdownAberto.value = true
    pacienteErro.value = ''

    pacienteBuscaTimeout = setTimeout(() => {
      void buscarPacientes(termo)
    }, 300)
  },
)

const addItem = (list: string[]) => list.push('')
const removeItem = (list: string[], index: number) => list.splice(index, 1)

const criarOpcaoConvenio = (convenio: ConvenioIntegrado): ConvenioOption | null => {
  const nome = convenio.nome.trim()
  if (!nome) {
    return null
  }

  const idNumero = Number(convenio.id)
  const id = Number.isFinite(idNumero) ? idNumero : String(convenio.id)

  const nomeExibicao = `${nome} (${convenio.id})`

  return { id, nome, origem: convenio.origem, nomeExibicao }
}

const carregarConvenios = async () => {
  if (conveniosCarregando.value) return

  conveniosCarregando.value = true
  erroConvenios.value = ''

  try {
    const lista = await buscarConveniosIntegrados()
    const normalizados = lista
      .map((item) => criarOpcaoConvenio(item))
      .filter((item): item is ConvenioOption => Boolean(item))
      .reduce<Map<string, ConvenioOption>>((mapa, item) => {
        const chave = `${item.origem}:${item.id}`
        if (!mapa.has(chave)) {
          mapa.set(chave, item)
        }
        return mapa
      }, new Map())
    const conveniosUnicos = Array.from(normalizados.values())
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    convenios.value = conveniosUnicos

    if (form.convenio && !normalizados.some((item) => item.nome === form.convenio)) {
      form.convenio = ''
    }
  } catch (err) {
    console.error('Erro ao carregar convênios', err)
    erroConvenios.value = 'Não foi possível carregar os convênios'
    convenios.value = []
  } finally {
    conveniosCarregando.value = false
  }
}

const criarOpcaoMedico = (medico: MedicoIntegrado): MedicoSelectOption | null => {
  const nome = medico.nome_completo.trim()
  if (!nome) {
    return null
  }

  const crm = medico.crm_numero?.trim() || medico.crm_numero_original?.trim() || null
  const chaveBase = crm || medico.id
  const codigo = String(medico.id ?? '').trim() || String(chaveBase)

  return {
    id: `${medico.origem}:${chaveBase}`,
    nome,
    crm,
    origem: medico.origem,
    codigo,
  }
}

const carregarMedicos = async () => {
  if (medicosCarregando.value) return

  medicosCarregando.value = true
  erroMedicos.value = ''

  try {
    const lista = await buscarMedicosIntegrados()
    const mapa = new Map<string, MedicoSelectOption>()

    for (const medico of lista) {
      const opcao = criarOpcaoMedico(medico)
      if (!opcao) continue

      const chave = opcao.crm ?? opcao.id
      const existente = mapa.get(chave)
      if (!existente || (existente.origem !== 'integracao' && opcao.origem === 'integracao')) {
        mapa.set(chave, { ...opcao, id: chave })
      }
    }

    medicos.value = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    const nomesDisponiveis = new Set(medicos.value.map((item) => item.nome))
    if (form.medico && !nomesDisponiveis.has(form.medico)) {
      form.medico = ''
    }
    if (form.auxiliar && !nomesDisponiveis.has(form.auxiliar)) {
      form.auxiliar = ''
    }
  } catch (err) {
    console.error('Erro ao carregar médicos', err)
    erroMedicos.value = 'Não foi possível carregar os médicos.'
    medicos.value = []
  } finally {
    medicosCarregando.value = false
  }
}

const atualizarConvenioSelecionado = () => {
  const nomeSelecionado = form.convenio?.trim()

  if (!nomeSelecionado) {
    form.convenio_integracao_codigo = ''
    form.convenio_integracao_origem = ''
    return
  }

  const convenioSelecionado = convenios.value.find((item) => item.nome === nomeSelecionado)

  if (convenioSelecionado) {
    form.convenio_integracao_codigo = String(convenioSelecionado.id)
    form.convenio_integracao_origem = convenioSelecionado.origem
  } else {
    form.convenio_integracao_codigo = ''
    form.convenio_integracao_origem = ''
  }
}

const atualizarMedicoSelecionado = () => {
  const nomeSelecionado = form.medico?.trim()

  if (!nomeSelecionado) {
    form.medico_integracao_codigo = ''
    form.medico_integracao_origem = ''
    return
  }

  const medicoSelecionado = medicos.value.find((item) => item.nome === nomeSelecionado)

  if (medicoSelecionado) {
    form.medico_integracao_codigo = medicoSelecionado.codigo
    form.medico_integracao_origem = medicoSelecionado.origem
  } else {
    form.medico_integracao_codigo = ''
    form.medico_integracao_origem = ''
  }
}

const atualizarAuxiliarSelecionado = () => {
  const nomeSelecionado = form.auxiliar?.trim()

  if (!nomeSelecionado) {
    form.auxiliar_integracao_codigo = ''
    form.auxiliar_integracao_origem = ''
    return
  }

  const auxiliarSelecionado = medicos.value.find((item) => item.nome === nomeSelecionado)

  if (auxiliarSelecionado) {
    form.auxiliar_integracao_codigo = auxiliarSelecionado.codigo
    form.auxiliar_integracao_origem = auxiliarSelecionado.origem
  } else {
    form.auxiliar_integracao_codigo = ''
    form.auxiliar_integracao_origem = ''
  }
}

watch(() => form.convenio, atualizarConvenioSelecionado, { immediate: true })
watch(convenios, atualizarConvenioSelecionado, { deep: true })

watch(() => form.medico, atualizarMedicoSelecionado, { immediate: true })
watch(() => form.auxiliar, atualizarAuxiliarSelecionado, { immediate: true })
watch(
  medicos,
  () => {
    atualizarMedicoSelecionado()
    atualizarAuxiliarSelecionado()
  },
  { deep: true },
)

const formatDateForApi = (value: string) => {
  const [day, month, year] = value.split('/')
  if (!day || !month || !year || day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return ''
  }

  return `${year}-${month}-${day}`
}

const formatDateTimeForApi = (value: string) => {
  if (!value) return ''

  const [datePart, timePart] = value.split(' ')
  const formattedDate = formatDateForApi(datePart ?? '')

  if (!formattedDate) {
    return ''
  }

  if (!timePart) {
    return formattedDate
  }

  const [hours, minutes] = timePart.split(':')

  if (!hours || !minutes || hours.length !== 2 || minutes.length !== 2) {
    return formattedDate
  }

  return `${formattedDate}T${hours}:${minutes}`
}

const rebuildTasks = async () => {
  if (!solicitacaoId.value || rebuildingTasks.value) {
    return
  }

  const confirmado = window.confirm(
    'Esta ação criará tarefas ausentes, removerá tarefas obsoletas e manterá o progresso das demais. Deseja continuar?',
  )

  if (!confirmado) {
    return
  }

  rebuildingTasks.value = true

  const toCount = (valor: unknown) => {
    const numero = Number(valor)
    return Number.isFinite(numero) ? Number(numero) : 0
  }

  try {
    const id = solicitacaoId.value
    const { data } = await api.post<RebuildTasksResponse>(
      `/esteira-procedimentos/${encodeURIComponent(id)}/rebuild-etapas`,
    )

    const created = toCount(data?.created)
    const deleted = toCount(data?.deleted)
    const kept = toCount(data?.kept)
    const expected = toCount(data?.rules_expected ?? data?.expected ?? data?.expected_rules)
    const available = toCount(data?.rules_available ?? data?.available_rules)
    const totalTasks = toCount(data?.tasks_total ?? kept + created)
    const changesDetected = Boolean(data?.changes_detected)
    const mensagemServidor = textoOuVazio(data?.message ?? '')

    const createdEffective =
      created > 0
        ? created
        : changesDetected
          ? Math.max(totalTasks - kept, 0)
          : 0
    const deletedEffective = deleted > 0 ? deleted : 0
    const keptEffective = kept > 0 ? kept : 0
    const houveAtualizacoes = changesDetected || createdEffective > 0 || deletedEffective > 0

    if (expected === 0) {
      if (mensagemServidor) {
        toast.warning(mensagemServidor)
      } else if (available > 0) {
        toast.warning(
          'Nenhuma regra automática corresponde aos dados informados. Revise o convênio selecionado ou as configurações das etapas.',
        )
      } else {
        toast.warning(
          'Nenhuma regra automática está configurada para os tipos de procedimento informados. Ajuste os cadastros e tente novamente.',
        )
      }
      return
    }

    if (totalTasks < expected) {
      const faltantes = expected - totalTasks
      if (mensagemServidor) {
        toast.error(mensagemServidor)
      } else {
        toast.error(
          `Foram identificadas ${faltantes} regra${faltantes === 1 ? '' : 's'} sem tarefas correspondentes. Revise as configurações antes de prosseguir.`,
        )
      }
      return
    }

    if (!houveAtualizacoes) {
      if (mensagemServidor) {
        toast.info(mensagemServidor)
      } else {
        toast.info('Sem atualizações — tarefas já estão alinhadas com as regras atuais.')
      }
    } else {
      toast.success(
        `Tarefas atualizadas: criadas ${createdEffective}, excluídas ${deletedEffective}, mantidas ${keptEffective}.`,
      )
    }

    emit('saved')
  } catch (error) {
    console.error('Erro ao reconstruir tarefas da solicitação', error)

    let mensagem = 'Não foi possível reconstruir as tarefas da solicitação.'
    if (error && typeof error === 'object' && 'response' in error) {
      const resposta = (error as { response?: { data?: { error?: unknown } } }).response
      const detalhado = resposta?.data?.error
      if (typeof detalhado === 'string' && detalhado.trim().length) {
        mensagem = detalhado
      }
    }

    toast.error(mensagem)
  } finally {
    rebuildingTasks.value = false
  }
}

const submit = async () => {
  try {
    if (!form.procedimento_tipo_id || form.procedimento_tipo_id <= 0) {
      erroSelecionarProcedimentoTipo.value = 'Selecione um tipo de procedimento para continuar.'
      activeTab.value = 'Cirurgia'
      return
    }

    let anexosSerializados: SurgicalRequestAttachmentPayload[] = []

    if (anexosAdicionados.value.length) {
      try {
        anexosSerializados = await Promise.all(
          anexosAdicionados.value.map(async (arquivo) => ({
            nome: arquivo.name,
            tipo: arquivo.type,
            tamanho: arquivo.size,
            conteudo: await lerArquivoComoBase64(arquivo),
          })),
        )
      } catch (erroConversao) {
        console.error('Erro ao processar anexos da solicitação', erroConversao)
        toast.error('Não foi possível processar os anexos selecionados. Remova arquivos inválidos e tente novamente.')
        return
      }
    }

    const payload = JSON.parse(JSON.stringify(form)) as SurgicalRequestForm & {
      id?: string
    }
    payload.data_nascimento = formatDateForApi(form.data_nascimento)
    payload.data_cirurgia = formatDateTimeForApi(form.data_cirurgia)

    if (anexosSerializados.length) {
      payload.anexos = anexosSerializados
    }

    const idAtual = textoOuVazio(solicitacaoId.value)

    if (idAtual) {
      payload.id = idAtual
      await api.put(`/esteira-procedimentos/${encodeURIComponent(idAtual)}`, payload)
      toast.success('Solicitação atualizada com sucesso.')
    } else {
      await api.post('/esteira-procedimentos', payload)
      toast.success('Solicitação criada com sucesso.')
    }

    emit('saved')
    emitClose()
  } catch (err) {
    console.error('Erro ao salvar solicitação', err)
    toast.error('Não foi possível salvar a solicitação.')
  }
}
</script>

<style scoped>
@reference '../../../assets/main.css';

.form-section {
  @apply rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40;
}

.form-section__title {
  @apply mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300;
}

.form-section__subtitle {
  @apply mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500;
}

.form-label {
  @apply mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.icon-button {
  @apply flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-lg text-gray-600 transition hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-brand-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700;
}

.icon-button--danger {
  @apply border-red-200 text-red-500 hover:bg-red-50 focus:ring-red-200 dark:border-red-800/40 dark:text-red-300 dark:hover:bg-red-900/30;
}

.choice-pill {
  @apply inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm transition hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/60;
}

.choice-pill__input {
  @apply h-4 w-4 text-brand-500 focus:ring-brand-500;
}

.choice-pill__label {
  @apply select-none;
}

.checkbox-item {
  @apply flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 transition hover:border-brand-200 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/50;
}

.checkbox-item__input {
  @apply h-5 w-5 text-brand-500 focus:ring-brand-500;
}

.checkbox-item__label {
  @apply select-none;
}
</style>
