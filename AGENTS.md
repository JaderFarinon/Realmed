## RECONHECIMENTO FACIAL ÁGIL — 11/11/2026

Pedido atual substitui contagem e piscada em toda entrada: após Entrar, seis quadros de 480 px/JPEG 0,82 em cerca de 600 ms. Verificação passiva de vivacidade/antifoto, com duas confirmações da mesma identidade; limiar de identidade 0,5, margem 0,04 e qualidade/vivacidade 0,6 preservados. Sequência estática ou mudança apenas de exposição exige desafio adicional de piscada emitido/vinculado pelo servidor, iniciado explicitamente pelo usuário (16 quadros); não permitir desativá-lo no corpo da requisição. Compensar somente sombras moderadas, sem promessa de leitura no escuro/contraluz extremo. Modelos pré-aquecidos, íris/emoções desligadas, rotação/malha/gestos preservados, inferência serializada e sem cache de rosto entre usuários. Via normal analisa três quadros válidos, no máximo seis; imagens repetidas não contam como confirmações independentes. Sucessos e solicitação de confirmação adicional não consomem a cota de falhas. Não persistir capturas nem alterar modelo/cadastros existentes. Ler docs/MODO_FISIOTERAPEUTA.md; explicitar limites, sem alegar equivalência ao Face ID.

## NOVA TELA DE ACESSO DO FISIOTERAPEUTA — 11/11/2026

Ler docs/MODO_FISIOTERAPEUTA.md. Área central ampla de câmera e faixa inferior de ações substituem o layout texto/câmera em duas colunas. Ativar câmera e posicionar antes de Entrar; leitura explícita, sem tentativas automáticas. Cancelar libera mídia/aborta requisições inclusive com permissão/resposta tardia; sair ou ocultar a página cancela. Prévia integral espelhada, contorno ajustado ao vídeo e tablet paisagem prioritário. Preservar reconhecimento no servidor e vínculos/permissões; nenhuma imagem persistida. Respeitar Retry-After. Teste com câmera sintética: frontend/scripts/verify-physio-login.cjs.

## CONTINUAÇÃO PELO CARD DO PACIENTE — 11/11/2026

No detalhe de ciclos na fila Faturar, Gerar Continuação fica no card fixo do paciente, exige authorizations/edit e confirmação de sequência/sessões, sem Editar aba antes. Reutiliza continuidade transacional; require_billing revalida a fila no servidor. Nova linha/ciclo, saldos/documentos/procedimentos independentes, cobrança anterior preservada. Avaliação inicial é snapshot em leitura: aba verde acessível mesmo com Recepção nova pendente, sem reabrir/editar; demais etapas preservam dependências. Manter três procedimentos/guias obrigatórios, sem nova avaliação clínica. Ler docs/CONTINUIDADE_DE_GUIAS.md.

## ESTABILIDADE DA GESTÃO DE TRATAMENTOS — 11/11/2026

DataList mantém linhas durante carregamento; ListTableFrame não mede placeholders e retém as maiores alturas na mesma largura para impedir alternância de pageSize. Não corrigir ciclos apenas com debounce. Gestão serializa consultas e descarta respostas superadas; contadores em uma chamada /guide-processes/queue-counts compartilham filtros/permissões com a lista. SSE tem reconexão progressiva e respeita Retry-After/429; 401/403 interrompem tentativas. Preservar atualização automática, filtros, seleção e paginação responsiva. Ler docs/PADRAO_DE_TELAS.md.

## TRÊS PROCEDIMENTOS E GUIAS OBRIGATÓRIOS — 10/11/2026

Todos os tratamentos/ciclos, inclusive continuidades, precisam de procedimento CONSULTATION, PHYSIOTHERAPY e ELECTROSTIMULATION com quantidade positiva e guia adequada de cada tipo (consulta, fisioterapia, eletroestimulação), gerada ou recebida. Rascunhos continuam permitidos; finalizar Central/avançar operações exige os seis requisitos na interface/API. As três guias são aplicáveis, sem opção de desmarcar eletro. Substitui eletro opcional e dispensa de guia/procedimento de consulta nas continuidades; não exige nova avaliação clínica nem agenda/fatura automaticamente. Preservar arquivos, estados finalizados e histórico já faturado. Ler docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md e docs/FATURAMENTO_POR_GUIA.md. centralRequirements compartilha validação e SQL; filas respeitam procedimentos/documentos atuais.

## RASCUNHO AUTOMÁTICO DA AVALIAÇÃO — 09/11/2026

Avaliação salva rascunho a cada 60 segundos somente ativa, em edição exclusiva, não concluída e com mudanças. Não bloquear digitação nem perder foco; marcar apenas o snapshot enviado como salvo. Evitar sobreposição/confirmar conclusão e limpar temporizador ao sair da aba/edição. Falha preserva memória da tela e notifica, sem armazenamento clínico no navegador. Ler docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md.

## FINALIZAÇÃO DIRETA DA RECEPÇÃO — 09/11/2026

Recepção permite Finalizar etapa em consulta com permissão de edição, sem Editar aba antes. Confirmação reserva a etapa e recarrega os dados atuais; não reenviar campos não editados. Preservar confirmação, validações e conflito de edição. Salvar/editar/reabrir continuam exigindo edição. Ler docs/PADRAO_DE_TELAS.md.

## CARD ÚNICO DO TRATAMENTO — 09/11/2026

Resumo e Dados do Paciente reunidos no card fixo do nome, sem cards duplicados. Sessões e identificação visíveis; Mais informações reúne complementos e controles existentes; aviso de edição integrado e permanente. Preservar nome grande, rascunhos, permissões e fluxo das etapas. Ler docs/PADRAO_DE_TELAS.md; substitui os layouts históricos de resumo/paciente separados.

## FILAS E REQUISITOS REABERTOS — 09/11/2026

Faturar exige etapas anteriores concluídas e documentos obrigatórios atuais/adequados, conforme a sequência vigente. Reabrir/remover/inadequar requisito retira o ciclo da fila; reposição sem finalizar as etapas não libera. Consulta independe das sessões somente após etapas prontas; esta regra substitui consulta em fila enquanto Liberação aberta. Não reverter BILLED/DELIVERED nem histórico. Primeira etapa pendente orienta fila operacional, mesmo com status clínico antigo. SQL/JS/abas/API devem concordar. Ler docs/FATURAMENTO_POR_GUIA.md e docs/DASHBOARD_CENTRAL_DE_GUIAS.md.

## PUBLICAÇÃO E DEPENDÊNCIAS — 09/11/2026

Release 20261109-154430 publicada com backend/node_modules vinculado à instalação idêntica de 20261109-153438 para contornar limite de I/O do contêiner. Preservar o destino enquanto o vínculo for utilizado; não apagar releases referenciadas na limpeza. Antes de publicar/limpar, ler deploy/README.md e verificar links/manifests. Testes completos e saúde/rollback continuam obrigatórios.

## LISTAGENS COMPACTAS — 09/11/2026

DataList/ListTableFrame: filtros recolhidos por padrão em Filtros com seta; preservar valores ao recolher. Abas/filas ficam no slot tabs, sempre visíveis, assim como indicadores dos filtros aplicados. Títulos compactos e espaçamentos menores em telas baixas; capacidade da tabela medida pelas linhas reais, com paginação acessível em tablet paisagem. Expandir filtros extensos permite rolagem sem cortes. Ler docs/PADRAO_DE_TELAS.md.

## NAVEGAÇÃO DO NAVEGADOR — 09/11/2026

Não adicionar botões ou links de Voltar às telas. Retorno/avanço entre páginas usam os controles do navegador; preservar guards de rascunho e liberação da reserva ao sair. Cancelar/fechar modais, alternar filtros e Ir ao topo são ações locais. Ler docs/PADRAO_DE_TELAS.md.

## PERMISSÕES E FILTROS DO DASHBOARD — 09/11/2026

Login/raiz/logo escolhem primeira tela autorizada, sem exigir Tratamentos para contas de estoque. Middleware de módulo só pode atuar nos endpoints do próprio módulo, nunca interceptar outros routers montados em /api. Matriz individual agrupada com Habilitar tudo, Sem excluir, Só visualizar e Limpar; setor ativo exigido para criar requisições/retiradas. Nenhuma concessão automática. Ler docs/USUARIOS_E_PERMISSOES.md. Barras e cards do dashboard sempre abrem Todos com process_stage, mesmo para Faturar/Liberação parcial; remover filtro mantém Todos. Abas operacionais continuam selecionáveis manualmente.

## NOTIFICAÇÕES GLOBAIS — 09/11/2026

Exceção atualizada: informações das filas em Gestão de Tratamentos usam notificação azul de 10 segundos, com nome da fila e descrição, sem bloco abaixo das abas ou mudança de seleção/filtros. Duração padrão das demais notificações continua cinco segundos.

