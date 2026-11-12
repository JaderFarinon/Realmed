# Padrão de telas do Realmed

Eventos — 12/11/2026: menu Eventos → Confraternização 2026, com PageShell/DataList/ListDetailDialog. Lista autenticada mostra nome, todos os acompanhantes recebidos (inclusive registros anteriores), total de pessoas e data de confirmação. Totais do evento sempre visíveis; filtros recolhidos por nome, acompanhante e ordenação. Barra com visualizar, atualizar e copiar link público. Atualização a cada 30 segundos somente com página visível, fora do modal, sem sobreposição, respeitando Retry-After e encerrada ao sair. Consulta não modifica confirmações e exige `events/view`.

Confraternização — 12/11/2026: rota pública `/confraternizacao` usa layout próprio de convite, sem menu administrativo/login. Fundo claro, verde e dourado, detalhes do encontro e formulário com nome e contador +/− limitado a zero ou um acompanhante; nome do acompanhante obrigatório quando selecionado. API também rejeita mais de um; preservar confirmações anteriores. Aviso de custos junto ao controle de acompanhante, antes de confirmar; abaixo do botão fica somente “Sua confirmação ajuda a preparar esse encontro especial.” Celular em coluna única, campos de 16 px e controles de toque de 44 px ou mais. Notificações de erro usam o host global e preservam o preenchimento; confirmação persistida mostra recibo contextual. Não expor lista de convidados na rota pública.

Agenda do fisio recolhida — 11/11/2026: grupos de horário iniciam fechados, inclusive a sessão atual. Cabeçalho inteiro é botão com seta e aria-expanded, mantendo intervalo, agenda, situação e contagem visíveis. Expandir por toque/Enter/Espaço exibe os pacientes sem consultar novamente; permitir vários grupos abertos. Nova data ou retorno à tela começa recolhido; atualização da mesma data e troca de abas preservam escolha em memória. Manter layout compacto e bloqueio de atendimento fora do horário atual.

Agenda do fisio — sessão atual, 11/11/2026: pacientes de sessões anteriores/futuras continuam em cards legíveis, com cadeado e estado da sessão, sem link, foco de link ou ação de toque. Somente o grupo do horário atual mostra Abrir e destaque discreto. Estado muda automaticamente pelo relógio do servidor, sem polling; segundo plano exige nova referência ao retornar. Atendimento aberto fora da janela mostra aviso contextual e não mantém a ficha operável. Preservar leitura dos status e layout compacto; erro de tentativa por URL usa notificação global, sem redirecionar para Sem Permissão. Ver MODO_FISIOTERAPEUTA.md.

Densidade do fisio no tablet — 11/11/2026: a pedido do usuário, reduzir aproximadamente 30% o espaço dos componentes da área autenticada. Cabeçalho, abas, cards, status, formulários e detalhes recebem fontes/espaçamentos/alturas menores nas larguras de 640–1368 px ou dispositivos de toque a partir de 640 px. Ações principais/campos de 36 px substituem o mínimo de 48 px apenas nesse contexto; textos auxiliares mantêm piso de 11 px. Não usar zoom CSS, transformação global nem alterar a escala do navegador. Celular, login facial/câmera e demais módulos permanecem com seus padrões. ListDetailDialog aceita dialogClass opcional; a classe physio-settings-dialog compacta somente a revisão dos ajustes de agenda. Manter foco, leitura integral dos rótulos, rolagem e controles acessíveis.

Configurações do fisioterapeuta — 11/11/2026: quarta opção na navegação superior, com controles de toque de 48 px. Tela Ajustes na agenda reúne horários observados por data e formulário de pedido pontual/definitivo, em duas colunas no tablet largo e uma nas telas menores. Dias da semana têm seleção múltipla; revisão usa ListDetailDialog. Enquanto a integração aguarda o HAR, explicar que o envio está indisponível e o preenchimento é temporário, sem avisos de sucesso ou histórico fictícios. Preservar o formulário ao alternar abas; erros de validação usam notificação global. Ver MODO_FISIOTERAPEUTA.md.

Agenda do fisioterapeuta — 11/11/2026: cards por sessão, com número e faixa de horário. Pacientes em três colunas em tablet largo, duas em paisagem menor e uma no celular; compactar cabeçalho/abas/data em telas baixas, mantendo toque mínimo de 48 px. Status com quadrado da cor exata da legenda Stenci e rótulo textual. Toque abre detalhe do agendamento com nome destacado, resumo/serviços, anamnese/evolução e histórico; abas acessíveis por teclado e visíveis abaixo do cabeçalho ao mudar. Em janela muito baixa, cabeçalho deixa de ser fixo. Não criar botões Voltar. Até receber o HAR de gravação, ficha em consulta e comandos clínicos indisponíveis com contexto claro, sem simular início/finalização ou salvar dados no navegador. Ver MODO_FISIOTERAPEUTA.md.

Sino de notificações administrativas — 11/11/2026: botão acessível ao lado do menu do usuário, contador de não lidas e ListDetailDialog para histórico, data/hora e Marcar como lida. Leitura individual persistida; paginação Mais notificações. Novos avisos recebidos durante uso também usam notificação azul global. Consultar a cada 30 segundos somente com página visível e ao voltar ao foco, sem sobreposição; respeitar pausa de 429. Login facial do tablet oferece Entrar com senha, apontando ao login Realmed com destino à agenda própria.

Pausa no login facial — 11/11/2026: dez tentativas sem sucesso iniciam pausa fixa de um minuto, seguida de dez novas tentativas. Exibir a mensagem do servidor e o tempo restante no botão; ao terminar, informar que já pode tentar novamente, sem captura automática. Usar contagem separada de pausas de outras APIs. Login com usuário/senha permanece com as regras existentes. Ler MODO_FISIOTERAPEUTA.md.

Login do fisioterapeuta — 11/11/2026: nova composição dedicada, com uma área central ampla de câmera e faixa inferior de instrução/ações; substituir o layout anterior de duas colunas. Ativar câmera, posicionar e Entrar inicia uma captura breve, sem contagem regressiva nem solicitação de piscar no fluxo normal. Se o servidor pedir confirmação adicional por falta de movimento, explicar e oferecer Confirmar com piscada; manter câmera e aguardar ação explícita. Cancelar disponível durante processamento. Prévia integral e contorno ajustado ao vídeo, controles de toque de 48 px ou mais, paisagem em janelas baixas e retrato. Feedback de progresso em contexto, erros em notificação global com orientação persistente de recuperação. Sem capturar ou tentar autenticar em loop. Ler MODO_FISIOTERAPEUTA.md.

Gestão de Tratamentos — 11/11/2026: desabilitar seleção de texto somente nas linhas de dados da tabela, para o duplo clique abrir o tratamento sem destacar palavras. Clique simples continua selecionando a linha para a barra de ações. Cabeçalho, filtros, formulários e outras tabelas mantêm seleção de texto normal.

Continuação — 11/11/2026: o card fixo do paciente mostra Gerar Continuação para ciclos na fila Faturar, com authorizations/edit. Modal pede sessões e confirmação de sequência; não exige Editar aba. Nova linha/ciclo preserva o anterior e abre Recepção; Avaliação fica verde e acessível para consultar o snapshot inicial mesmo antes da nova Recepção, sem editar/reabrir. Demais etapas mantêm dependências. Reutilizar GuideContinuity e manter regras de três procedimentos/guias; ver CONTINUIDADE_DE_GUIAS.md.

