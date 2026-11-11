## Exibição de guias aplicáveis — 10/11/2026

As tabelas de Liberação e Faturamento mostram somente guias com applicable verdadeiro. Eletroestimulação ausente no ciclo não aparece como Não aplicável; consulta não aplicável em continuidade também fica oculta. Usar a aplicabilidade calculada pela API, sem inferir pela situação da autorização: guias aplicáveis negadas ou em recurso continuam visíveis. Seleção individual após atualização deve descartar uma guia que deixou de ser aplicável. Não excluir registros, documentos ou histórico nem alterar os critérios de conclusão/faturamento.

## Alteração conjunta de status — 06/11/2026

A seleção múltipla agora serve para mudar status, inclusive Pendente → Encaminhado ao convênio. Em Editar aba, marque duas ou três guias aplicáveis; use Alterar status das guias selecionadas ou um status horizontal disponível. O modal oferece somente destinos válidos para todas as selecionadas, com motivo e dados obrigatórios conforme o destino. Não permite pular etapas. Guias não aplicáveis ou sem transição disponível continuam bloqueadas. Etapa finalizada exige reabertura.

POST /api/guide-processes/:id/authorization/status-together exige authorizations/edit e reutiliza as validações individuais em uma transação: reserva de edição, tratamento aberto, documento, avaliação, revisão, pendências, faturamento, quantidade realizada e auditoria. Se uma guia falhar, desfaz todas. A rota release-together anterior preserva destino fixo AUTHORIZED para compatibilidade. Campos compartilhados não substituem as quantidades individuais. Marcar checkbox não muda status nem seleciona/desmarca a linha individual. Esta decisão amplia a antiga ação restrita a liberar juntas.

## Liberação conjunta de guias — 28/10/2026

Marcar os checkboxes de duas ou três guias aplicáveis e clicar em **Liberar guias selecionadas juntas** (ícone de confirmação). Selecionar todas considera somente guias em situação que permita liberar; não avança automaticamente uma guia ainda não encaminhada ou com pendência. Selecionar a linha continua abrindo as ações individuais sem editar.

O modal compartilha número da autorização, data, validade e observação, mas mantém quantidade separada por guia (consulta sugere 1; terapias usam quantidade já autorizada ou solicitada). Dados compartilhados diferentes não são mesclados silenciosamente: o campo abre vazio para conferência. Cancelar não grava; confirmar exige `authorizations/edit`, etapa aberta e as validações individuais, inclusive revisão, pendências, datas, faturamento e sessões realizadas.

`POST /api/guide-processes/:id/authorization/release-together` aceita 2–3 tipos únicos, status/revisão esperados e quantidades por item. Status de destino é fixo AUTHORIZED; bloqueia o tratamento e grava todas as decisões/histórico em uma única transação. Falha em qualquer guia desfaz tudo; reenvio com revisão antiga é rejeitado. Guias não selecionadas são preservadas, e a quantidade agregada continua vindo somente da fisioterapia. Não há migração nova nem envio de autorização ao Stenci.

Testes de banco cobrem sucesso com 1 consulta/10 sessões, autorização compartilhada, tipos duplicados, quantidade inválida na segunda guia, revisão desatualizada e rollback inclusive do histórico. Teste visual cobre seleção, cancelamento, falha/reenvio e quantidades individuais.

## Decisão por guia — 28/10/2026

A liberação é registrada separadamente para Consulta, Fisioterapia e Eletroestimulação. Selecione uma linha e use os status horizontais ou o lápis. Cada guia mantém número, datas, quantidade, motivo, revisão e histórico próprios. O convênio pode liberar consulta e fisioterapia e negar eletroestimulação; a negativa não remove as demais autorizações. Recurso também pertence à guia selecionada.

O tratamento usa exclusivamente a autorização e a quantidade da fisioterapia para controlar sessões. A Gestão permite encontrar decisões mistas tanto nas filas correspondentes quanto em Liberação Parcial; o dashboard identifica a liberação parcial antes do início do tratamento. Finalizar Liberação exige decisão final em todas as guias aplicáveis e nenhuma pendência aberta; uma negativa é uma decisão final. A etapa encerrada exige reabertura para alterar.

Eletroestimulação pode ser marcada como aplicável neste ciclo. Consulta não se aplica a ciclos de continuidade sem nova avaliação. Pendências são vinculadas à guia; retornar para análise resolve somente as pendências correspondentes (incluindo pendências conjuntas antigas). Decisões já faturadas não podem regredir. Alterações da fisioterapia não podem invalidar sessões realizadas. Número continua apenas dígitos e datas mantêm as validações descritas abaixo.