Avisos transitórios usam useNotifications/useFeedback e NotificationHost em App.vue, no canto superior direito, por 5 segundos: sucesso verde, informação azul, aviso amarelo e erro vermelho, com ícone e X. Não persistir mensagens nem roubar foco. Máximo de quatro; deduplicar mensagem/tipo enquanto visível. Confirmações/credenciais/formulários continuam em modais; contexto permanente (editor atual, estado e validações com links) permanece no formulário. Bloqueio de etapa finalizada notifica somente por tentativa de interação, sem reabrir ou destravar. Esta decisão substitui o padrão anterior de avisos informativos em modais e parágrafos apagados. Ler docs/PADRAO_DE_TELAS.md.

## AVISOS EM MODAIS — 06/11/2026

No detalhe do tratamento, avisos de leitura e edição por outro usuário usam ListDetailDialog ao entrar na aba, sem repetição por atualização automática. Identificação compacta permanente do outro editor continua visível. Etapa finalizada não exibe alerta permanente: somente a tentativa de interagir com campo bloqueado abre modal explicando como reabrir. Preservar bloqueios/API, verdes das abas e conclusão clínica. Esta decisão substitui o aviso CompletedStageAlert permanente e o alerta nativo do navegador.

## CENTRAL UNIFICADA E ETAPAS SEQUENCIAIS — 06/11/2026

Preparação e Documentos agora formam uma única aba **Central de Guias**, com dados, procedimentos, anexos e geração de guias. Ordem obrigatória: Recepção → Avaliação → Central de Guias → Liberação → Faturamento. Cada etapa exige a anterior concluída, na interface e na API; abas bloqueadas ficam cinza e usam `aria-disabled="true"`; clique/ativação exibe alerta com a primeira etapa pendente, sem navegar. Histórico permanece disponível. Esta decisão substitui o fluxo paralelo anterior. Central tem um único Salvar rascunho/Finalizar etapa; finalizar exige documentos obrigatórios. Os marcadores persistidos `central`/`documents` são tratados como uma etapa: conclusão antiga de Documentos é preservada, preparação isolada não conclui a etapa unificada, finalizar/reabrir grava ambos atomicamente. Reabrir anteriores exige reabrir dependentes concluídas primeiro. A reserva de edição de documentos usa a mesma chave `central`. Avaliação continua sincronizando dados e rodízio antes da abertura da Central; continuidades dispensam nova avaliação conforme regra existente.

## CONFIRMAÇÃO DO RODÍZIO — 06/11/2026
Ler docs/RODIZIO_FISIOTERAPIA.md. Modal com checkbox obrigatório “Agendei o paciente no Stenci” e Confirmar. Persistir consultas e confirmações e exibir histórico/nome na avaliação. Como a confirmação acontece depois do agendamento manual, não reconsultar vagas livres nem sortear outro profissional; validar a sugestão persistida mais recente, autor, configuração e etapas sob lock. Esta regra substitui a reconsulta de disponibilidade na confirmação mencionada abaixo. A marcação é declaração do usuário, sem operação remota de agendamento. Executor confirmado segue para Central; avaliador é independente.

## ETAPAS EM PARALELO — 06/11/2026
Recepção finalizada libera Central de Guias e Avaliação simultaneamente. Documentos exige ambas finalizadas; Documentos finalizado libera Liberação; Liberação finalizada libera Faturamento. Central e Avaliação não bloqueiam a reabertura uma da outra. Avaliação pode ser salva/concluída enquanto Central está reservada por outro usuário ou finalizada, preservando os campos administrativos nesses casos. Ler docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md. Esta regra substitui a sequência linear anterior.

## MODO FISIOTERAPEUTA — 29/10/2026
Ler `docs/MODO_FISIOTERAPEUTA.md`. Modo tablet em `/modo-fisio/entrar`, reconhecimento no servidor, descritores cifrados e nenhuma captura de webcam persistida. Usuário Realmed individual precisa de vínculo explícito ao profissional CREFITO/agenda e cadastro facial. Conta Stenci compartilhada em secrets do servidor (`STENCI_FISIO_USERNAME/PASSWORD`) é exceção autorizada somente para este modo; credenciais continuam cifradas em memória por sessão e operações usam login/logoff temporários. Agenda e produção usam contratos existentes/coleta. Não inventar endpoints de evolução, finalizar atendimento ou alteração de status; aguardar contratos do usuário.

## FATURAMENTO POR GUIA — 28/10/2026
Ler docs/FATURAMENTO_POR_GUIA.md. Consulta pode ser faturada após avaliação, enquanto a liberação continua. Fisio/eletro somente após conclusão das sessões; continuidades não repetem consulta. Faturar é fila independente sobreposta, total do dashboard distinto. Status por ciclo/tipo, sem contar versões PDF como cobrança. Permissão guide_billing independente, sem concessão automática. Não marcar billing_status global BILLED apenas pela consulta. API usa revisão/transação/auditoria e bloqueia alterações genéricas do resumo.

## RODÍZIO DE FISIOTERAPIA — 28/10/2026
Ler docs/RODIZIO_FISIOTERAPIA.md antes de alterar agenda/rodízio. Realmed Matriz, sem agendas de avaliação; até 25 minutos, todas as sessões, grupos observados de até seis vagas consecutivas de um minuto. Não inferir vagas em agenda vazia. Vínculo explícito agenda/profissional Stenci por admin. Indicação não agenda/reserva no Stenci. Confirmar reconsulta, registra fila transacional/auditada e mantém responsável pela avaliação independente do fisioterapeuta executor. Login/logoff temporário, sem copiar credenciais do XLSM.

## LIBERAÇÃO COM O CONVÊNIO — 27/10/2026

## CONTINUIDADE DE GUIAS — 27/10/2026

Ler docs/CONTINUIDADE_DE_GUIAS.md. Adicionar Guias em Liberação cria novo ciclo guide_processes ligado à raiz/paciente (treatment_root_id, continuation_of_id, guide_number), sem nova avaliação. Preservar histórico/faturamento anterior: antiga guia concluída segue Faturar; DELIVERED/BILLED não regridem. Nova guia READY/WAITING, saldo zero/autorizadas nulas e documentos próprios; somente fisioterapia é obrigatória na continuidade. Avaliação concluída é snapshot somente leitura; ausência legada não exige nova avaliação. Trava raiz/guia, unicidade e auditoria evitam duplicidade. Não trocar paciente dos vínculos nem copiar procedimentos/documentos automaticamente.

## DASHBOARD CENTRAL DE GUIAS — 27/10/2026

Ler docs/DASHBOARD_CENTRAL_DE_GUIAS.md. Gráfico e indicadores contam cada processo em um estágio exclusivo; services/guideDashboard.js compartilha o CASE com o filtro process_stage da Gestão. Faturar é a última etapa: tratamento COMPLETED ou total positivo de sessões autorizadas realizado em guia liberada, sem billing DELIVERED/BILLED. Não inferir término por zero/null ou apenas pela finalização visual do card; não faturar automaticamente.

## DOCUMENTOS DA LIBERAÇÃO — 27/10/2026

Ler docs/LIBERACAO_CONVENIO.md. Liberação aceita múltiplos PDFs opcionais de até 10 MB, preservados em guide_authorization_documents/storage/documents. Anexar exige authorizations/edit e etapa aberta; leitura/baixar exige authorizations/view e vínculo ao tratamento. Arquivos e auditoria são atômicos; não substituem guias nem alteram status/checklist. Reabrir etapa finalizada antes de incluir. Reutilizar AuthorizationDocuments/DataList/ListDetailDialog.

Ler `docs/LIBERACAO_CONVENIO.md` antes de alterar liberação. Faixa horizontal na aba Liberação usa estados existentes e IN_APPEAL (recurso de negativa de autorização, separado de glosas/faturas Stenci). Seleção abre confirmação, valida requisitos, permissões e etapa aberta; preserva decisões anteriores e histórico. Recurso não libera tratamento nem conclui etapa. NOT_READY/READY iniciais continuam derivados da preparação. Não avançar diretamente por clique sem validação no backend.

# REALMED — CONTEXTO MESTRE DO SISTEMA

## DOCUMENTOS OBRIGATÓRIOS — 27/10/2026

Somente guias de consulta e fisioterapia são obrigatórias; demais anexos são opcionais. Avaliação é digital: não mostrar upload de avaliação recebida nem card separado de ficha PDF. Preservar arquivos antigos em consulta opcional dentro de Documentos. Ler a decisão mais recente em `docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md`; esta regra substitui as listas históricas de três documentos obrigatórios. Não confundir documentação completa com conclusão clínica ou envio ao convênio.

## ETAPAS FINALIZÁVEIS DO TRATAMENTO — 27/10/2026

Ler `docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md` e `docs/PADRAO_DE_TELAS.md`. Cards operacionais têm Finalizar/Reabrir, estado verde, recolhimento e leitura após finalizar. Estados persistem em `guide_processes.workflow_stages`; avaliação mantém conclusão clínica própria. Usar `treatmentStages` para validar bloqueios também nas mutações indiretas/API, com lock do tratamento e auditoria. A ordem é Recepção → Avaliação → Central → Documentos → Liberação → Faturamento; aba futura só abre após conclusão anterior, salvo Histórico que é consulta. Continuidade dispensa nova avaliação. Reabrir etapa anterior bloqueia as posteriores até nova conclusão; não completar ou apagar estados posteriores automaticamente. Etapas com rascunho têm botão padrão **Salvar** com disquete separado de **Finalizar etapa**; salvar não finaliza. Finalizar card não encaminha ao convênio nem muda status de tratamento/faturamento. Resumo e histórico são somente consulta.