Estabilidade das listagens — 11/11/2026: DataList preserva as linhas durante atualização e bloqueia ações enquanto carrega. ListTableFrame não mede placeholders/carregamento; mantém a maior altura de cabeçalho/linha observada na mesma largura, evitando alternar capacidade quando uma linha alta entra/sai da página. Recalcula ao mudar a largura, menu ou resolução e mantém paginação acessível. Não resolver oscilação apenas aumentando debounce. Gestão de Tratamentos serializa consultas, aplica somente a resposta da última intenção e agrupa os 11 contadores em GET /guide-processes/queue-counts, com os mesmos filtros/permissões da listagem. SSE usa reconexão progressiva em falha/stream curto; 401/403 interrompem tentativas e 429 respeita Retry-After, inclusive no fallback e na listagem. A pausa padrão sem cabeçalho é 60 segundos. Retorno à janela e eventos reais continuam atualizando os dados; sair cancela temporizadores. Testes: verify-treatment-list-stability.cjs, verify-treatment-live-backoff.cjs, verify-screen-pattern.cjs e test-required-central.cjs.

Procedimentos do convênio — 10/11/2026: carregar vínculos na primeira abertura e ao trocar o convênio, com estado Carregando e distinção entre erro e lista vazia. A barra oferece Vincular procedimentos do catálogo geral (ícone de cópia): ListDetailDialog/DataList com pesquisa, seleção múltipla e confirmação. Apenas códigos ativos ainda não vinculados; respeitar criação em Procedimentos, preservar seleção em falha e atualizar a lista do convênio ao concluir. Sem vinculação automática de todos os códigos.

Cadastro rápido de médico — 10/11/2026: Central de Guias oferece + ao lado de Médico solicitante, usando TableActionToolbar e ListDetailDialog. Exige criação em Profissionais e edição exclusiva da Central aberta. Nome, CRM e UF obrigatórios; CBO opcional; tipo Médico/conselho CRM fixos. Reutiliza POST /professionals, seleciona o novo cadastro no rascunho sem recarregar/apagar os demais campos. Salvar rascunho ou gerar guia persiste a seleção no tratamento. Cancelamento/erro não alteram a seleção; erro preserva o formulário; consulta/finalização/reserva de outro editor bloqueiam o +. Não concede permissões nem conclui etapa.

Central de Guias — 10/11/2026: mostrar pendências dos três procedimentos obrigatórios (consulta/avaliação, fisioterapia e eletroestimulação) e das três guias adequadas. Rascunho permanece livre; Finalizar etapa bloqueia e notifica o que falta. As três guias são obrigatórias/aplicáveis inclusive em continuidade, sem controle para desmarcar eletro. Conferir também na API e nas filas; esta regra substitui os documentos opcionais correspondentes.

Relatórios de Faturamento — 10/11/2026: a linha externa representa o relatório atual, com tipo e data/hora de emissão na identificação, sem nome de paciente. Abrir pela barra de ações mostra os pacientes no ListDetailDialog, mantendo pesquisa, histórico individual e impressão. Dados de paciente continuam apenas dentro da consulta do relatório.

Recepção — 09/11/2026: Finalizar etapa fica disponível para quem tem permissão de edição mesmo em consulta, sem exigir Editar aba. A confirmação reserva a etapa e recarrega os dados atuais antes de concluir, sem reenviar campos que não foram editados. Conflitos de edição e validações da API continuam bloqueando a conclusão; cancelar não reserva. Salvar rascunho, editar campos e reabrir continuam exigindo edição.

Identificação unificada no tratamento — 09/11/2026: remover os cards separados Resumo Tratamento e Dados do Paciente. O card fixo do nome reúne identificação, convênio, fisioterapeuta, avaliação, sessões solicitadas/autorizadas/realizadas/restantes e aviso permanente de edição. Médico, início previsto, prioridade, situação clínica, atualização do Stenci e ações existentes ficam em Mais informações dentro do mesmo card, sem repetir dados. Detalhes extensos rolam dentro da expansão; manter o nome grande e espaço útil abaixo do topo no celular/tablet. Preservar controles, permissões, finalização/reabertura e rascunhos. Esta decisão substitui as disposições históricas com dois cards adicionais.

Novo Tratamento tem apenas um botão Salvar tratamento, ao final do formulário. Não duplicar a ação no cabeçalho; manter bloqueio durante importação/gravação e o envio pelo formulário.

Faturamento: fila, contadores e gráfico respeitam as etapas atuais e a documentação obrigatória. Reabrir/excluir um requisito retira o ciclo de Faturar e devolve à fila da etapa pendente. O formulário por guia explica o motivo de bloqueio em contexto e impede Faturada enquanto inelegível. Preservar cobranças/histórico, anexos opcionais e dispensa de avaliação nas continuidades.

## Listagens compactas — 09/11/2026

Filtros em DataList/ListTableFrame iniciam recolhidos em um controle Filtros com seta e abertura por clique/teclado. Campos continuam montados para preservar valores; expandir permite rolagem da página, sem cortar filtros extensos. Abas de filas e indicadores dos filtros aplicados ficam no slot tabs, fora do recolhimento, sempre disponíveis. A Gestão mantém seleção das abas e filtros ao expandir/recolher; a consulta só muda pelas ações existentes.

Títulos de listagem menores (18 px), subtítulo compacto e oculto em telas baixas; reduzir espaçamento dos cards quando a altura disponível for até 760 px. Tabelas aproveitam a altura disponível a partir de 768×480, incluindo tablets em paisagem, com paginação visível e capacidade medida pela altura real das linhas. Telas menores continuam com rolagem. Não fixar a capacidade em uma linha nem cortar conteúdo; manter o nome destacado do paciente no detalhe.

Navegação atualizada em 09/11/2026: não adicionar botões/links de Voltar nas telas. Retorno e avanço entre páginas usam o histórico nativo do navegador. Preservar guards de rascunho e liberação da reserva de edição ao sair. Cancelar/fechar modais, filtros de ativos/excluídos e Ir ao topo são ações locais, sem substituir o histórico.

Permissões: matriz agrupada por módulo, pesquisa de funções, filtro de módulo e atalhos Habilitar tudo, Sem excluir, Só visualizar e Limpar nas funções exibidas. Cada linha permite marcar Todas. Ações dependentes incluem Visualizar; retirar Visualizar limpa as demais. Salvar no rodapé do modal, setor obrigatório para criar requisições/retiradas. Login, logo e retorno ao início abrem a primeira tela autorizada, mantendo Sem Permissão para links sem acesso.

Dashboard de tratamentos: qualquer barra ou card de estágio abre Gestão de Tratamentos em Todos, com filtro process_stage. O estágio não escolhe uma fila operacional; remover o filtro mantém Todos. Novos estágios do gráfico não exigem uma aba correspondente.

Configurações sai da barra lateral e fica no menu do usuário no canto superior direito: Meu Perfil, Configurações e Sair. O nome é botão com aria-expanded; dropdown fecha ao navegar, clicar fora, pressionar Escape ou sair pelo teclado. Setas navegam pelas opções. Meu Perfil permite salvar nome, e-mail e telefone e, para contas locais, trocar senha com senha atual e confirmação; login e perfil de acesso são de consulta; Configurações reúne Usuários e Permissões e mantém acesso administrativo. Logout mantém o fluxo de encerramento existente. Menu lateral: Cadastros, Estoque, Faturamento, Integrações, Pacientes e Tratamentos.

O grupo do menu anteriormente chamado Central de Guias passa a se chamar Tratamentos, mantendo Dashboard, Novo Tratamento, Gestão de Tratamentos e Modo Fisioterapeuta. Central de Guias permanece como etapa específica do tratamento. Rotas existentes são preservadas para compatibilidade com links.