Guias negadas ou em recurso não entram como prontas para faturar. A consulta continua elegível após avaliação concluída, desde que não negada/em recurso. Fisioterapia e eletroestimulação, no fluxo individual, exigem a própria liberação e a conclusão do tratamento. Geração de PDF usa os dados de autorização do tipo de guia gerado.

Migration `20261028000003_authorization_by_guide` cria `guide_authorization_items` e vincula decisões/pendências ao tipo de documento. Registros antigos mantêm a decisão conjunta até a primeira alteração individual, quando os três estados são preservados como retrato inicial; nenhuma aprovação é propagada automaticamente entre guias. Rotas antigas de decisão conjunta são bloqueadas depois dessa conversão. Não altera permissões nem envia decisões ao Stenci.

Testes: `deploy/test-authorization-by-guide.cjs` cobre decisões mistas, filas, sessões, faturamento, recurso independente, concorrência e migração idempotente. O teste visual de liberação também cobre decisões diferentes e anexos.

---

# Liberação com o convênio — 27/10/2026

Na aba Liberação do detalhe do tratamento, a faixa horizontal mostra todas as situações: Em preparação, Pendente, Encaminhado ao convênio, Pendência do convênio, Liberado, Negado, Em recurso, Token por sessão e Dispensa liberação. A situação atual recebe cor e indicador; isso não é uma sequência linear de etapas cumpridas. No celular/tablet a faixa permite rolagem horizontal dentro do painel.

Clicar em uma situação disponível abre ListDetailDialog para conferir e confirmar; não muda dados ao selecionar ou cancelar. Acesso exige editar authorizations. Etapa finalizada permanece somente leitura, inclusive na API; reabrir usa o fluxo auditado existente. As mudanças respeitam os estados permitidos, os dados obrigatórios e as guias/avaliação antes de encaminhar. Em preparação/NOT_READY e a passagem inicial para Pendente/READY continuam derivados da preparação/documentação.

Em Recurso é IN_APPEAL, exclusivo da contestação de uma negativa de autorização junto ao convênio: não é recurso de glosa/faturamento Stenci e não libera atendimento. Só é iniciado a partir de DENIED e exige motivo. Pode retornar para análise/encaminhamento ou receber nova decisão. Não permite finalizar a etapa enquanto estiver em recurso. Possui fila própria Em Recurso na Gestão e indicador na Central de Guias.

Pendência do convênio exige descrição e gera item OPEN. Retornar para Encaminhado/Pendente exige observação e resolve os itens abertos atomicamente, com aviso prévio no modal. Não registrar decisão final com pendência aberta. Pendente é o estado anterior ao encaminhamento; Pendência do convênio é uma solicitação de ajuste já recebida do convênio.

Liberado exige quantidade positiva de sessões autorizadas. Negado exige motivo. Dados de autorização incluem número, data, validade, quantidade e observação, conforme o status. Correções e regressões de decisão exigem motivo; alterações de situação são bloqueadas depois que o tratamento avançou para atendimento/faturamento. Dados da decisão atual podem ser corrigidos sem reduzir sessões abaixo das realizadas.

POST /api/guide-processes/:id/authorization/status usa lock do tratamento, expected_status e conferência de versão para editar a mesma decisão final. Mudanças, resolução das pendências e auditoria estão na mesma transação. Novas decisões e correções geram linhas novas em guide_authorizations: anteriores não são sobrescritas por esse fluxo; o detalhe lê por ID decrescente. Histórico apresenta autor, data, situação anterior/nova e motivo. Campos extras não são gravados. Nenhuma chamada ao convênio/Stenci ou faturamento é feita por essa faixa: ela registra o andamento operacional.

Migration 20261027000012_authorization_appeal amplia os enums de guide_processes.authorization_status e guide_authorizations.status com IN_APPEAL, preservando registros; down mantém o valor para preservar histórico. Não modifica dados anteriores nem permissões.

Implementação: AuthorizationWorkflow.vue, services/authorizationWorkflow.js. Verificações: backend/test/authorization-workflow.test.js, deploy/test-authorization-workflow.cjs (MySQL temporário isolado), frontend/scripts/verify-authorization-workflow.cjs, verify-treatment-stages.cjs, verify-forwarding-links.cjs e verify-screen-pattern.cjs (APIs fictícias).