## USUÁRIOS E PERMISSÕES — 20/10/2026

Ler `docs/USUARIOS_E_PERMISSOES.md`. Administradores podem criar contas Stenci ou contas locais exclusivas do Realmed; conta local recebe senha com hash bcrypt e não usa integração Stenci nem modo fisioterapeuta. O tipo de autenticação não pode ser alterado após o cadastro. As permissões continuam individuais por módulo/ação e não são concedidas automaticamente. Menu permanece visível; tela sem acesso abre **Sem Permissão** com a mensagem “Usuário sem permissão a essa função”, sem encerrar sessão. Bloqueio preserva usuário e histórico; login Stenci não reativa contas inativas/bloqueadas. Não permitir autobloqueio nem mudança do próprio perfil administrativo. Ainda não há modelos reutilizáveis de cargo; avaliação e Central compartilham a permissão de operar tratamentos. Não afirmar segregação clínica por cargo sem implementar validação nas operações correspondentes.

## ESTOQUE — CONSUMO E COMPRAS (19/10/2026)

Ler `docs/ESTOQUE.md`. Requisições para Consumo registram retirada pelo usuário logado e baixam saldo por setor atomicamente, sem saldo negativo ou dupla baixa por reenvio. Pedidos de Compra usa `/estoque/pedidos`: geração automática por produtos ativos com saldo <= mínimo cria somente rascunho editável; sugere max(1,mínimo-saldo), sem movimentar estoque. Recebimento continua por nota fiscal. Pedidos/atendimentos antigos preservados em Requisições Anteriores. Permissões novas independentes `inventory_consumptions` e `inventory_purchase_orders`; não conceder automaticamente. Esta decisão substitui o fluxo histórico de Pedidos como requisições de retirada.

## Avaliação digital e recepção — 19/10/2026

Ler docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md antes de alterar a avaliação. Recepção cria tratamento somente com paciente e data da avaliação na tela inicial; somente paciente é obrigatório. Dias/horários, início, sessões e procedimentos ficam para avaliação/Central. Após salvar, Dados da recepção e Preparação pela Central de Guias permanecem editáveis em áreas recolhidas no detalhe. Fisioterapeuta usa a ficha digital de oito seções baseada no DOCX original, com lateralidade, mapa, agenda e rubrica para tablet. Rascunho incompleto é permitido; concluir exige confirmação e validação clínica, bloqueia edição e permite reabrir com auditoria. Conclusão não encaminha ao convênio. Não guardar dados clínicos no navegador.


## CÓDIGOS E DE/PARA POR CONVÊNIO — 19/10/2026

Ler `docs/CODIGOS_E_DE_PARA.md` antes de alterar procedimentos ou geração de guias. Procedimentos e substituições são cadastrados juntos em Cadastros → Convênios → Procedimentos do convênio selecionado, com permissão `procedures` e acesso a convênios. A fonte de convênios é a mesma lista Stenci do tratamento; associar pelo external_id. Exemplo: destino 1567 substitui origem 1234 somente naquele convênio. Cadastros antigos e regras avançadas permanecem acessíveis dentro de Convênios, sem entradas avulsas no menu. Regras do convênio prevalecem sobre gerais, depois tabela específica e menor prioridade numérica; considerar vigência e destino ativo. Empates entre destinos diferentes bloqueiam; não inferir equivalência clínica. Toda geração resolve códigos no backend. OCR local de guias recebidas sugere códigos por cadastro, exige conferência e quantidades explícitas; preserva o original e registra a origem/regra no histórico da nova versão. Texto completo não é persistido nem enviado a terceiros.

## MODELO SADT EM HTML — 19/10/2026

O usuário aprovou a reprodução da guia SADT em HTML e solicitou integrá-la à Gestão de Tratamentos. Ler [docs/GUIA_SADT_HTML.md](docs/GUIA_SADT_HTML.md) antes de evoluir esse modelo. O HTML em `backend/templates/sadt/guia-sadt.html` é compilado em `guia-sadt-base.pdf`; o motor existente `pdf-lib` preenche os dados do tratamento em produção, sem Chromium no servidor. Modelos padrão para consulta, fisioterapia e eletroestimulação ficam disponíveis nas opções do tratamento, preservando modelos cadastrados. O logo do convênio do paciente tem área reservada no topo esquerdo, sem o texto “Logo da Empresa”; logo e assinatura são opcionais e usam os assets existentes quando cadastrados. A definição futura de pastas/assinaturas permanece pendente. Gerar preserva originais, mantém versões e respeita permissões e pendências do template; não exige documentação completa nem encaminha ao convênio automaticamente.

## DECISÃO ATUALIZADA — SESSÕES STENCI TEMPORÁRIAS (19/10/2026)

Por solicitação do usuário, não manter sessão Stenci aberta durante o uso do Realmed. Ler [docs/STENCI_SESSOES_TEMPORARIAS.md](docs/STENCI_SESSOES_TEMPORARIAS.md) antes de alterar autenticação ou integração. Login valida auth → branch → me, sincroniza usuário e chama POST /v1/logout antes de emitir o JWT Realmed. Credenciais são guardadas com AES-256-GCM exclusivamente na memória do servidor, vinculadas ao sid/identidade, até logout/expiração do JWT/reinício; jamais em banco, arquivo, frontend, logs ou JWT. Esta é uma exceção explícita às instruções históricas de nunca guardar senha e substitui a decisão de 14/10 de pedir a senha em toda consulta. Cache ausente/expirado usa login/consulta/logoff automático, com agrupamento e serialização por sessão. Senha decifrada, token e cookie externos só existem durante a operação; logoff em finally inclusive em falhas. Cache é publicado somente após encerramento confirmado. Janela de credenciais só aparece se o envelope estiver ausente/inválido ou a senha deixar de autenticar, sem deslogar do Realmed; exige a mesma conta. Falha de rede/logoff não descarta credencial válida nem publica cache novo.

## PADRÃO OBRIGATÓRIO DE TELAS — 14/10/2026

Antes de criar ou alterar qualquer tela, ler [docs/PADRAO_DE_TELAS.md](docs/PADRAO_DE_TELAS.md). O usuário definiu o padrão das listagens do ConectaMed como referência: filtros no card superior; barra de ações por ícones, tabela selecionável e paginação no card inferior. Reutilizar `PageShell`, `DataList`, `ListTableFrame`, `TableActionToolbar`, `TablePagination` e `ListDetailDialog` existentes. Selecionar a linha não abre edição; editar pelo lápis. Ações dependem da seleção e das permissões. Medir capacidade no desktop e permitir rolagem em celular, formulários e detalhes extensos. Não recriar botões por linha nem cortar campos. Validar com `frontend/scripts/verify-screen-pattern.cjs` e atualizar o documento ao evoluir o padrão.

## DECISÃO ATUALIZADA — ESTOQUE E PERMISSÕES (14/10/2026)

Por solicitação explícita do usuário, o módulo de estoque do Estoqy foi incorporado à arquitetura Vue/Express/Knex do Realmed. As permissões operacionais passam a ser habilitadas. Esta decisão substitui as instruções históricas abaixo que diziam para manter permissões desabilitadas.

- Administradores e masteradmin gerenciam permissões em Configurações → Permissões.
- Menu permanece visível para todos; acesso negado abre "Usuário sem permissão a essa função", sem encerrar a sessão.
- Backend valida permissões e o perfil atual no banco, inclusive para chamadas diretas à API.
- Estoque usa saldos por produto e setor, notas fiscais, pedidos com atendimento parcial e estado Aguardando compra.
- Login continua exclusivamente via Stenci; a tarefa anterior de criar dois acessos locais foi cancelada.
- Regras e diferenças em relação ao PHP estão documentadas em `docs/ESTOQUE.md`.

## 1. OBJETIVO DESTE DOCUMENTO

Este arquivo fornece contexto técnico, funcional e operacional completo sobre o sistema **Realmed**.

Ele deve ser utilizado por agentes de desenvolvimento, especialmente ChatGPT/Codex CLI, antes de:

- alterar código;
- criar migrations;
- alterar integrações;
- modificar autenticação;
- alterar fluxos da Central de Guias;
- criar documentos;
- modificar status;
- alterar telas;
- implementar novos módulos.

IMPORTANTE:

**Realmed é o nome do SISTEMA.**

"Central de Guias" é apenas o primeiro grande módulo operacional implementado.

O sistema deverá receber outros módulos futuramente.

Não tratar Realmed como sinônimo de Central de Guias.

---

# 2. PRINCÍPIO GERAL