Liberação: seleção múltipla disponível para guias aplicáveis com transições, inclusive Pendente; checkboxes não propagam clique para a seleção da linha. Ação Alterar status das guias selecionadas abre modal com status comuns válidos, ou selecione um dos status horizontais habilitados. Preservar Editar aba, permissões e bloqueio da etapa finalizada; confirmar é transacional e não altera guias desmarcadas.

Na Liberação, a tabela de decisões inclui Documento da guia: nome do documento atual por tipo no ciclo: última versão gerada ou último anexo recebido, conforme o mais recente e botão de olho para abrir em ListDetailDialog. Ausência mostra Nenhum documento disponível. A leitura funciona sem entrar em edição e após finalizar a etapa; não navega para outra aba nem altera a seleção/decisão.

Cards de documentos usam TableActionToolbar com botões de ícones e title/aria-label: olho para visualizar/pré-visualizar, lixeira vermelha para remover, documento com + para gerar, clipe para anexar e setas para substituir. Conferência de original e adequação também usam ícones. Preservar permissões, etapa fechada e desabilitação durante geração.

Ao abrir um tratamento (inclusive trocar de guia ou usar atalhos antigos), selecionar a primeira etapa liberada e ainda não concluída, seguindo a ordem do fluxo. Recepção, Avaliação, Central e Liberação já concluídas são puladas; continuidade mantém a dispensa de avaliação. Se o faturamento também estiver completo, abrir Histórico. Atualizações automáticas e salvamentos preservam a aba escolhida manualmente enquanto ela continuar liberada.

Procedimentos do tratamento na Central usam a barra de ações: adicionar por ícone + antes da lixeira. O + abre ListDetailDialog com procedimento e quantidade; a inclusão só ocorre ao confirmar. Não manter formulário de inclusão abaixo da tabela. Permissões e etapa finalizada bloqueiam as ações.

No detalhe de tratamento, o primeiro card destaca o nome completo do paciente com o token `--realmed-patient-name-size` (28–36 px, negrito 700), maior que o título da página, conforme solicitação explícita do usuário. Inclui número do tratamento e guia, situação, convênio, fisioterapeuta e data da avaliação. O card permanece visível durante a rolagem, inclusive no Histórico. Identificação e aviso de edição compartilham um único contêiner sticky, para não se sobreporem; o aviso de outro editor continua permanente. Nomes podem quebrar linha, sem truncamento. No celular, a data continua nos dados complementares para manter o topo compacto. Diálogos e menu ficam acima desse contêiner. A altura medida desse contêiner define a margem de rolagem dos campos e abas, preservando os destinos dos atalhos.

Na avaliação, a indicação do rodízio abre `ListDetailDialog` com nome, agenda e sessões; checkbox **Agendei o paciente no Stenci** habilita **Confirmar**. O histórico de consultas e confirmações permanece em `DataList` na avaliação, mesmo finalizada, sem controles de edição. O profissional confirmado preenche o executor da Central; o avaliador permanece independente.

Fluxo atualizado: **Recepção → Avaliação → Central de Guias → Liberação → Faturamento**. Preparação e Documentos foram reunidos na Central de Guias: dados, procedimentos, anexos e geração de guias, com um único Salvar rascunho/Finalizar etapa ao final. Cada aba exige a anterior concluída; abas bloqueadas usam fundo cinza e `aria-disabled="true"`. Clicar ou ativar pelo teclado exibe um alerta informando a primeira etapa pendente, sem navegar ou liberar acesso. O clique permanece disponível apenas para explicar o bloqueio; as dependências continuam validadas na API. Histórico continua disponível. Esta regra substitui o fluxo paralelo anterior. A API aplica as mesmas dependências e a finalização da Central exige a documentação obrigatória. Finalizar salva primeiro o rascunho; salvar sozinho não libera a próxima etapa.

Compatibilidade: Documentos concluído no fluxo anterior representa a Central unificada concluída. Preparação antiga concluída isoladamente não libera Liberação. Finalizar/reabrir Central grava os dois marcadores antigos na mesma transação, preservando dados e histórico; reabrir uma etapa exige reabrir suas dependentes concluídas. Documentos e preparação compartilham a reserva de edição `central`. Links antigos `documents=1` abrem Central quando liberada. Testes: `verify-merged-central.cjs`, `test-treatment-stages.cjs` e testes unitários de etapas/reservas.

## Notificações globais — 09/11/2026

Exceção: o ícone de informação das filas da Gestão de Tratamentos abre notificação azul por **10 segundos**, com nome da fila e descrição. Não renderizar descrição abaixo das abas, trocar a fila selecionada ou alterar filtros. Ativar por clique/Enter/Espaço; apenas receber foco não abre aviso. Demais mensagens mantêm cinco segundos; a barra de duração acompanha o tempo de cada notificação.

Mensagens transitórias do sistema usam NotificationHost em App.vue e useNotifications/useFeedback: canto superior direito, sucesso verde, informação azul, aviso amarelo e erro vermelho, com ícone, título, botão X, contraste e sombra. Fechar automaticamente em 5 segundos, sem roubar foco; anunciar por aria-live/role e respeitar redução de movimento. Manter no máximo quatro notificações e não duplicar a mesma mensagem enquanto estiver visível. Não persistir mensagens em armazenamento do navegador. A fila permanece ao navegar para não perder confirmações após salvar.

Sucesso/erro de permissões, usuários, perfil, tratamentos, avaliação, guias, faturamento, cadastros, estoque, pacientes, integração e modo fisioterapeuta seguem esse padrão. Erros de formulário também são notificados sem fechar o formulário ou perder dados. Confirmações, escolhas, credenciais e formulários continuam em ListDetailDialog; indicadores permanentes (editor atual, status da etapa, lista de campos pendentes e dados incompletos) permanecem na tela por serem contexto operacional. Avisos informativos de leitura/bloqueio anteriormente em modal passam a notificações: etapa finalizada avisa somente ao interagir com campo bloqueado; atualizações automáticas não repetem a mensagem. Esta regra substitui o padrão anterior de alertas informativos em modal ou texto discreto.

## Edição exclusiva por aba e atualização automática — 06/11/2026

Gestão de Tratamentos e detalhe recebem avisos SSE autenticados após gravações bem-sucedidas e recarregam os dados permitidos. Reconexão e retorno à janela reconciliam alterações; sem conexão SSE, há tentativa de atualização a cada 30 segundos. Nenhum dado clínico é transmitido no evento, apenas aviso para consultar novamente a API.

Cada aba do detalhe começa em somente leitura. **Editar aba** reserva aquela aba do tratamento para o usuário e janela atuais. Um banner fixo e permanente identifica quem está editando: “Nome está editando a aba Central de Guias. Você pode visualizar, mas não alterar.” O proprietário vê **Terminar edição**. Trocar de aba ou sair libera a reserva; finalizar a etapa também. Rascunhos de recepção/central/avaliação precisam ser salvos antes de trocar de aba. Rascunhos locais não são sobrescritos por atualizações remotas; uma nova reserva exige confirmar o descarte de rascunho antigo e carregar dados atuais.

Reservas ficam no banco em `treatment_edit_locks`, por tratamento/aba, com usuário, identificador aleatório da janela e expiração de 60 segundos, renovada a cada 15 segundos. Outra janela do mesmo usuário começa bloqueada, mas pode **Recuperar edição**, conforme atualização de 11/11/2026 abaixo. As mutações validam a reserva e mantêm o lock da linha até a resposta, usando pool independente para não esgotar conexões das transações operacionais. Liberação e renovação só pela janela proprietária; sem renovação a reserva expira. Campos compartilhados de avaliação/preparação verificam ambas as abas. Permissões e etapas finalizadas continuam obrigatórias. SSE usa um processo API; múltiplas réplicas futuras precisam de distribuição de eventos entre processos, enquanto as reservas já são compartilhadas no banco.