Número da autorização aceita somente dígitos (0–9), preservando zeros à esquerda. Digitação/colagem remove letras e pontuação, com teclado numérico no tablet; a API rejeita conteúdo não numérico nos dois endpoints de gravação de autorizações. O campo continua opcional e limitado a 100 caracteres. Registros anteriores não são alterados.

Data da autorização, quando informada, deve ser igual ou posterior à criação do tratamento e ao último pedido de liberação registrado (encaminhamento ao convênio). A comparação usa dias de calendário do banco, sem conversão UTC; resolução automática de pendência não conta como novo pedido. O detalhe informa authorization_min_date e a API recalcula sob o lock do tratamento nos dois endpoints de gravação. Validade não pode anteceder a autorização. Campos continuam opcionais; histórico anterior é preservado.

Datas de autorização e validade no retorno da API usam YYYY-MM-DD (ou null), diretamente dos campos DATE do MySQL, sem horário/UTC. Isso mantém os calendários preenchidos após liberar, atualizar e reabrir; a apresentação continua dd/mm/yyyy. O ajuste não altera os valores existentes no banco.

## Documentos emitidos na liberação — 27/10/2026

A aba Liberação possui Documentos da liberação: lista pesquisável, seleção e barra de ícones para anexar, visualizar e baixar PDFs. Cada anexo permanece vinculado ao tratamento, com nome original, data/hora e usuário. Múltiplos arquivos coexistem; os originais são preservados. O anexo é opcional e não altera status, checklist das guias ou decisão de autorização.

PDF de até 10 MB por arquivo, validado pelo conteúdo com pdf-lib (PDF protegido por senha deve ser enviado desbloqueado). Arquivos ficam no armazenamento privado existente storage/documents, com nome interno aleatório. A tabela guide_authorization_documents é independente das guias de preparação e das versões de decisão; migration 20261027000013 é aditiva e preserva anexos no rollback.

POST /api/guide-processes/:id/authorization-documents exige authorizations/edit, valida a etapa aberta sob lock e grava arquivo, referência e histórico AUTHORIZATION_DOCUMENT_ATTACHED atomicamente; falhas removem o arquivo novo. GET /api/guide-processes/:id/authorization-documents/:documentId/download exige authorizations/view e confere o vínculo ao tratamento. O detalhe inclui authorization_documents. Etapa finalizada permite consultar e baixar; para anexar, reabrir a Liberação. Sem concessão automática de permissões. Arquivos não substituem guias nem são enviados ao Stenci.

Verificação: deploy/test-authorization-workflow.cjs testa tamanho/tipo/PDF inválido, bytes originais, múltiplos anexos, vínculo, permissões, etapa fechada, rollback e auditoria em MySQL isolado. frontend/scripts/verify-authorization-workflow.cjs cobre nova tentativa após falha, persistência ao recarregar, visualização, download e controles da etapa finalizada.

## Continuidade de guias — 27/10/2026

Ver docs/CONTINUIDADE_DE_GUIAS.md. Adicionar Guias na Liberação abre novo ciclo vinculado ao mesmo tratamento, com liberação e sessões próprias, sem nova avaliação. Histórico e faturamento de cada guia são preservados. Na continuidade, somente a nova guia de fisioterapia é obrigatória; avaliação reaproveitada é somente leitura. O dashboard conta cada ciclo e mantém as guias anteriores pendentes de faturamento.
## Guias da Central na Liberação — 06/11/2026

Cada linha de Consulta, Fisioterapia e Eletroestimulação mostra somente o documento atual daquele tipo no ciclo atual, com nome, versão e botão de olho. A seleção considera versão, data e ID, exclui documentos removidos e também considera o último anexo recebido: entre a última versão gerada e o último anexo, mostra o mais recente por data/ID. Guia unificada aparece em cada tipo associado. Visualização abre PDF em ListDetailDialog usando o download autenticado existente; continua disponível em etapa finalizada e sem editar. O histórico de versões permanece na Central. Não duplica arquivos nem altera decisões/status.

Requisitos atualizados — 10/11/2026: todos os ciclos exigem procedimentos e guias de consulta/avaliação, fisioterapia e eletroestimulação antes de concluir Central e operar Liberação. As três guias são aplicáveis; não permitir desmarcar eletroestimulação. Esta decisão substitui sua aplicabilidade opcional e a dispensa de consulta em continuidade. Rascunhos permanecem permitidos na Central e as decisões/históricos anteriores são preservados.