O sistema Realmed centraliza processos internos da clínica e integra dados do sistema Stenci.

O objetivo inicial é organizar principalmente:

- criação de tratamentos;
- pacientes;
- convênios;
- planos;
- profissionais;
- documentação;
- avaliação fisioterapêutica;
- autorização junto ao convênio;
- acompanhamento do tratamento;
- geração de documentos;
- fila operacional do faturamento.

O Stenci é uma fonte importante de dados externos.

O Realmed possui banco próprio para controlar:

- tratamentos;
- estados internos;
- documentos;
- versões;
- histórico;
- avaliações;
- configurações;
- relacionamentos;
- dados adicionais que não pertencem ao Stenci.

---

# 3. STACK ATUAL

## Frontend

- Vue 3
- TypeScript
- SPA
- Axios
- Vue Router

## Backend

- Node.js
- Express
- JavaScript
- Knex

## Banco

- MySQL local
- estrutura compatível com MySQL/MariaDB quando necessário

## PDFs

Motor já existente baseado em:

- pdf-lib

Não substituir por PDFKit para documentos baseados em template.

O sistema já possui conceito de:

- template PDF;
- coordenadas;
- assets;
- documentos gerados;
- histórico/versionamento.

## Portas observadas em desenvolvimento

Backend:

`3005`

Frontend:

normalmente Vite em:

`5177`

Esses valores podem variar por configuração.

---

# 4. IDENTIDADE DO SISTEMA

Branding principal:

**REALMED**

Não exibir "Central de Guias" como se fosse nome do sistema.

Exemplo correto:

REALMED

Menu:
- Dashboard
- Central de Guias
- Pacientes
- Cadastros
- Integrações
- Configurações

---

# 5. ESTRUTURA DE MENU DESEJADA

## Dashboard

Visão geral operacional.

## Central de Guias

Subitens:

- Novo Tratamento
- Gestão de Tratamentos

## Pacientes

Consulta e gestão de pacientes.

## Cadastros

- Convênios
- Profissionais
- Procedimentos
- Modelos de Documentos

## Integrações

- Stenci

## Configurações

- Usuários
- Permissões

IMPORTANTE:

Permissões operacionais estão habilitadas. Novas contas não recebem permissões automaticamente; administradores configuram a matriz individual por módulo/ação.

---

# 6. CONCEITO PRINCIPAL: TRATAMENTO

O objeto central do fluxo é o:

**Tratamento**

Não utilizar apenas o conceito antigo de "processo de guia".

Um tratamento reúne:

- paciente;
- convênio;
- plano;
- carteirinha;
- validade;
- fisioterapeuta;
- médico solicitante;
- datas;
- sessões;
- dias de atendimento;
- horários;
- documentos;
- avaliação;
- autorização;
- status;
- acompanhamento.

---

# 7. FLUXO OPERACIONAL REAL DA CLÍNICA

O sistema deve refletir o processo real.

## Etapa física inicial

O paciente chega trazendo os documentos que possui.

A recepção:

1. recebe documentos;
2. adiciona checklist interno;
3. prepara ficha de avaliação;
4. coloca documentação em pasta/saco identificado;
5. encaminha paciente e documentos ao fisioterapeuta.

## Fisioterapeuta

O fisioterapeuta:

1. avalia o paciente;
2. preenche a avaliação;
3. define conduta;
4. define tratamento;
5. define dias;
6. define horários;
7. devolve o processo para a recepção.

## Central de Guias / recepção

A pessoa responsável:

1. localiza paciente;
2. confirma dados;
3. confirma convênio;
4. confirma plano;
5. informa fisioterapeuta;
6. informa médico solicitante;
7. informa data da avaliação;
8. informa início previsto;
9. informa sessões;
10. informa dias/horários;
11. anexa documentos recebidos;
12. gera documentos faltantes ou corrigidos;
13. acompanha checklist;
14. salva o tratamento.

## Faturamento

Depois:

1. acessa Gestão de Tratamentos;
2. verifica documentação;
3. envia ao convênio;
4. registra pendências;
5. registra autorização ou negativa;
6. acompanha tratamento.

---

# 8. REGRA FUNDAMENTAL: SALVAR != ENCAMINHAR AO CONVÊNIO

Uma das regras mais importantes do sistema:

**Salvar tratamento não significa tratamento completo.**

O sistema DEVE permitir criar um tratamento incompleto.

O requisito mínimo para criação é:

- paciente.

Exemplo:

Paciente selecionado
→ Salvar tratamento

Mesmo que ainda estejam faltando:

- convênio;
- plano;
- médico;
- fisioterapeuta;
- sessões;
- datas;
- documentos;
- avaliação.

O sistema salva.

As pendências permanecem visíveis.

---

# 9. TRATAMENTO INCOMPLETO

Tratamento incompleto deve poder:

- ser salvo;
- ser aberto;
- ser editado;
- receber documentos;
- receber dados posteriormente;
- receber avaliação;
- gerar documentos possíveis.

Não deve:

- desaparecer;
- ser rejeitado;
- exigir documentação completa no POST;
- ser automaticamente enviado ao convênio.

---

# 10. ENCAMINHAR AO CONVÊNIO

A validação rigorosa deve acontecer aqui.

Ação:

**Encaminhar ao Convênio**

Somente habilitar quando os requisitos definidos estiverem completos.

Exemplos:

- paciente;
- convênio;
- plano quando aplicável;
- fisioterapeuta;
- médico solicitante;
- sessões;
- documentação obrigatória;
- avaliação concluída/gerada;
- demais dados obrigatórios.

Se houver pendências:

botão fica desabilitado.

Mostrar ao usuário a lista das pendências.

---

# 11. STATUS OPERACIONAIS

Labels visuais desejados:

- Faltando Documentação
- Pendente
- Encaminhado ao Convênio
- Não Liberado
- Liberado

Pode existir alerta secundário:

- Pendência do convênio

Não expor enums técnicos na interface.

---

# 12. ENUMS INTERNOS EXISTENTES

## Documento

- INCOMPLETE
- COMPLETE

## Autorização

- NOT_READY
- READY
- IN_PROGRESS
- PENDING
- AUTHORIZED
- DENIED
- SESSION_TOKEN
- NOT_REQUIRED

## Tratamento

- WAITING
- IN_PROGRESS
- COMPLETED

## Faturamento

- NOT_READY
- READY
- DELIVERED
- BILLED

---

# 13. MAPEAMENTO VISUAL

Exemplo de regra:

`document INCOMPLETE`
→ Faltando Documentação

`document COMPLETE + authorization READY`
→ Pendente

`authorization IN_PROGRESS`
→ Encaminhado ao Convênio

`authorization PENDING`
→ Encaminhado ao Convênio
+ alerta "Pendência do convênio"

`authorization DENIED`
→ Não Liberado

`authorization AUTHORIZED`
→ Liberado

`authorization SESSION_TOKEN`
→ Liberado

`authorization NOT_REQUIRED`
→ Liberado

---

# 14. GESTÃO DE TRATAMENTOS

Tela:

**Central de Guias → Gestão de Tratamentos**

É a fila operacional, principalmente do faturamento.

Abas desejadas:

- Pendentes
- Encaminhados ao Convênio
- Não Liberados
- Liberados
- Faltando Documentação
- Todos

IMPORTANTE:

Tratamento novo incompleto normalmente fica:

`authorization_status = NOT_READY`

Portanto deve aparecer em:

**Faltando Documentação**

e também:

**Todos**

Não necessariamente em:

Pendentes

que pode corresponder a `READY`.

---

# 15. ORDENAÇÃO E FILTROS

Filtros previstos:

- paciente;
- convênio;
- fisioterapeuta;
- médico solicitante;
- autorização;
- documentação;
- tratamento;
- faturamento;
- prioridade;
- data da avaliação;
- data prevista de início.

Ordenações:

- início mais próximo;
- início mais distante;
- avaliação mais recente;
- avaliação mais antiga;
- prioridade;
- criação mais antiga;
- criação mais recente.

Para fila de faturamento:

preferir:

data prevista de início mais próxima
→ prioridade
→ processo mais antigo.

---

# 16. NOVO TRATAMENTO

Tela:

**Central de Guias → Novo Tratamento**

Objetivo:

permitir preparação operacional do tratamento.

---

# 17. BUSCA DE PACIENTE

Fonte principal:

**Stenci**

Endpoint confirmado:

`GET https://api.stenci.pro/v1/patients/search`

Query confirmada:

- `limit=30`
- `offset=0`
- `notFilterBranch=true`
- `search=<texto>`

Exemplo:

`/v1/patients/search?limit=30&offset=0&notFilterBranch=true&search=teste`

Autorização:

`Authorization: JWT <token da sessão>`

---

# 18. AUTOCOMPLETE DO PACIENTE

Não renderizar todos os pacientes diretamente na página.

Usar:

- autocomplete;
- searchable select;
- combobox.

Dropdown:

- position absolute;
- largura igual ao input;
- max-height ~260px;
- overflow-y auto;
- não altera layout;
- não empurra campos;
- fecha após seleção.