**Recuperação da própria edição — 11/11/2026:** quando a reserva ativa pertence à mesma conta, o card permanente oferece **Recuperar edição**, respeitando a permissão de operar aquela aba. Confirmação em `ListDetailDialog` explica que a janela anterior passa a somente leitura e seus dados não salvos não são transferidos. Após confirmar, transfere a reserva e recarrega os dados atuais; havendo rascunho nesta janela, o descarte continua exigindo confirmação. A identidade vem da sessão autenticada, nunca do corpo da requisição. A transferência compara o identificador observado sob lock transacional; confirmação desatualizada não rouba a nova reserva. Nem administrador pode recuperar reserva alheia. Renovação automática só prolonga uma reserva ainda ativa e pertencente àquela janela; nunca adquire uma reserva expirada/liberada nem desfaz uma recuperação. Exclusão tardia da janela antiga não libera a nova reserva. Reconexão e retorno à janela consultam imediatamente a situação; perda da reserva mantém o rascunho em memória e bloqueia edição. Recuperar reserva não reabre nem finaliza etapa.

Na aba Documentos do tratamento, cards de guias geráveis têm checkbox no canto superior direito, com nome acessível. Duas ou três seleções exibem **Gerar guia unificada** abaixo do conjunto. A conferência de códigos existente é reutilizada; anexos sem procedimentos não recebem seleção. Permissões e etapa finalizada desabilitam a ação.

Este é o padrão obrigatório para alterações e novas telas. Foi definido em 14/10/2026 por solicitação do usuário, usando as listagens do ConectaMed como referência e preservando a identidade REALMED.

Referências analisadas: `ConectaMed/docs/listagens.md`, `TableActionToolbar.vue`, `ListTableFrame.vue`, `DataList.vue`, `TablePagination.vue` e as telas de Médicos e Encaminhamentos. Os componentes do Realmed ficam em `frontend/src/components/`; as regras visuais em `frontend/src/assets/list-workspace.css`.

## Tipografia compartilhada

A fonte do sistema é **Outfit**, com fallback sans-serif. A escala de telas fica em `frontend/src/assets/typography.css`, importada por `main.css`; o menu conserva sua regra compartilhada em `menu-navigation.css`. Usar os tokens `--realmed-*` e os elementos semânticos/componentes existentes. Não declarar fontes, tamanhos ou pesos próprios em cada tela.

| Função | Tamanho | Peso |
| --- | --- | --- |
| Título da página (h1) | 24 px / entrelinha 32 px | 600 |
| Título da janela | 20 px / entrelinha 28 px | 600 |
| Seção (h2) | 18 px / entrelinha 28 px | 600 |
| Subseção (h3) | 16 px / entrelinha 24 px | 600 |
| Texto e células de tabela | 14 px / entrelinha 1,5 | 400 |
| Rótulos de campos | 14 px / entrelinha 1,5 | 500 |
| Cabeçalhos de tabela e grupos de formulário | 14 px / entrelinha 1,5 | 600 |
| Botões e links de ação | 14 px / entrelinha 1,5 | 500 |
| Campos no desktop | 14 px / entrelinha 1,5 | 400 |
| Campos em telas até 1024 px ou dispositivos de toque | 16 px / entrelinha 1,5 | 400 |
| Ajuda, metadados secundários e paginação | 12 px / entrelinha 1,5 | conforme ênfase |
| Números dos indicadores (`typography-metric`) | 28 px / entrelinha 32 px | 600 |

A hierarquia é compartilhada entre tratamentos, avaliação, cadastros, estoque, configurações, integração, login e páginas auxiliares. A área de toque da avaliação continua com os controles maiores existentes. Não reduzir campos no celular para caber no grid; ajustar o layout e permitir rolagem. Não alterar a capitalização de nomes de pacientes, códigos ou textos digitados. A marca REALMED preserva sua grafia institucional.

A escala se aplica à apresentação em tela. Não modificar templates PDF ou o tamanho definido para a impressão dos relatórios. `ListTableFrame` observa tabela e cabeçalho, mede as linhas reais e recalcula a capacidade após carregar fontes, evitando corte da última linha quando o cabeçalho quebra linha.

## Estrutura das listagens

Menu principal em ordem alfabética: Cadastros, Configurações, Estoque, Faturamento, Integrações, Pacientes e Tratamentos. O dashboard operacional fica em **Central de Guias → Dashboard**, na rota `/central-de-guias/dashboard`, com permissão `guide_processes`. `/dashboard` redireciona preservando query e hash. **Faturamento** é um grupo recolhível, com subitem **Dashboard** em `/faturamento/dashboard`; o pai apenas expande/recolhe, sem abrir gráficos. A rota antiga `/faturamento` redireciona para o subitem, preservando query/aba para compatibilidade com links anteriores. Menus permanecem visíveis e as permissões do dashboard de faturamento continuam em `billing_dashboard`.

Estoque separa Requisições para Consumo de Pedidos de Compra. Ambos usam PageShell/DataList e formulário em ListDetailDialog; adicionar itens monta a lista local e somente confirmar registra a operação. Consumo confirmado é somente leitura. Pedido automático abre o rascunho editável, sem finalizar compra; quantidades são editadas na lista de itens e exclusão usa a barra de ações da seleção. Requisições Anteriores preserva o fluxo antigo.

Gestão de Tratamentos possui as abas **Aguardando Avaliação** (avaliação ausente/em preenchimento, tratamento aguardando e autorização ainda não enviada) e **Aguardando Central de Guias** (avaliação concluída, tratamento aguardando e autorização NOT_READY). Ao ficar pronto para encaminhar, passa a Pendente de Liberação; envio ao convênio continua separado. Filas usam `workflow_queue` no backend, com contagem e paginação antes de carregar a página. Não inferir avaliação concluída apenas pela data ou por PDF anexado. Reabrir a avaliação retorna à fila de avaliação se ainda estiver na preparação. Abas anteriores e filtros permanecem disponíveis.

Gestão de Tratamentos exibe **Criado em**, com data e horário de criação. A ordenação inicial e ao limpar filtros é **Criação mais recente**, pelo `created_at` decrescente, com desempate por ID decrescente no servidor. As demais ordenações continuam disponíveis.

Gestão de Tratamentos tem ações na barra superior nesta ordem: adicionar, abrir, editar/avaliar, gerar guias, excluir, mostrar excluídos e atualizar. Excluir usa ícone de lixeira vermelha e move o tratamento para `deleted_at`, preserva dados, documentos e histórico, e grava auditoria; não apaga definitivamente. Mostrar excluídos usa um ícone de lixeira com olho, distinto da ação de excluir. A lista de arquivados permite restaurar com auditoria e os remove das filas e indicadores operacionais enquanto estiverem arquivados. Relatórios históricos de produção/faturamento permanecem preservados.

A Gestão de Tratamentos usa distribuição automática das colunas pelo conteúdo, sem percentuais fixos para Paciente ou Liberação. Nomes de pacientes têm prioridade e podem quebrar linha; convênio e fisioterapeuta também podem quebrar. Datas, sessões, documentação e liberação reservam a largura necessária para o conteúdo, sem reticências nos status. Ao estreitar a área ou abrir o menu, a tabela se reajusta; se a largura mínima legível não couber, a rolagem horizontal fica dentro da tabela. A capacidade de linhas continua medida pelo `ListTableFrame`.

