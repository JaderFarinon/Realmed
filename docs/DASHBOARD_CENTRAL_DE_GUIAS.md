## Requisitos atuais após reabrir/excluir dados — 09/11/2026

Faturar exige as etapas anteriores finalizadas e documentação obrigatória atual e adequada, além da elegibilidade por tipo. Reabrir/excluir/inadequar requisitos remove o ciclo dessa fila, sem desfazer cobranças registradas. A classificação operacional prioriza a primeira etapa pendente (Recepção/Avaliação ou Central) antes de reutilizar status clínicos antigos. Aguardando Avaliação/Central na Gestão e no gráfico compartilham o mesmo filtro. Ver FATURAMENTO_POR_GUIA.md: esta regra atualiza os critérios históricos abaixo e segue o fluxo sequencial vigente.

## Destino dos estágios do dashboard — 09/11/2026

Todos os cliques de barras e indicadores abrem Gestão de Tratamentos na aba Todos com process_stage preenchido. A aba Todos permanece selecionada independentemente de o estágio também ter uma aba operacional (inclusive Faturar e Liberação parcial). Remover o chip remove somente o filtro e mantém Todos. Recarregar preserva queue=ALL. Selecionar manualmente uma aba operacional continua aplicando sua fila própria. Estágios futuros do gráfico não precisam de uma aba operacional correspondente.

# Dashboard da Central de Guias — 27/10/2026

Central de Guias → Dashboard apresenta gráfico de barras horizontais e indicadores por estágio, com contagem visível e acesso à fila pelo clique. Estágios: Aguardando Avaliação, Aguardando Central de Guias, Pendente de Liberação, Encaminhado ao Convênio, Pendência do Convênio, Não Liberado, Em Recurso, Liberado, Em Tratamento e, por último, Faturar.

A unidade é o tratamento/processo (guide_processes), que reúne suas guias e versões; não é paciente único nem quantidade de PDFs. Cada processo aparece em um único estágio. Primeiro saem os itens com billing_status DELIVERED/BILLED; depois têm prioridade Faturar, Em Tratamento e situações de autorização. Antes do envio ao convênio, avaliação não concluída leva a Aguardando Avaliação; avaliação concluída e autorização READY leva a Pendente de Liberação; a preparação restante fica com a Central de Guias.

Faturar inclui tratamento com treatment_status COMPLETED ou guia liberada (AUTHORIZED/SESSION_TOKEN/NOT_REQUIRED) cujas sessões realizadas atingiram ou ultrapassaram o total autorizado positivo. Sessões autorizadas nulas ou zero não comprovam conclusão. requested_sessions não substitui o total autorizado para essa decisão. Inclui faturamento NOT_READY/READY; DELIVERED/BILLED já avançaram além dessa fila. A classificação não altera o tratamento, não lança faturamento e não usa a simples finalização visual de um card como conclusão clínica.

Backend: services/guideDashboard.js centraliza o CASE SQL usado por GET /api/dashboard e pelo filtro process_stage em GET /api/guide-processes. O mesmo critério alimenta gráfico, indicadores e filas, sem duplicar processos. Permissão guide_processes/view. Sem migração ou mudança de permissões. A consulta usa dados locais do Realmed.

Frontend: GuideProcessStageChart, Dashboard.vue e filtro Estágio do processo na Gestão de Tratamentos. Cada barra e indicador abre queue=ALL&process_stage=<key>; chip removível mostra o filtro e a URL preserva/remover o parâmetro ao alterar/limpar. Barras mostram rótulos e quantidades também com zero; Faturar é destacado. Carregamento/falha inicial não mostram indicadores zerados fictícios; erro de atualização preserva o último resultado e exibe aviso. Layout legível em celular, com rolagem vertical normal.

Validação: deploy/test-guide-dashboard.cjs cria MySQL temporário isolado e confere conjuntos exatos, exclusividade, sessões positivas/nulas/zero, conclusões, faturamento já entregue/faturado, filtro inválido e acesso negado. frontend/scripts/verify-guide-dashboard.cjs verifica barras, contagens, clique/remoção de filtro, atualização, falha/recuperação, base vazia e telas desktop/celular. Manter verify-screen-pattern.cjs.

## Continuidade de guias — 27/10/2026

Ver docs/CONTINUIDADE_DE_GUIAS.md. Adicionar Guias na Liberação abre novo ciclo vinculado ao mesmo tratamento, com liberação e sessões próprias, sem nova avaliação. Histórico e faturamento de cada guia são preservados. Na continuidade, somente a nova guia de fisioterapia é obrigatória; avaliação reaproveitada é somente leitura. O dashboard conta cada ciclo e mantém as guias anteriores pendentes de faturamento.


## Faturamento por guia — 28/10/2026

Ver [FATURAMENTO_POR_GUIA.md](FATURAMENTO_POR_GUIA.md). Consulta pode ir a Faturar após avaliação, simultaneamente à liberação. Cobrar a consulta não fatura fisioterapia/eletro; estas retornam a Faturar ao concluir sessões. O dashboard permite sobreposição da fila Faturar e conta total distinto. Permissão própria guide_billing, sem concessão automática.