Mostrar por opção:

Nome

segunda linha:

CPF
Nascimento
Telefone

terceira opcional:

Convênio
Plano
Carteirinha.

---

# 19. RETORNO REAL DA BUSCA DE PACIENTES

Estrutura observada:

```json
{
  "items": [
    {
      "id": "...",
      "identityId": "...",
      "type": "person",
      "name": "...",
      "identity": {
        "type": "cpf",
        "value": "..."
      },
      "cellphone": "...",
      "phone": "...",
      "email": "...",
      "birthDate": "YYYY-MM-DD",
      "gender": "...",
      "addresses": [],
      "patient": {
        "active": true,
        "cns": null,
        "insurance": {
          "id": "...",
          "name": "...",
          "planId": "...",
          "plan": {
            "id": "...",
            "name": "..."
          },
          "record": "...",
          "validity": "YYYY-MM-DD"
        }
      }
    }
  ],
  "hasMore": false
}
```

Campos podem ser:

- null;
- string vazia;
- ausentes.

Não assumir:

- CPF obrigatório;
- email obrigatório;
- convênio obrigatório.

---

# 20. CONVÊNIOS STENCI

Endpoint confirmado:

`GET https://api.stenci.pro/v1/insurances?limit=0&active=true`

Autorização:

`Authorization: JWT <token atual>`

Resposta:

```json
{
  "hasMore": false,
  "items": [
    {
      "id": "...",
      "name": "...",
      "type": "insurance",
      "imageUrl": "..."
    }
  ]
}
```

Tipos observados:

- insurance
- referral
- particular

Não filtrar somente insurance.

---

# 21. PLANOS STENCI

Endpoint confirmado:

`GET https://api.stenci.pro/v1/insurance-plans?limit=0&offset=0&active=true`

Autorização:

`Authorization: JWT <token atual>`

A resposta associa convênio e plano.

Estrutura:

```json
{
  "id": "<insurance id>",
  "name": "<insurance name>",
  "imageUrl": "...",
  "plan": {
    "id": "<plan id>",
    "name": "<plan name>",
    "type": "...",
    "record": "...",
    "identity": {},
    "table": {}
  },
  "customName": "..."
}
```

IMPORTANTE:

`item.id`
= ID do convênio

`item.plan.id`
= ID do plano

Nunca confundir.

---

# 22. PREENCHIMENTO AUTOMÁTICO DO CONVÊNIO

Ao selecionar paciente:

se existir:

`patient.insurance`

preencher automaticamente:

- Convênio
- Plano
- Carteirinha
- Validade

Mas permitir edição manual.

---

# 23. PROFISSIONAIS STENCI

Endpoint confirmado:

`GET https://api.stenci.pro/v1/professionals?limit=100&offset=0&active=true`

Autorização:

`Authorization: JWT <token atual>`

Estrutura contém:

- id
- identityId
- name
- identity
- cellphone
- phone
- email
- birthDate
- gender

e:

```json
"professional": {
  "active": true,
  "councils": [
    {
      "name": "CREFITO",
      "state": "PR",
      "record": "..."
    }
  ],
  "specialties": [],
  "title": "",
  "signature": "",
  "signatureImageUrl": null
}
```

---

# 24. IDENTIFICAÇÃO DOS PROFISSIONAIS

## Fisioterapeuta

Critério principal:

conselho:

`CREFITO`

Não depender exclusivamente da especialidade.

## Médico solicitante

Critério principal:

conselho:

`CRM`

Isso é importante porque pode haver cadastro inconsistente de especialidade.

Conselho é mais confiável.

---

# 25. DADOS DO TRATAMENTO — LAYOUT

Grid desejado em desktop:

Linha 1:

Convênio — 4/12

Plano — 4/12

Carteirinha — 2/12

Validade — 2/12

Linha 2:

Fisioterapeuta — 6/12

Médico solicitante — 6/12

Linha 3:

Data avaliação — 4/12

Data início — 4/12

Quantidade sessões — 4/12

Linha 4:

Observações — 12/12

---

# 26. SEARCHABLE SELECT

Todos os selects pesquisáveis devem seguir padrão:

wrapper:

```css
position: relative;
width: 100%;
min-width: 0;
```

dropdown:

```css
position: absolute;
top: calc(100% + 4px);
left: 0;
width: 100%;
max-width: 100%;
max-height: 260px;
overflow-y: auto;
overflow-x: hidden;
z-index: 1000;
```

O dropdown nunca deve:

- alterar o grid;
- aumentar a altura da página;
- atravessar várias colunas;
- definir sua própria largura.

**O grid define a largura.**

---

# 27. MÁSCARAS

Interface:

CPF:

`000.000.000-00`

Telefone:

`(00) 0000-0000`

ou:

`(00) 00000-0000`

Datas:

`dd/mm/aaaa`

Horário:

`HH:mm`

Quantidade de sessões:

inteiro positivo.

Carteirinha:

sem máscara rígida.

---

# 28. DIAS E HORÁRIOS

Tratamento pode conter:

- segunda;
- terça;
- quarta;
- quinta;
- sexta.

Cada dia:

- ativo;
- horário.

Exemplo:

Segunda
☑
08:00

Terça
☐

Quarta
☑
08:00

Esses dados alimentam:

- tratamento;
- avaliação;
- ficha PDF.

---

# 29. AUTENTICAÇÃO

O login do Realmed aceita dois tipos de conta:

- `STENCI`: validação externa conforme as seções 30–44.
- `LOCAL`: usuário e senha exclusivos do Realmed, hash bcrypt em `users.password_hash`, sem sessão nem chamadas Stenci. Contas locais não usam integração, vínculo profissional/facial ou modo fisioterapeuta. O tipo não pode ser convertido após o cadastro.

Não persistir senhas em texto puro. A senha local exige ao menos 12 caracteres e limite de 72 bytes.

---

# 30. FLUXO DE LOGIN

Fluxo confirmado:

Login de conta STENCI
→ username + password

Backend Realmed:

`POST https://api-x.stenci.pro/v1/auth`

body:

```json
{
  "username": "...",
  "password": "...",
  "deviceId": "..."
}
```

Resposta:

```json
{
  "user": {},
  "token": "...",
  "licenseExceeded": false
}
```

---

# 31. DEVICE ID

O `deviceId`:

- é criado antes do auth;
- não vem da resposta;
- é reutilizado no branch;
- possui formato de 32 caracteres hexadecimais.

Estratégia usada:

`crypto.randomUUID().replace(/-/g, '')`

Não precisa existir:

`STENCI_DEVICE_ID`

fixo no `.env`.

---

# 32. SELEÇÃO DA BRANCH

Depois do auth:

`POST https://api-x.stenci.pro/v1/me/branch`

body:

```json
{
  "branchId": "...",
  "deviceId": "mesmo deviceId"
}
```

Header correto:

`Authorization: JWT <token>`

IMPORTANTE:

Não usar:

`Bearer`

O Stenci usa prefixo:

`JWT`

---

# 33. BRANCH REALMED

Branch identificada:

Realmed

ID conhecido:

`5ef4aeba8b64ba627e46a8b9`

Essa branch é fixa para o sistema Realmed.

Pode ser configurada em:

`STENCI_BRANCH_ID`

---

# 34. TOKEN PRÉ-BRANCH / PÓS-BRANCH

Fluxo conceitual:

`/auth`
→ token A

`/me/branch`
→ usa `Authorization: JWT token A`

Se branch retornar novo token:

token B substitui token A.

Chamadas posteriores usam o token atual da sessão.

---

# 35. /ME

Depois da branch:

`GET https://api-x.stenci.pro/v1/me`

usando token vigente.

Serve para validar identidade/contexto.

---

# 36. SESSÃO REALMED / STENCI

Depois de autenticação:

Realmed cria seu próprio JWT.

Não colocar token Stenci dentro do JWT do frontend.

JWT Realmed deve conter algo como:

- userId
- sid

Backend mantém:

`sid`
→ StenciSession

server-side.

---

# 37. STENCI SESSION

Pode conter:

- deviceId;
- branchId;
- token atual;
- authenticatedAt;
- contexto necessário.

Nunca conter:

- senha.

---

# 38. STENCI SESSION STORE

Foi definido conceito de:

`StenciSessionStore`

Inicialmente pode usar:

Map em memória.

Deve permitir futura migração para Redis.

Cada usuário/sessão deve ter contexto separado.

Não usar sessão global única.

---

# 39. LOGOUT

Logout Realmed deve:

- invalidar sessão Realmed;
- remover StenciSession correspondente.

Não é necessário logout remoto do Stenci por enquanto.

---

# 40. EXPIRAÇÃO

Quando Stenci responder 401/403 por sessão inválida:

retornar:

`STENCI_SESSION_EXPIRED`

Não tentar reutilizar senha.

Redirecionar usuário ao login.

---

# 41. CREDENCIAIS FIXAS STENCI

Não usar:

`STENCI_USERNAME`

`STENCI_PASSWORD`

para operações interativas.

O usuário fornece credenciais no login.