Textos do menu usam iniciais maiúsculas nas palavras principais (por exemplo, “Central de Guias”, “Saldos e Ajustes” e “Notas Fiscais”), mantendo conectivos como “de” e “e” em minúsculas. Não aplicar `text-transform: uppercase` nos grupos ou links. A marca REALMED mantém sua grafia institucional. Todos os links, títulos de grupos e subitens usam a mesma tipografia: Outfit, 14 px (0,875 rem), peso 500, entrelinha 1,5 e espaçamento normal, inclusive ativos e no celular. A regra única fica em `frontend/src/assets/menu-navigation.css`; não declarar tamanhos ou pesos diferentes em `MenuGroup` ou `.menu-link.sub`. A hierarquia é indicada pelo recuo e pelas setas, sem variar a fonte.

Há apenas **um** botão de três pontos para controlar o menu, no cabeçalho (`realmed-menu-toggle`). Não duplicar esse controle dentro do painel lateral: ele precisa usar o estado desktop/mobile correto. No celular, enquanto o painel está aberto, o mesmo botão fica sobreposto ao lado externo do menu para continuar acessível e permitir fechar.

Os grupos Cadastros, Central de Guias, Configurações, Estoque, Faturamento e Integrações usam `MenuGroup`: clicar no título expande/recolhe seus subitens, com seta indicadora e `aria-expanded`/`aria-controls`. Ao carregar ou mudar de função, todos os grupos ficam recolhidos, exceto o que contém a rota atual. Não restaurar grupos abertos de sessões anteriores. O usuário pode expandir um grupo para escolher uma função; ao navegar, o estado volta a seguir a rota ativa. Dashboard geral e Pacientes permanecem links diretos. Recolher um grupo é uma escolha de navegação, sem relação com permissões.

O cabeçalho compartilhado possui botão de três pontos verticais para recolher/expandir o menu. No desktop, recolher libera toda a largura para o conteúdo e a preferência é salva em `realmed_menu_collapsed`. No celular, o botão abre/fecha o menu sobreposto; ao navegar, o menu fecha. O botão permanece acessível, com título, `aria-expanded` e `aria-controls`; menu oculto não recebe foco.

1. `PageShell` apresenta título e descrição curtos, com a propriedade `list` nas listagens principais.
2. Um card superior reúne busca e filtros. Usar rótulos visíveis, limpar filtros e campos compactos. Filtros adicionais extensos podem ser expandidos; nesse estado, permitir rolagem normal para não cortar conteúdo.
3. Um card inferior reúne, nesta ordem, **barra de ações → tabela → paginação**.
4. Usar `DataList`, que compõe `ListTableFrame`, `TableActionToolbar` e `TablePagination`. Não recriar essa estrutura em cada view.

Exemplo:

```vue
<PageShell title="Produtos" subtitle="Cadastros do estoque" list>
  <DataList
    v-model:selected="selected"
    :items="filteredProducts"
    :columns="columns"
    :actions="actions"
    bounded
    selection-key="name"
  >
    <template #filters>
      <div class="list-filter-grid">
        <label class="filter-search">
          Pesquisar
          <input v-model="search" class="input" />
        </label>
      </div>
    </template>
  </DataList>
</PageShell>
```

## Seleção e ações

- Clicar na linha seleciona; clicar novamente desmarca. `Enter` e espaço também selecionam a linha focada.
- **Selecionar não abre nem edita automaticamente.** Abrir usa o ícone correspondente; editar usa o lápis.
- Ações ficam na barra superior. Não acrescentar uma coluna de botões repetidos em cada linha.
- Ações que exigem registro ficam desabilitadas sem seleção, durante carregamento ou quando o estado/permissão não permitir sua execução.
- Limpar seleção ao mudar de página, capacidade ou quando o registro deixa de existir no conjunto filtrado. Recarregar dados atualiza a referência do selecionado.
- Ícones têm área de 40 × 40 px, `title`, `aria-label` e texto acessível. Usar azul para a criação principal e vermelho para exclusão/inativação.
- Preservar regras operacionais: nota fechada e item atendido não tornam editáveis por mudança visual.
- Menus permanecem visíveis. Falta de permissão de acesso abre a página **Sem Permissão**, com a mensagem **Usuário sem permissão a essa função**, sem apagar a sessão. Cadastro administrativo de usuários usa somente conta Stenci, sem senha local; bloqueio preserva histórico. Ver `USUARIOS_E_PERMISSOES.md`.

## Tabela e paginação

- Cabeçalho cinza claro, bordas discretas, células compactas e linha selecionada azul clara.
- Valores cortados com reticências continuam disponíveis no atributo `title` e no detalhe.
- Linhas simples: 48 px. Duas informações sobrepostas: `row-height="64"`.
- Desktop com largura ≥ 1024 px e altura ≥ 650 px: medir a altura disponível com `ResizeObserver` e paginar pela capacidade real. Não fixar 25 linhas nem esconder linhas sem paginação.
- Celular e janelas menores: dez registros por página, rolagem vertical normal e rolagem horizontal somente dentro da tabela.
- Coleções locais: `DataList` pagina `items` internamente.
- APIs paginadas: fornecer `server-total` e `page`, tratar `update:page` e `update:pageSize` e enviar a capacidade ao backend. Não paginar outra vez o lote recebido como se fosse a coleção inteira.
- Exportações utilizam o conjunto autorizado completo dos filtros, independente da página. `all-rows` permite impressão de coleções locais e matrizes de edição sem paginação; não usar para escapar da paginação em listagens comuns.

## Formulários, detalhes e exceções

- Formulários e detalhes de listagens abrem em `ListDetailDialog`. A janela tem título, fechar, rolagem do conteúdo, foco acessível, Escape e restauração de foco.
- Formulários extensos, Novo Tratamento, detalhes clínicos e dashboards usam `PageShell` sem altura fixa. A página pode rolar; nunca esconder campos para caber na tela.
- Formular com rótulos visíveis e ações claras de salvar/cancelar. Novo Tratamento oferece salvar no cabeçalho e no final para facilitar o uso do formulário longo.
- Etapas editáveis da Gestão de Tratamentos usam o botão compartilhado `TreatmentSaveButton`, com ícone de disquete e rótulo **Salvar rascunho**, ao lado da finalização. Salvar grava o rascunho; finalizar é uma confirmação explícita e separada. Mostrar o botão somente quando a etapa tiver dados de rascunho; anexos, decisões e operações que já persistem ao executar mantêm seu próprio comando.
- Listagens secundárias em detalhes/dashboards reutilizam `DataList` com `embedded`, sem altura fixa.
- Coordenadas de template e matriz de permissões são **grades de edição**, não ações por registro: inputs/checkboxes permanecem nas células. Adicionar, remover campo selecionado e salvar ficam acima. A matriz de permissões pode mostrar todas as funções na janela rolável.
- Indicadores, mapas, checklist documental e login mantêm seus formatos próprios; aplicar a identidade, cabeçalho e controles consistentes, sem inventar seleção em conteúdos que não são registros tabulares.

## Cobertura atual

Códigos e de/para usa a mesma listagem selecionável, filtros e edição em janela. A conferência de códigos da guia usa `ListDetailDialog` e `DataList` como grade de edição: inclusão e quantidade ficam nas células, com ações gerais de prévia e geração. O original pode ser aberto para comparação. Erros de OCR/cadastro ficam na janela, sem encerrar a sessão; geração exige confirmação, e botões aguardam a requisição. Regras funcionais em [CODIGOS_E_DE_PARA.md](CODIGOS_E_DE_PARA.md).

