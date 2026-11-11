# Faturamento por guia — 28/10/2026

Requisitos — 10/11/2026: as três guias são obrigatórias e aplicáveis em todo ciclo, inclusive continuidade. Exigir na Central procedimento de consulta/avaliação, fisioterapia e eletroestimulação com quantidade positiva, além das três guias adequadas (geradas ou recebidas). Fila/indicadores/eligibilidade usam os requisitos atuais; não basta marcador antigo de conclusão. Não permitir marcar eletro como não aplicável. Continuidades dispensam nova avaliação clínica; a guia de consulta é conferida pelo fluxo já concluído da origem, sem cobrança automática. Preservar BILLED/DELIVERED e histórico anterior. Esta decisão substitui a regra de consulta/eletro opcionais. O helper centralRequirements e o SQL de contagem por tipo mantêm a interface/API/filas alinhadas.

Exibição — 10/11/2026: ocultar na tabela guias não aplicáveis conforme o campo applicable da API, inclusive eletroestimulação ausente no ciclo e consulta de continuidade. Não confundir não aplicável com negada/inelegível: guias aplicáveis continuam visíveis com seus motivos de bloqueio. Preservar registros, arquivos, histórico e regras de elegibilidade.

## Elegibilidade atual e reabertura de etapas — 09/11/2026

Faturar segue a sequência vigente das abas: Recepção, Avaliação, Central de Guias e Liberação precisam estar concluídas, com documentos obrigatórios ativos e adequados. Reabrir qualquer pré-requisito, reabrir a avaliação ou remover/inadequar uma guia obrigatória retira o ciclo da fila imediatamente. Repor o arquivo sozinho não basta se uma etapa permanecer aberta. Continuidades dispensam nova avaliação e guia de consulta conforme a regra existente.

Esta decisão alinha a fila à validação já aplicada na aba/API e substitui a referência histórica à consulta faturável durante uma Liberação ainda aberta. Após concluir as etapas, consulta continua independente da conclusão das sessões; fisioterapia/eletro mantêm seus requisitos clínicos e de liberação. Exclusão de anexos opcionais não cria uma pendência obrigatória. Nenhum registro BILLED/DELIVERED ou histórico é apagado/revertido automaticamente.

Lista, contadores, gráfico, filtro billing_status e indicador analítico usam billingDueSQL, agora condicionado às mesmas dependências de treatmentStages (via treatmentStageSql) e aos documentos atuais. A resposta por guia usa a mesma regra em JavaScript e informa blocking_reason; a API impede faturar sem elegibilidade. A etapa operacional deriva da primeira pendência atual, priorizando avaliação/Central sobre status clínicos antigos. As filas Aguardando Avaliação/Central usam o mesmo cálculo do gráfico. Sem migration nem alteração automática de estados.

Regressão MySQL isolada em deploy/test-guide-billing.cjs reproduz reabrir Liberação/Central, excluir documento, restaurar e finalizar; confere filas, dashboard, status por guia, documentos inadequados, etapas ausentes, continuidades, anexos opcionais e faturamentos preservados. deploy/test-guide-dashboard.cjs verifica os conjuntos exatos das onze etapas e suas contagens.

A aba Faturamento, dentro da Gestão de Tratamentos, lista Consulta/Avaliação, Fisioterapia e Eletroestimulação de cada ciclo do mesmo tratamento raiz. Não mistura tratamentos independentes do paciente. Cada tipo representa uma cobrança lógica; PDF original, ajustado e suas versões não são novas cobranças. Arquivos existentes aparecem como referência.

## Disponibilidade e filas

Consulta pode ser faturada após a avaliação digital concluída, sem esperar a liberação das sessões. O tratamento aparece simultaneamente na fila operacional de liberação e em Faturar. Marcar a consulta Faturada remove somente essa pendência; não altera autorização, documentação, sessões ou finalização da Central. Fisioterapia e eletroestimulação aparecem novamente em Faturar ao concluir o tratamento/ciclo ou alcançar a quantidade autorizada positiva, com liberação válida. Quantidade autorizada nula/zero não comprova conclusão. Finalizar o card visual não substitui concluir sessões.

Eletroestimulação é aplicável quando há guia ou procedimento correspondente; também pode ser incluída/excluída explicitamente na edição do faturamento. Não bloquear a cobrança de fisioterapia pela ausência de eletroestimulação opcional. Continuidades não cobram outra consulta/avaliação; cada ciclo mantém seus estados e histórico independentes.

Situações: Pendente (exibição derivada Aguardando avaliação, Aguardando conclusão ou A faturar) e Faturada. Registros antigos DELIVERED são preservados como Encaminhada (legado). Reabrir para Pendente exige confirmação na interface e auditoria. Marcar Faturada é controle manual do Realmed: não transmite cobrança, gera fatura nem altera valores no Stenci. Não há valor financeiro inventado.

## Modelo e compatibilidade

Migration 20261028000002 cria guide_billing_items, único por guide_process_id/document_type, com status, aplicabilidade opcional, revisão, observações, autor e data. Backfill preserva faturamentos BILLED/DELIVERED anteriores, sem marcar cobranças novas automaticamente. Reexecutar a migration não sobrescreve estados. O histórico GUIDE_BILLING_UPDATED registra alterações na mesma transação. Revisões concorrentes são rejeitadas com 409. Alterações genéricas de billing_status são bloqueadas; usar a aba própria.

O campo global billing_status é um resumo: nunca recebe BILLED apenas por cobrar a consulta enquanto a fisioterapia está pendente. A elegibilidade das filas é calculada pelos dados atuais, sem depender de atualizar esse resumo após cada etapa. services/guideBilling.js centraliza a condição SQL de cobrança pendente, usada pelo dashboard operacional, filtro process_stage=billing e indicador analítico.

Estágios operacionais continuam exclusivos entre si; Faturar é uma fila independente que pode se sobrepor. O total do dashboard conta ciclos distintos, e não a soma das barras. Esta decisão substitui a exclusividade histórica documentada no dashboard da Central. As contagens de cada fila e seus resultados usam a mesma condição no banco.

## Acesso e tela

Permissão independente guide_billing (Visualizar e Editar), sem concessão automática a usuários existentes. Administradores mantêm acesso integral. É preciso visualizar Tratamentos também. Menu/aba visíveis; falta de acesso mostra Usuário sem permissão a essa função. Backend revalida permissões para leitura e alteração, inclusive por API. O faturamento independe de reabrir avaliação/Liberação/Documentos já concluídos, pois não modifica essas etapas.

A tela usa DataList, seleção, barra de ações e modal de edição. Selecionar não altera status. Consulta com avaliação incompleta e sessões não concluídas são bloqueadas no backend ao tentar faturar. Atualizar pode recarregar dados; falha de salvamento preserva o formulário. O tratamento pode ser aberto diretamente na aba por billing=1; a fila Faturar usa esse destino.

## Verificações

Testes MySQL isolados: faturamento antecipado, filas simultâneas, preservação da autorização, retorno após sessões, eletro opcional, revisão, reabertura, continuidade, permissões e migration idempotente. Verificação de UI com dados fictícios cobre seleção/edição, bloqueio de fisioterapia antecipada, persistência visual, celular e ausência de acesso. Revalidar dashboards, continuidade e padrão de telas. Não criar pacientes de teste na produção.

Liberação individual: consultar `LIBERACAO_CONVENIO.md`. Negativa/recurso bloqueiam a elegibilidade daquela guia, sem alterar as demais. Terapias no fluxo individual exigem a própria liberação.