Conta técnica somente seria usada futuramente em processos automáticos, se necessário.

---

# 42. HEADERS STENCI

Headers relevantes usados pelo cliente:

```text
Accept: application/json, text/plain, */*
Content-Type: application/json
Origin: https://stenci.app
Referer: https://stenci.app/
Accept-Language: pt-BR,...
User-Agent: ...
Authorization: JWT <token>
```

Não reproduzir manualmente headers de navegador como:

- sec-ch-ua;
- sec-fetch-*;
- priority;
- :authority;
- :path;
- :scheme.

---

# 43. BASE URLS STENCI

## Auth

`https://api-x.stenci.pro`

Utilizada para:

- /v1/auth
- /v1/me/branch
- /v1/me

## API operacional

`https://api.stenci.pro`

Utilizada para:

- patients/search
- insurances
- insurance-plans
- professionals
- demais endpoints operacionais.

---

# 44. CONFIGURAÇÃO .ENV STENCI

Estrutura conceitual:

```env
STENCI_ENABLED=true

STENCI_API_X_BASE_URL=https://api-x.stenci.pro
STENCI_API_BASE_URL=https://api.stenci.pro

STENCI_BRANCH_ID=<branch Realmed>

STENCI_TIMEOUT_MS=10000

STENCI_ORIGIN=https://stenci.app
STENCI_REFERER=https://stenci.app/
STENCI_USER_AGENT=
```

Não exigir:

```env
STENCI_DEVICE_ID=
STENCI_USERNAME=
STENCI_PASSWORD=
```

para login interativo.

---

# 45. USUÁRIO LOCAL REALMED

Mesmo autenticando pelo Stenci, Realmed pode precisar de usuário local para:

- created_by;
- updated_by;
- histórico;
- auditoria;
- relacionamentos.

Após login Stenci:

criar ou atualizar usuário local.

---

# 46. IDENTIDADE DO USUÁRIO

Identificador principal:

`stenci_user_id`

baseado em:

`user.id`

retornado pelo Stenci.

Não usar nome como identidade.

---

# 47. RECONCILIAÇÃO

Se usuário já existe localmente:

preferir localizar por:

1. stenci_user_id;
2. email;
3. username/CPF;
4. outras chaves seguras.

Não criar duplicata.

---

# 48. ERRO MYSQL DE LOCK

Foi identificado anteriormente erro:

`errno 4163`

relacionado a nome excessivamente longo em:

`GET_LOCK(...)`

A solução definida:

usar chave curta determinística via hash.

Exemplo:

```js
crypto
  .createHash('sha256')
  .update(String(stenciUserId))
  .digest('hex')
  .slice(0, 32)
```

e prefixo curto.

Não remover lock de concorrência.

---

# 49. PERMISSÕES

Infraestrutura de permissões operacional possui:

- user_permissions;
- modulePermission();
- permissionMiddleware();

**Permissões operacionais estão habilitadas.** Backend valida ação e perfil atual no banco, e contas novas não recebem permissões automaticamente.

---

# 50. PERMISSIONS_ENABLED

Usar configuração:

```env
PERMISSIONS_ENABLED=false
```

Quando false:

usuário autenticado pode usar funções operacionais.

Quando true:

volta a validar permissões.

Não remover infraestrutura definitivamente.

---

# 51. IMPORTANTE: FRONTEND TAMBÉM DEVE RESPEITAR ISSO

Não adianta backend liberar se frontend ainda esconder:

- Gerar;
- Anexar;
- Editar;
- Avaliar;
- Autorizar.

Evitar `canEdit` baseado em `user_permissions` quando:

`PERMISSIONS_ENABLED=false`.

---

# 52. DOCUMENTOS

O tratamento possui documentação necessária à liberação.

Tipos principais:

- Guia de consulta
- Guia de fisioterapia
- Avaliação fisioterapêutica
- Carteirinha
- Outros
- Eletroestimulação quando aplicável

---

# 53. REGRA DE DOCUMENTOS RECEBIDOS E GERADOS

Original recebido nunca pode ser perdido.

Exemplo:

Guia de fisioterapia

Documento recebido:
arquivo_original.pdf

Documento gerado:
guia_ajustada_v2.pdf

Ambos coexistem.

---

# 54. SOURCE DOS DOCUMENTOS

Existem conceitos como:

- UPLOADED
- GENERATED
- IMPORTED

Um tipo pode possuir:

- versão recebida;
- versão gerada.

Gerar uma nova versão não substitui o original.

---

# 55. DOCUMENTO USÁVEL

Documento recebido pode ser marcado:

- Adequado
- Necessita ajuste

Checklist deve considerar válido:

- documento recebido adequado;
ou
- documento gerado com sucesso.

---

# 56. GUIA DE FISIOTERAPIA

Regra operacional importante:

Sessões de fisioterapia utilizam uma guia que deve conter:

- procedimento correto de fisioterapia;
- eletroestimulação.

Se guia recebida estiver errada:

manter original.

Gerar:

**Guia Ajustada**

---

# 57. GUIA DE CONSULTA

Avaliação/consulta pode possuir guia separada.

Se estiver ausente:

sistema deve permitir:

**Gerar Guia**

---

# 58. GERAÇÃO DE DOCUMENTOS

Cards devem oferecer, quando aplicável:

- Anexar documento
- Gerar documento
- Pré-visualizar
- Visualizar
- Gerar nova versão

Não esconder botão Gerar por documentação incompleta.

Gerar um documento é justamente uma forma de resolver pendência.

---

# 59. TIPOS GERÁVEIS OBSERVADOS

Código já trabalhado com:

- CONSULTATION_GUIDE
- PHYSIOTHERAPY_GUIDE
- ELECTROSTIMULATION

Manter conforme templates realmente existentes.

---

# 60. TEMPLATE PDF

Documentos oficiais devem preferencialmente usar PDF real como base.

Não recriar formulários oficiais visualmente do zero quando existe PDF original.

Fluxo:

PDF template
→ pdf-lib
→ overlay de campos
→ PDF gerado.

---

# 61. COORDENADAS

Editor/template pode utilizar:

X medido da esquerda.

Y configurado visualmente a partir do topo.

Motor converte internamente para coordenadas do PDF.

Preview e geração final devem usar o mesmo motor.

---

# 62. ASSETS

Estrutura já utilizada:

- logos;
- assinaturas;
- templates;
- documentos gerados.

Pastas observadas historicamente:

`storage/documents`

`storage/templates`

`storage/generated`

`storage/assets/logos`

`storage/assets/signatures`

Preservar arquitetura equivalente.

---

# 63. LOGO DE CONVÊNIO

Cadastro local de convênio pode possuir logo.

Mesmo com Stenci como fonte operacional, banco local ainda é útil para:

- logo;
- configurações;
- documentos;
- regras internas.

Logo pode ser usada na geração de PDF.

---

# 64. FICHA DE AVALIAÇÃO FISIOTERAPÊUTICA

Foi definido novo modelo de 2 páginas.

Objetivo:

gerar automaticamente o máximo possível de informações.

---

# 65. PRINCÍPIO DA FICHA

A ficha pode ser gerada mesmo quando o tratamento está incompleto.

Quanto mais dados existirem:

mais preenchida ela sai.

Campos desconhecidos:

ficam em branco.

---

# 66. PÁGINA 1 DA FICHA

## Identificação

- Nome
- CPF
- Data nascimento
- Sexo
- Celular
- Telefone residencial
- Convênio
- Carteirinha

## Encaminhamento

- Médico solicitante
- Data do encaminhamento
- Diagnóstico
- CID
- Sessões solicitadas
- Guia/autorização

## Avaliação

- Queixa principal
- História do quadro
- Limitações funcionais
- Exame físico
- Dor EVA
- classificação da dor
- localização

---

# 67. PÁGINA 2 DA FICHA

## Região/membro

- cervical/cabeça;
- ombro;
- braço;
- cotovelo;
- antebraço;
- punho/mão;
- torácica;
- lombar;
- quadril;
- coxa;
- joelho;
- perna;
- tornozelo/pé;
- outro.

Lateralidade:

- direita;
- esquerda;
- bilateral.

Mapa corporal visual deve permanecer no PDF.

---

# 68. GRAVIDADE

- Leve
- Moderada
- Grave

Com justificativa.

---

# 69. RISCO ASSISTENCIAL

- Baixo
- Moderado
- Alto

Acompanhamento individualizado:

- Sim
- Não

---

# 70. PRECAUÇÕES

Opções:

- risco de queda;
- alteração de sensibilidade;
- pós-operatório;
- doença cardiovascular;
- déficit neurológico;
- lesão de pele;
- marcapasso/implante eletrônico;
- gestação;
- trombose/risco vascular;
- dor intensa;
- outro.

---

# 71. CONDUTA

Opções:

- Cinesioterapia
- Alongamento
- Fortalecimento
- Treino funcional
- Terapia manual
- Eletroterapia
- Termoterapia
- Crioterapia
- Propriocepção/equilíbrio
- Treino de marcha
- Orientações domiciliares
- Outra