Gestão de Tratamentos inclui a ação superior “Gerar guias do tratamento selecionado”, que abre a seção de documentos do detalhe. Cada guia oferece pré-visualização, geração da faltante/ajustada e nova versão. O modelo SADT padrão é selecionado automaticamente quando não existe modelo específico; pendências são apresentadas em português e os botões aguardam a conclusão da geração, evitando cliques repetidos. As opções para geração usam a permissão do tratamento, sem exigir acesso ao cadastro administrativo de modelos.

A recuperação de credenciais Stenci usa `StenciRefreshDialog` com `ListDetailDialog`, rótulos visíveis, campo de senha, mensagem de erro e ações Consultar/Cancelar. Consultas normais reautenticam automaticamente usando o envelope cifrado da sessão no servidor, sem abrir janela; ela só aparece quando as credenciais estão ausentes/inválidas. Não navegar para o login Realmed por falta de cache ou erro de credenciais externas. Ver [STENCI_SESSOES_TEMPORARIAS.md](STENCI_SESSOES_TEMPORARIAS.md).

Aplicado a Pacientes, Gestão de Tratamentos, Convênios, Profissionais, Procedimentos, Modelos de Documentos, Usuários, Permissões e todas as nove listagens de Estoque. Detalhes do paciente, versões da ficha de avaliação, campos de template, itens de pedidos/notas e tabelas do resumo de estoque também reutilizam o padrão. Dashboard, integração Stenci e Novo Tratamento usam o cabeçalho compartilhado e ações superiores adequadas à tela.

## Verificação obrigatória

Executar:

```powershell
npm run build --prefix frontend
# Servidor local exclusivo para verificação visual:
npm run dev --prefix frontend -- --host 127.0.0.1 --port 5186 --strictPort
node frontend/scripts/verify-screen-pattern.cjs
```

O teste visual usa Playwright do runtime local, dados fictícios e bloqueia todas as escritas na API. É possível configurar `REALMED_PLAYWRIGHT_ROOT` e `REALMED_UI_TEST_URL`. Verifica 1366×768, 1920×1080, 1024×650 e 390×844, seleção, ações, paginação local/servidor, modais, campos preservados e negação de acesso. Imagens de QA ficam em `.deployment/screen-pattern-qa`, sem dados reais.

Antes de concluir: conferir ausência de rolagem desnecessária no desktop, última linha e rodapé totalmente visíveis, teclado, janela pequena, celular, expansão dos filtros, cancelamento e permissões. Não concluir apenas porque a aplicação compila.

## Avaliação em tablet

Novo Tratamento contém somente paciente e data da avaliação. No detalhe, Dados da recepção e Preparação pela Central de Guias ficam recolhidos e podem ser reabertos para consultar/editar após salvar. Dias e horários ficam exclusivamente na avaliação. A avaliação digital usa formulário clínico com oito seções, controles de 48 px, campos de 14 px no desktop e 16 px em tablet/toque e salvamento fixo no rodapé da ficha, sem limitar a altura. Mapa e rubrica aceitam toque/caneta com desfazer e limpar. Conclusão usa janela de confirmação; ficha concluída é somente leitura até reabrir com auditoria. Não aplicar seleção de tabela a opções clínicas. Ver AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md e verify-digital-evaluation.cjs.

## Procedimentos por convênio

Convênios consulta a mesma fonte Stenci do Novo Tratamento, mantendo configurações locais. A ação superior “Procedimentos do convênio selecionado” depende da seleção e das permissões. A janela usa DataList selecionável e edição em ListDetailDialog, com código, descrição e códigos substituídos no mesmo formulário. Entradas avulsas de Procedimentos e Códigos e De/Para saem do menu; links para os cadastros anteriores ficam dentro de Convênios. Gerar uma guia com original anexado inicia a leitura e abre a conferência dos códigos, mantendo a quantidade explícita e o original preservado.

## Dashboard de Faturamento

Filtros visíveis no card superior: Agenda, Tipo de Atendimento (Todos/Fisioterapia/Avaliação), Local de Atendimento, Status da Agenda e De/Até. Aplicar filtros recalcula o recorte; Limpar restaura todos os filtros e mês atual. Indicadores, gráficos e pendências da agenda compartilham o recorte; os tratamentos locais usam apenas datas e informam essa distinção. Exibir atualização de metadados/cobertura parcial quando o histórico ainda estiver sendo reconsultado. Locais e agendas vêm da coleta, sem listas inventadas ou novas consultas Stenci por filtro. No celular, empilhar campos sem cortar; manter as abas para não empilhar os painéis.

Atualização visual de 20/10/2026 substitui a apresentação longa em uma única coluna: usar quatro abas **Agenda**, **Guias e Tratamentos**, **Pendências** e **Consultas Stenci**, com filtro de período e cobertura compartilhados no topo. A aba fica na query `aba`, com navegação por teclado. Alternar abas não consulta o Stenci nem enfileira novamente o período. Não empilhar indicadores, todos os gráficos, duas listas e consultas manuais na mesma página.

Referências visuais enviadas pelo usuário: cards claros com borda suave, indicadores coloridos, barras verticais em turquesa com eixos e linhas discretas, evolução em área preenchida e rosca com total central, percentuais e legenda em tons de turquesa/azul. `BillingChart` reutiliza esses formatos em SVG, com dados consultáveis em ListDetailDialog/DataList. Longas séries agrupam pontos consecutivos para legibilidade e preservam a lista completa em Ver dados; rosca agrupa categorias menores após as cinco maiores quando necessário. Não adicionar rankings por usuário nem valores monetários sem fonte confirmada.

Agenda abre com quatro indicadores principais; Mais indicadores expande os demais e a faixa de situações. Gráficos de evolução diária e convênios ficam lado a lado no desktop. Guias e Tratamentos possui dois cards largos (valor pendente indisponível enquanto não houver integração financeira e quantidade de tratamentos sem faturamento), com demais indicadores recolhidos. Alterna Distribuição (aging) com Evolução por Mês, mantendo a rosca de convênios ao lado, sem empilhar os três gráficos. A legenda da rosca fica abaixo do círculo, como nas referências enviadas pelo usuário. Pendências alterna Atendimentos e Tratamentos em tabelas paginadas; consultas manuais mostram somente o último tipo de resultado solicitado, agenda ou faturas. A abertura foi conferida em 1366×768 com aproximadamente uma tela de conteúdo (798 px na fixture), reduzindo a rolagem extensa anterior; expansões, tabelas extensas e celular mantêm rolagem normal, sem cortar conteúdo. Testes em `frontend/scripts/verify-billing.cjs`.

Faturamento usa PageShell com rolagem normal, filtros de período no card superior, indicadores e gráficos com descrição da base de cálculo. Listas de pendências, agenda e faturas reutilizam DataList embedded. Seleção de atendimento não abre detalhes; barra de ícones consulta vínculo com fatura. ListDetailDialog mostra o resultado. Consultas Stenci manuais têm filtros próprios explícitos: agenda por dia e agenda; faturas paginadas sem filtro de data capturado. Fontes ainda não consolidadas exibem travessão com motivo, nunca zero presumido.

O alerta temporário de evolução aparece na lista da agenda e informa sua base: todos os atendimentos finished são pendentes enquanto a clínica ainda não registra evolução. Não confundir com consulta clínica real. Recursos foram adiados pelo usuário: sem indicador dedicado ou colunas de valor em recurso/recuperado; os status originais das faturas permanecem visíveis.

Em 20/10/2026, Faturamento passa a abrir Agenda Consolidada por período, com cobertura de dias, contagens por agendamento/paciente e gráficos por dia/situação/convênio. Ausências de dados exibem travessão; cobertura parcial/falhas mostram aviso. Listagem de alertas usa DataList embedded com busca. Consulta manual fica em details recolhido. Aplicar período enfileira os dias ausentes de todas as agendas e acompanha a coleta, sem exigir seleção individual. Indicadores locais são uma seção separada baseada na criação dos tratamentos. Não guardar o histórico no navegador.

Faturamento inclui Relatórios com permissão independente `billing_reports`. Ver `RELATORIO_FALTAS.md`: três faltas consecutivas, incluindo a do dia.

Datas exibidas nos gráficos devem usar **dd/mm/yyyy**, incluindo eixos, dicas, intervalos e Ver dados. Agrupamentos mensais usam o primeiro dia como referência (01/mm/yyyy), mantendo agregação mensal e o ano completo. Valores ISO permanecem apenas no transporte e processamento interno.

Nas tabelas da aba Pendências do faturamento, usar paginação manual: 10 registros iniciais e opções 10, 20, 50 e 100 no rodapé. `DataList.pageSizeOptions` desativa a capacidade automática para preservar a escolha; a tela permite rolagem para exibir a página completa. Demais listagens conservam sua capacidade automática.

Seleção de linhas: usar fundo azul #bfdbfe e contorno #60a5fa no estilo compartilhado, mantendo contraste visível em telas claras e indicação de foco pelo teclado.

Confirmação de salvamento deve aparecer junto à ação executada. Em Preparação pela Central de Guias, mostrar “Salvando…” com botão desabilitado durante o envio; depois exibir confirmação verde abaixo do botão, ou erro vermelho sem limpar os campos. Feedback da recepção permanece na seção correspondente. Usar status/alert acessível.


## Finalização dos cards do tratamento — 27/10/2026