Campos adicionais:

- objetivos;
- descrição;
- progressão;
- reavaliação.

---

# 72. AVALIAÇÃO DIGITAL

Foi decidido criar avaliação fisioterapêutica dentro do sistema.

Ação na Gestão de Tratamentos:

- Avaliar paciente
- Continuar avaliação
- Ver avaliação
- Editar avaliação

---

# 73. STATUS DA AVALIAÇÃO

- Não iniciada
- Em preenchimento
- Concluída

Fisioterapeuta pode:

- salvar rascunho;
- concluir avaliação.

---

# 74. DADOS DA AVALIAÇÃO DIGITAL

Estrutura prevista:

- chief complaint;
- history;
- limitations;
- physical exam;
- pain score;
- pain classification;
- pain location;
- regions;
- severity;
- justification;
- risk;
- precautions;
- conduct;
- therapeutic goals;
- reevaluation;
- notes.

---

# 75. BANCO DA AVALIAÇÃO

Estrutura sugerida:

`physiotherapy_evaluations`

Campos possíveis:

- id
- treatment_id
- status
- chief_complaint
- current_history
- functional_limitations
- physical_exam
- pain_score
- pain_classification
- pain_location
- severity
- severity_justification
- care_risk
- individual_monitoring
- precautions JSON
- specific_care_notes
- therapeutic_goals
- conducts JSON
- conduct_description
- reevaluation_date
- reevaluation_notes
- regions JSON
- physiotherapist_id
- evaluation_date
- created_at
- updated_at

Adaptar aos padrões reais do projeto antes de criar migration.

---

# 76. RELAÇÃO AVALIAÇÃO → PDF

Ficha gerada combina:

dados administrativos do tratamento
+
dados clínicos da avaliação.

Exemplo:

tratamento contém paciente/convênio/médico.

avaliação contém dor/gravidade/conduta.

PDF contém ambos.

---

# 77. CHECKBOXES NO PDF

Não escrever:

true
false

Renderizar:

☒ selecionado

☐ não selecionado

---

# 78. FICHA NA GESTÃO DE TRATAMENTOS

No detalhe do tratamento:

**Ficha de Avaliação Fisioterapêutica**

Mostrar:

- Não gerada;
- Gerada;
- data da última geração;
- avaliação não iniciada;
- avaliação em preenchimento;
- avaliação concluída.

Ações:

- Preencher avaliação
- Gerar ficha
- Visualizar última
- Gerar nova versão
- Baixar
- Imprimir

---

# 79. VERSIONAMENTO DA FICHA

Não sobrescrever.

Exemplo:

v1

v2

v3

A mais recente pode ser marcada:

Atual.

---

# 80. NOVO TRATAMENTO — SALVAMENTO E UPLOADS

Problema já identificado:

Frontend realizava:

1. criar tratamento;
2. fazer uploads;
3. redirecionar;

tudo dentro do mesmo try.

Se upload falhava:

parecia que tratamento não salvou.

Regra correta:

FASE 1:
criar tratamento.

Se retornou 201:

já está salvo.

FASE 2:
tentar uploads.

Se upload falhar:

tratamento continua salvo.

FASE 3:
ir ao detalhe.

Mensagem:

"Tratamento salvo com pendências."

---

# 81. NÃO DUPLICAR TRATAMENTO APÓS ERRO DE UPLOAD

Depois de POST 201:

não permitir nova submissão cega que crie tratamento duplicado.

O tratamento já existe.

---

# 82. CHECKLIST DE DOCUMENTAÇÃO

Pode mostrar:

0/3

1/3

2/3

3/3

e pendências.

Não bloquear salvamento.

---

# 83. GERAÇÃO COM DOCUMENTAÇÃO INCOMPLETA

Documentos geráveis devem poder ser produzidos quando o processo está:

`INCOMPLETE`

ou:

`NOT_READY`

desde que campos necessários ao template existam.

Não exigir COMPLETE antes da geração.

Isso seria circular.

---

# 84. CAMPOS FALTANTES NA GERAÇÃO

Se PDF requer campos ainda ausentes:

backend deve responder quais faltam.

Frontend mostra:

"Não foi possível gerar. Faltam: ..."

Não esconder o botão.

---

# 85. CADASTROS LOCAIS

Mesmo utilizando Stenci, não remover tabelas locais de:

- patients;
- insurance_providers;
- professionals.

Elas ainda podem ser necessárias para:

- relacionamentos;
- histórico;
- configurações;
- documentos;
- assets;
- regras internas.

---

# 86. EXTERNAL SOURCE

Sincronizações devem preferir:

`external_source = STENCI`

`external_id = <id Stenci>`

Evitar duplicatas.

---

# 87. PACIENTE LOCAL

Ao selecionar paciente Stenci:

localizar por:

`external_source + external_id`

Se existe:

atualizar dados sincronizáveis.

Se não:

criar.

Não identificar exclusivamente por nome.

---

# 88. CONVÊNIO LOCAL

Mesmo princípio:

external_source = STENCI

external_id = insurance.id

Pode existir registro local mínimo para relacionamentos/configuração.

---

# 89. PROFISSIONAL LOCAL

Mesmo princípio:

external_source = STENCI

external_id = professional.id

Preservar:

- conselho;
- UF;
- registro;
- assinatura quando aplicável.

---

# 90. PROBLEMAS DE NAVEGADOR QUE DEVEM SER IGNORADOS

Logs como:

`MaxListenersExceededWarning`

`ObjectMultiplex`

`background-liveness`

`app-init-liveness`

`content.js Feature is disabled`

normalmente vêm de extensão do navegador.

Não alterar Realmed por causa deles.

---

# 91. MIGRATIONS — CUIDADOS

Local:

MySQL.

Produção pode variar.

Problema histórico:

optional timestamp com default inválido.

Para timestamps opcionais:

preferir:

```js
t.dateTime('resolved_at').nullable()
```

ao invés de timestamp com default inadequado.

---

# 92. NÃO EDITAR MIGRATION JÁ EXECUTADA EM PRODUÇÃO

Quando sistema já tem ambiente compartilhado:

criar nova migration.

Em desenvolvimento fresco:

pode ser necessário limpar migration parcial se MySQL aplicou parte do DDL antes do erro.

---

# 93. DESIGN DO SISTEMA

Interface:

- limpa;
- compacta;
- operacional;
- sem cards gigantes desnecessários;
- sem dropdown empurrando página;
- labels em português;
- enums internos escondidos.

---

# 94. PRINCÍPIO DE UX

Recepção não deve precisar entender:

`NOT_READY`

`IN_PROGRESS`

`AUTHORIZED`

etc.

Interface deve falar:

- Faltando Documentação
- Pendente
- Encaminhado ao Convênio
- Não Liberado
- Liberado

---

# 95. NÃO IMPLEMENTAR PERMISSÕES AGORA

Até nova decisão:

foco é funcionalidade.

Não bloquear fluxo porque `user_permissions` está vazio.

Autenticação continua obrigatória.

Autorização fina fica para etapa futura.

---

# 96. SEGURANÇA

Nunca persistir:

- senha Stenci;
- token Stenci no frontend;
- token Stenci em JWT Realmed;
- credenciais em logs;
- secrets em README.

Tokens Stenci permanecem somente backend/server-side.

---

# 97. LOGS

Logs técnicos podem mostrar:

- stage;
- status;
- tokenPresent true/false;
- deviceIdPresent true/false;
- count;
- error code.

Nunca mostrar:

- senha;
- token completo;
- CPF completo desnecessariamente.

---

# 98. TRATAMENTO — REGRA DE EDIÇÃO

Tratamento pode ser aberto e completado progressivamente.

Não exigir preenchimento único em um wizard rígido.

O usuário pode:

criar
→ salvar
→ retornar
→ completar.

---

# 99. FLUXO FINAL ESPERADO

## Recepção

Login Realmed via Stenci.

Novo Tratamento.

Busca paciente.

Seleciona paciente.

Dados são importados.

Salva mesmo incompleto.

Tratamento aparece na Gestão.

## Fisioterapeuta

Abre tratamento.

Realiza avaliação digital.

Salva rascunho.

Conclui avaliação.

## Recepção/Central de Guias

Completa:

- convênio;
- plano;
- carteirinha;
- validade;
- médico;
- fisioterapeuta;
- dias;
- horários;
- documentos.

Gera guias faltantes/corrigidas.

Gera ficha de avaliação.

## Faturamento

Confere pendências.

Quando completo:

Encaminhar ao Convênio.

Depois:

- pendência;
- negativa;
- autorização.

---

# 100. FLUXO STENCI COMPLETO

```text
Usuário
   ↓
Realmed Login
   ↓
POST /api/auth/login
   ↓
gera deviceId
   ↓
POST api-x.stenci.pro/v1/auth
   ↓
token A
   ↓
POST api-x.stenci.pro/v1/me/branch
Authorization: JWT token A
   ↓
token atual / token B
   ↓
GET api-x.stenci.pro/v1/me
   ↓
sincroniza usuário local
   ↓
cria sid Realmed
   ↓
JWT Realmed
   ↓
StenciSessionStore
   ↓
token atual Stenci
   ↓
APIs operacionais
```