Cards operacionais usam **Finalizar etapa / Reabrir etapa**, confirmação e histórico com autor e etapa. Recepção, Preparação pela Central, Documentos para liberação, Liberação e Tratamento persistem sua conferência individual em `guide_processes.workflow_stages`. Avaliação digital mantém sua conclusão clínica existente, com validações e reabertura auditada. Todas as etapas finalizadas ficam verdes (#ecfdf3, borda #75e0a7), recolhidas e identificadas com ✓ e “Somente leitura”; expandir permite consultar sem editar. Reabrir remove o verde e libera edição conforme a permissão. Resumo de identificação e histórico são informações de consulta, não etapas finalizáveis.

Finalizar recepção/preparação salva primeiro os campos abertos; falha de salvamento impede a finalização. Documentação exige somente as guias de consulta e fisioterapia adequadas/geradas; arquivos anteriores de avaliação são consulta opcional; Liberação exige decisão final e pendências resolvidas. Finalizar o card é uma conferência explícita, não muda status de tratamento/faturamento, não aprova convênio e não encaminha automaticamente. Registros antigos permanecem abertos até conferência explícita; avaliações clínicas já concluídas aparecem verdes automaticamente.

Backend bloqueia alterações diretas da etapa finalizada, incluindo procedimentos, anexos/geração/adequação/exclusão, autorizações/pendências e sincronização de campos compartilhados da avaliação. Atualização do paciente pelo Stenci exige reabrir recepção; vinculação de convênio ausente exige Central aberta. Campos compartilhados sem alteração não exigem reabertura. Finalizar/reabrir e mutações são serializadas pelo bloqueio da linha do tratamento, com estado e auditoria na mesma transação. Visualização/download de versões anteriores continuam disponíveis. Não gravar estes estados no navegador.


## Documentação obrigatória atualizada — 27/10/2026

Somente **Guia de consulta** e **Guia de fisioterapia** são obrigatórias para completar a documentação. Eletroestimulação, carteirinha e outros anexos são opcionais e sua ausência não bloqueia finalizar Documentos ou encaminhar ao convênio. Avaliação clínica continua digital, com sua própria conclusão obrigatória antes do encaminhamento; não exigir avaliação em papel nem ficha PDF.

Removidos da Gestão de Tratamentos o item de upload “Avaliação fisioterapêutica recebida” e o card separado “Ficha de Avaliação Fisioterapêutica”. Arquivos já existentes permanecem disponíveis em Arquivos anteriores de avaliação (opcionais), recolhido dentro de Documentos, sem controles de novo anexo/geração ou etapa própria. Endpoints e versões antigas permanecem compatíveis para preservar histórico. A migration `20261027000011_only_guides_required` recalcula documentação existente pelas duas guias e ajusta somente NOT_READY/READY, preservando liberações em andamento/decididas, avaliação digital, arquivos e fechamentos dos cards, com auditoria de sistema.


Cabeçalhos dos cards operacionais têm somente o controle por chevron à direita: para baixo quando recolhido, para cima quando aberto, com título acessível e aria-expanded/aria-controls. Finalizar/Reabrir fica no rodapé alinhado à direita e só aparece com o card aberto, inclusive avaliação, recepção e Central. Estado concluído e indicador verde permanecem visíveis no cabeçalho. A avaliação também usa rodapé normal, sem botão flutuando sobre os campos.


Em Liberação, cada item de “Complete antes de encaminhar” é um link para o problema correspondente. Abrir o card sem descartar rascunhos, rolar e focar o campo/primeira guia obrigatória ausente/avaliação digital. Navegar não reabre etapas finalizadas, não muda permissões e não dispara salvamento.


Gestão de Tratamentos aceita clique duplo na linha para abrir o tratamento daquela linha, pela mesma ação da barra. Clique simples continua apenas selecionando. A extensão usa o evento `DataList.row-dblclick`, com adesão exclusiva desta tela; não abrir outras listagens automaticamente. Ignorar duplo clique em links, botões e campos internos e enquanto carrega. A navegação usa o item do evento, sem depender da seleção alternada pelos dois cliques.


## Replicar médico assinante entre convênios — 27/10/2026

Cadastros → Convênios possui ação **Replicar assinatura do médico entre convênios**, independente dos procedimentos. A janela permite origem, prévia do médico/PNG, busca e seleção de até 100 destinos, seleção dos resultados e limpeza. Copia nome, imagem, posição e configuração de aplicação SADT, inclusive posição nula (sem aplicação automática). Exige visualizar e editar Convênios; usa a mesma resolução local por external_id Stenci do cadastro e da replicação de procedimentos.

Assinaturas existentes nos destinos são preservadas por padrão. A opção explícita de substituição cria nova versão e inativa somente a anterior; arquivos e guias emitidos permanecem preservados. Cada destino recebe seu próprio PNG e versão com autor/data; alterações posteriores não afetam origem ou outros destinos. A origem precisa ter assinatura ativa e permanecer na versão exibida. Falhas cancelam todas as alterações e removem apenas arquivos novos dessa tentativa. Locks nos convênios em ordem de ID serializam cópias e substituições. Não requer migration. Rota POST `/api/insurance-providers/replicate-signer`.


As abas da Gestão de Tratamentos possuem ícone de informação com explicação breve no title e painel acessível por foco/clique/toque, sem alterar a fila selecionada. Escape ou Fechar dispensa a explicação. A aba READY chama-se Pendente de Liberação; chaves e regras dos filtros permanecem iguais.


## Detalhe de tratamento em abas — 27/10/2026

Esta organização substitui os cards operacionais empilhados e seus controles de recolher no detalhe: manter no topo Resumo Tratamento e Dados do Paciente, compactos e recolhíveis. As demais seções ficam no card com abas horizontais: Recepção, Central de Guias, Avaliação, Documentos, Liberação e Histórico. Mostrar somente o conteúdo da aba selecionada, já aberto. Formulários extensos ainda permitem rolagem normal; no celular, a barra de abas rola horizontalmente sem alargar a página.

A conclusão aparece na aba em verde com ✓, incluindo a avaliação clínica concluída; o painel permanece branco e informa somente leitura. Finalizar/Reabrir continuam no rodapé, com confirmações, validações, permissões e auditoria existentes. Histórico é consulta e não possui conclusão. Trocar de aba não salva, não reabre etapas e não desmonta os formulários: rascunhos, desenhos e seleções são preservados apenas na memória. Não guardar dados clínicos no navegador.

As abas usam tablist/tab/tabpanel, seleção e vínculo acessíveis, setas esquerda/direita, Home/End e foco de teclado. Links de pendências selecionam a aba correta antes de focar o campo/documento/avaliação. Entradas com evaluate=1 ou documents=1 continuam abrindo a seção correspondente. Verificar com verify-treatment-stages.cjs, verify-forwarding-links.cjs e verify-digital-evaluation.cjs.


Na aba Liberação, usar faixa horizontal com todos os status e situação atual colorida, sem indicar uma sequência linear. Selecionar abre confirmação em ListDetailDialog com os campos pertinentes. Preservar os links de pendências que navegam entre abas. Em Recurso possui fila própria na Gestão de Tratamentos. Regras e verificações em LIBERACAO_CONVENIO.md.


## Asterisco dos campos obrigatórios — 27/10/2026

Usar `FieldLabel.vue` em todos os rótulos obrigatórios, com `required` ou `:required` seguindo a condição real. O asterisco é vermelho (#d92d20), fica junto ao texto e não muda o nome acessível dos campos. A propriedade `reason` explica no mouse quando a exigência se aplica. Não inserir asteriscos no texto digitado nem inferir obrigatoriedade apenas porque um valor preenchido precisa de formato válido.

Marcar tanto os campos com required nativo quanto os exigidos apenas ao concluir ou executar uma ação: paciente do novo tratamento; convênio/plano, fisioterapeuta, médico solicitante e sessões da Central; campos clínicos de conclusão, grupo de condutas, descrições de Outro/Outra e horários dos dias selecionados; quantidades e motivos condicionais da liberação; produto e quantidade ao adicionar itens; grupos de procedimentos/destinos na replicação; assinatura PNG ao salvar o assinante; conferência para gerar guia. As guias obrigatórias têm asterisco no título; anexos opcionais continuam sem marcação.

Na avaliação, marcar queixa, exame físico, gravidade, risco, objetivos, ao menos uma conduta, responsável, CREFITO e data. Horários só são obrigatórios quando o dia está selecionado; lateralidade, rubrica, diagnóstico/CID, precauções não selecionadas e demais campos opcionais não recebem asterisco. Sessões são exigidas antes de encaminhar ao convênio. Na Central, início previsto e data da recepção continuam opcionais conforme a validação atual.

O asterisco não adiciona required nativo às exigências futuras e não impede salvar rascunhos incompletos. Reutilizar as mesmas condições das validações, independentemente de o campo já estar preenchido. Não marcar todos os checkboxes de um grupo quando basta uma opção. `DataList.ListColumn.required` permite marcar o cabeçalho de campos obrigatórios nas grades de edição (quantidades, campos/coordenadas dos modelos), sem mudar valores ou validações. Novos formulários devem manter este padrão.


## Cabeçalho compacto do tratamento — 27/10/2026

O detalhe passa a ter, nesta ordem: **Resumo Tratamento**, **Dados do Paciente** e um único card com as abas das etapas. O antigo conteúdo da aba Tratamento foi movido para o Resumo Tratamento, preservando sessões/status, finalização e reabertura auditadas. A aba Tratamento deixa de existir; permanecem Recepção, Central de Guias, Avaliação, Documentos, Liberação e Histórico.

Os dois cards superiores usam espaçamento compacto e começam recolhidos. O resumo mantém as contagens principais visíveis no cabeçalho; Dados do Paciente mantém nome, convênio e referência do tratamento. As setas expandem os detalhes; atualizar pelo Stenci permanece no corpo dos dados do paciente, com as mesmas permissões e bloqueios. Finalizar/Reabrir do resumo só aparece quando expandido. Conclusão deixa o resumo verde, sem criar estado novo. Não desmontar formulários nem descartar rascunhos ao recolher os cabeçalhos ou alternar abas.

Documentos da liberação ficam dentro da aba Liberação, usando DataList embedded com filtro superior, barra de ícones (anexar/visualizar/baixar), seleção e paginação. O upload usa ListDetailDialog com campo Arquivo PDF obrigatório e asterisco vermelho; a visualização usa modal amplo. Anexos são opcionais e não modificam a conclusão da etapa. Etapa fechada bloqueia somente inclusão; leitura/baixar continuam disponíveis conforme authorizations/view.

O Dashboard da Central de Guias usa GuideProcessStageChart: barras horizontais com todos os estágios, rótulos completos e valores visíveis. Faturar é a última barra e os indicadores abrem a mesma fila pelo filtro process_stage, exibido como chip removível na Gestão. Ver docs/DASHBOARD_CENTRAL_DE_GUIAS.md para critérios e contagens sem duplicação.

## Continuidade de guias — 27/10/2026

Ver docs/CONTINUIDADE_DE_GUIAS.md. Adicionar Guias na Liberação abre novo ciclo vinculado ao mesmo tratamento, com liberação e sessões próprias, sem nova avaliação. Histórico e faturamento de cada guia são preservados. Na continuidade, somente a nova guia de fisioterapia é obrigatória; avaliação reaproveitada é somente leitura. O dashboard conta cada ciclo e mantém as guias anteriores pendentes de faturamento.

### Data da avaliação no novo tratamento — 27/10/2026
Usar MaskedDateInput para digitação com máscara dd/mm/aaaa, sem abrir calendário ao clicar. O campo continua opcional e envia uma data válida no formato ISO ao backend.

### Voltar ao topo — 27/10/2026
O AdminLayout inclui um único BackToTop compartilhado em todas as telas internas. Aparece após 240 px de rolagem da página, fixo no canto inferior direito, junto à borda inferior da janela com respeito à safe area; não aparece na impressão. Exibe somente uma seta em botão circular visualmente compacto, com área de toque mínima de 44 px, e respeita redução de movimento. Ao acionar, retorna ao topo e transfere o foco ao conteúdo principal. Rolagens internas de tabelas e diálogos permanecem independentes.


## Rodízio de fisioterapia — 28/10/2026

Ver [RODIZIO_FISIOTERAPIA.md](RODIZIO_FISIOTERAPIA.md). A seção 7 da avaliação integra indicação de profissional por agendas ativas da Realmed Matriz, sem avaliação, com tolerância de 25 minutos e verificação de todas as sessões. Configuração explícita de agendas por administrador; indicação não agenda no Stenci.


## Faturamento por guia — 28/10/2026

Ver [FATURAMENTO_POR_GUIA.md](FATURAMENTO_POR_GUIA.md). Consulta pode ir a Faturar após avaliação, simultaneamente à liberação. Cobrar a consulta não fatura fisioterapia/eletro; estas retornam a Faturar ao concluir sessões. O dashboard permite sobreposição da fila Faturar e conta total distinto. Permissão própria guide_billing, sem concessão automática.

Na Liberação, seleção conjunta usa uma coluna de checkboxes e ação de confirmação na barra existente; o clique na linha mantém a seleção individual. O modal lista as quantidades de cada guia e os dados compartilhados da autorização.