---

# 101. APIs OPERACIONAIS STENCI CONFIRMADAS

Pacientes:

`GET /v1/patients/search`

Convênios:

`GET /v1/insurances`

Planos:

`GET /v1/insurance-plans`

Profissionais:

`GET /v1/professionals`

Todas em:

`https://api.stenci.pro`

Header:

`Authorization: JWT <token>`

---

# 102. PRINCÍPIO DE DESENVOLVIMENTO

Antes de qualquer alteração:

1. revisar código atual;
2. verificar o que já existe;
3. não duplicar funcionalidades;
4. não recriar arquitetura paralela;
5. reutilizar serviços/componentes/middlewares existentes;
6. criar migrations somente quando necessário;
7. preservar compatibilidade.

---

# 103. NÃO ALTERAR AUTENTICAÇÃO SEM MOTIVO

A autenticação Stenci foi investigada em detalhe.

O formato correto está confirmado.

Não trocar:

`JWT`

por:

`Bearer`.

Não voltar a usar credencial fixa no `.env`.

Não transformar deviceId em configuração fixa.

---

# 104. NÃO APAGAR INFRAESTRUTURA ÚTIL

Mesmo que algo esteja temporariamente desativado:

não apagar sem necessidade:

- permissions;
- templates;
- document engine;
- local entities;
- history;
- integrations.

Desabilitar de forma controlada quando apropriado.

---

# 105. ESTADO ATUAL DO PROJETO

Funcionalidades que já chegaram a funcionar durante desenvolvimento:

- login Realmed autenticando no Stenci;
- deviceId dinâmico;
- branch Realmed;
- Authorization `JWT`;
- sessão Realmed;
- busca de pacientes Stenci;
- listagem de pacientes no Novo Tratamento;
- integração de convênios;
- integração de planos;
- integração de profissionais;
- seleção de fisioterapeutas por CREFITO;
- seleção de médicos por CRM;
- estrutura de Gestão de Tratamentos;
- cards de documentação;
- infraestrutura de geração de PDF;
- ficha de avaliação em evolução;
- permissões operacionais temporariamente desabilitadas.

---

# 106. PONTOS QUE AINDA EXIGEM REVISÃO/FINALIZAÇÃO

## Novo Tratamento

- concluir layout responsivo;
- garantir selects compactos;
- máscaras;
- salvar incompleto sem erro visual;
- uploads independentes do POST inicial;
- dias/horários.

## Gestão

- garantir tratamento incompleto em Faltando Documentação;
- detalhe funcional;
- ações operacionais visíveis.

## Documentos

- garantir botão Gerar;
- configurar templates reais;
- mapear guia oficial em PDF;
- histórico/versionamento.

## Avaliação

- finalizar formulário digital;
- persistência;
- conclusão;
- integração completa com PDF.

## Workflow

- validar exatamente requisitos para "Encaminhar ao Convênio".

---

# 107. GUIAS OFICIAIS — PRÓXIMA ETAPA

O usuário deverá fornecer novamente os PDFs reais das guias.

Quando recebidos:

1. usar PDF real como template;
2. mapear campos;
3. definir coordenadas;
4. mapear dados do tratamento;
5. definir obrigatoriedade;
6. gerar via pdf-lib;
7. preservar original;
8. criar versão gerada.

Não reconstruir visualmente guia oficial sem necessidade.

---

# 108. NOMENCLATURA

Preferir no código novo:

Treatment / Tratamento

quando se tratar do conceito de tratamento.

Código legado pode ainda usar:

`guide_process`
`guide_processes`

Não renomear tudo de uma vez sem avaliar impacto.

Pode evoluir progressivamente.

---

# 109. REGRA PARA AGENTES

Se encontrar diferença entre este documento e o código:

1. inspecionar código;
2. identificar se comportamento implementado é legado ou alteração recente;
3. preservar decisões funcionais deste documento;
4. não inventar solução silenciosamente;
5. documentar conflito quando relevante.

---

# 110. PRIORIDADE ATUAL

Prioridade de curto prazo:

1. estabilizar Novo Tratamento;
2. garantir salvamento parcial;
3. estabilizar Gestão;
4. completar documentos;
5. implementar/estabilizar avaliação digital;
6. mapear PDFs oficiais;
7. validar fluxo completo até envio ao convênio;
8. somente depois aprofundar permissões e módulos adicionais.

---

# 111. REGRA FINAL

O sistema deve se adaptar ao fluxo da clínica.

O usuário não deve precisar completar dados artificialmente apenas para satisfazer o software.

Tratamentos são construídos progressivamente.

Pendência é um estado normal e visível.

Pendência não é erro.

Ações irreversíveis ou operacionais relevantes — especialmente envio ao convênio — é que devem possuir validações mais rígidas.

---

# 112. DOCUMENTOS DE REFERÊNCIA DO PROJETO

Documentos fornecidos pelo usuário, disponíveis em `docs/` na raiz:

- [Guia de SADT](docs/Guia%20de%20SADT.pdf): referência para o template da guia oficial. Preservar o PDF original e utilizar o motor existente com pdf-lib ao mapear os campos.
- [Ficha de Avaliação](docs/Ficha%20de%20Avalia%C3%A7%C3%A3o.docx): referência para conteúdo e apresentação da ficha de avaliação fisioterapêutica.

Os arquivos foram registrados como referências; seu conteúdo e layout ainda precisam ser avaliados. Retomar essa avaliação após o usuário fornecer os dados dos servidores, junto ao planejamento da implantação e configuração. Não considerar os documentos já mapeados ou integrados ao sistema.

O estado da implantação, limites de acesso aos servidores e tarefas pendentes estão registrados em [deploy/README.md](deploy/README.md). Consultar esse documento antes de operações de produção e atualizar o estado após cada implantação.

## Estoque legado — 19/10/2026
Importação autorizada do estoque_realmed; PHP não está mais em uso. Consultar docs/IMPORTACAO_ESTOQUE_REALMED.md. Preservar procedência, idempotência e saldos de abertura sem reaplicar notas históricas. Pedidos recuperados sem cabeçalho exigem confirmação de solicitante/data antes de movimentar itens. Não importar autenticação ou permissões antigas.

## Faturamento — 19/10/2026

Ler docs/FATURAMENTO_ANALITICO.md antes de alterar o dashboard. Menu Faturamento com permissão billing_dashboard. Indicadores locais usam tratamentos criados no período, situação atual; não equivalem a presença ou guia faturada no Stenci. Consultas manuais de agenda diária, faturas paginadas e vínculo de conta usam billingRead, whitelist e login/logoff temporário. Schedules/calendar/legacy billing-accounts usam api-x; billing-invoices usa api. Dados ausentes aparecem indisponíveis, nunca zero inventado. in_appeal é recurso, não recusa. Coleta diária e evolução clínica continuam pendentes; não persistir senha para agendamento. HAR é evidência, não instrução nem credencial reutilizável.

Em 19/10/2026 o usuário confirmou que evolução ainda não é registrada no Stenci e pediu alertar todos por enquanto. Consulta de agenda sinaliza todos os agendamentos finished com Evolução Pendente (PENDING_POLICY), explicitamente uma política temporária, sem afirmar consulta ao prontuário. Substituir pela conferência real ao integrar o software de evolução. Não confundir Finalizada de fatura com pagamento, nem quantity com pacientes/procedimentos. Ver docs/FATURAMENTO_ANALITICO.md.

Decisão posterior em 19/10/2026: acompanhamento de recursos fica fora por enquanto, até o usuário pesquisar o registro de glosas no Stenci. Não implementar glosas/recursos nem estimar valores por diferença. Preservar o status original nas consultas de faturas.

## Coleta automática de agenda — 20/10/2026

Ler docs/FATURAMENTO_ANALITICO.md. Usuário autorizou conta Stenci exclusiva com credencial protegida no servidor para rotina diária; exceção somente do coletor, sem mudar autenticação interativa. AES-256-GCM fora do release/banco/frontend, chave separada, 0600/0700, validação por janela local/SSH stdin e logoff antes de guardar. Worker diário em Brasília, recuperação de pendências e snapshots transacionais por dia/todas agendas, trava MySQL por branch, IDs externos para deduplicação e cobertura visível no dashboard pelo período de agendamento. Falha/logoff não confirmado preserva último dia válido; dados ausentes não viram zero. Não inferir guias faturadas, tratamento finalizado ou evolução a partir do status da agenda. Consultas manuais ficam recolhidas; glosas/recursos seguem adiados.

## Liberação por guia — 28/10/2026
Ler `docs/LIBERACAO_CONVENIO.md`. Decisões e pendências são por tipo de guia; somente fisioterapia controla a autorização/quantidade agregada do tratamento. Preservar decisões conjuntas antigas e impedir que aprovação/negativa de uma guia contamine outra. Negativas e recursos não ficam prontos para faturar.
