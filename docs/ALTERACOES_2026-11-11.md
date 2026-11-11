# Alterações do Realmed — 11/11/2026

## Reconhecimento facial mais rápido

- Removida a espera de três segundos. Leitura normal captura seis imagens com maior definição e menor compressão em cerca de 600 ms; não pede piscada em toda entrada.
- Modelos aquecidos na inicialização, processamento sem íris/emoções e apenas três imagens válidas no caminho normal, até seis se necessário. A mesma identidade precisa ser confirmada em pelo menos duas imagens; critérios de similaridade e filtros de vivacidade preservados.
- Compensação limitada de sombras, com preservação de altas luzes, e alinhamento facial mantido. Não garante reconhecimento no escuro/contraluz extremo nem dispensa teste físico no TCL.
- Sequência sem movimento suficiente solicita uma confirmação adicional com piscada, vinculada a um novo desafio do servidor e iniciada pelo usuário. A amostra estática que os filtros passivos isolados aceitavam passou a exigir esse gesto; os filtros não têm equivalência à segurança de sensores de profundidade.
- Logins bem-sucedidos e a solicitação intermediária de confirmação não gastam a cota de falhas do tablet compartilhado. Mantidos limite de falhas, Retry-After, desafios descartáveis, cancelamento e vínculos/permissões; sem imagens persistidas.
- Testes: 177 testes backend aprovados, incluindo política facial e API com dependências isoladas (consenso, ambiguidade, vivacidade, repetição, movimento/exposição, gesto obrigatório quando solicitado, expiração/reuso, concorrência, limpeza e limite de falhas). Navegador cobre captura curta, confirmação adicional, cancelamentos, câmera/permissões, sucesso e resoluções. TypeScript e padrão de telas verificados.
- Medição isolada com a amostra da biblioteca no servidor: versão anterior 2,02–2,59 s; nova 0,38–0,49 s e pré-aquecimento de 0,37 s. A amostra estática foi recusada no acesso direto e direcionada ao desafio adicional. Esses tempos medem inferência, sem rede/Stenci, e não medem taxa de acerto no tablet. Logs: `.deployment/physio-fast-benchmark3.log`, `.deployment/physio-fast-final-backend.log`, `.deployment/physio-fast-final-ui.log` e `.deployment/physio-fast-typecheck.log`.
- Publicado na release `20261111-123735`, com 177 testes aprovados no servidor, nenhuma migration pendente e vínculo de dependências idênticas preservado. Asset público `index-lTjug1-O.js` e API saudável confirmados. Endpoint real de desafio anuncia leitura normal, seis imagens de 480 px e validade de 30 segundos; não foi feito login de pessoa real. Navegador revalidado contra os arquivos publicados com câmera/APIs simuladas, inclusive confirmação adicional. Logs: `.deployment/physio-fast-publish.log` e `.deployment/physio-fast-production-qa.log`.

## Nova tela de login do fisioterapeuta

- Tela refeita com câmera ampla no centro, controles abaixo e instruções curtas para cada momento. Layout adaptado a tablet em paisagem e celular, com botões grandes e sem a antiga composição de duas colunas.
- O profissional ativa a câmera, se posiciona e toca em Entrar. A captura breve começa sem contagem; confirmação adicional com piscada somente quando o servidor solicitar, conforme ajuste posterior descrito acima.
- Cancelamento disponível durante a abertura da câmera, captura e verificação. Sair/ocultar a tela libera a câmera; respostas atrasadas não abrem sessão após cancelar.
- Prévia sem recorte, contorno proporcional ao vídeo, mensagens de recuperação para falhas de câmera/reconhecimento e espera indicada quando o servidor limita tentativas. Sem repetição automática das leituras.
- Mantidos reconhecimento/vivacidade no servidor, vínculo profissional, permissões e integração existente. Capturas continuam temporárias, sem gravação no dispositivo ou servidor.
- Validados TypeScript, padrão compartilhado de telas e novo teste automatizado com câmera sintética/APIs simuladas: sete resoluções, início manual, 16 quadros por tentativa, cancelamento, permissão tardia/negada, respostas atrasadas, nova tentativa, limite 429, visibilidade, sucesso e liberação da câmera. Capturas visuais conferidas em paisagem e retrato; o teste físico no TCL depende do dispositivo. Logs: `.deployment/physio-redesign-typecheck.log` e `.deployment/physio-redesign-ui.log`.
- Publicado na release `20261111-120850`, com 166 testes aprovados no servidor, nenhuma migration pendente, dependências idênticas e destino do vínculo preservado. Asset público `index-DWpChtwo.js` e API saudável confirmados. Fluxo completo revalidado no site publicado com câmera sintética e APIs interceptadas; conferido visualmente também em 760×413. Logs: `.deployment/physio-redesign-publish.log` e `.deployment/physio-redesign-production-qa.log`.

## Seleção de texto nas linhas de tratamentos

- Desabilitada a seleção de texto apenas nas linhas de dados da Gestão de Tratamentos, evitando destacar palavras ao usar o duplo clique para abrir.
- Mantidos clique simples para selecionar o registro, duplo clique para abrir e seleção de texto normal fora dessas linhas.
- Aprovados os testes existentes de duplo clique (inclusive controles internos e outras tabelas) e padrão compartilhado de telas. Conferido no navegador que arrastar sobre a linha não seleciona palavras; regra CSS restrita à Gestão. Log: `.deployment/treatment-row-selection-ui.log`.
- Publicado na release `20261111-114929`, com 166 testes aprovados no servidor, sem migrations pendentes, asset `index-CZiCUU7_.js` confirmado e API saudável. Conferido no site com dados fictícios: arrastar na linha não seleciona texto, cabeçalho continua selecionável e duplo clique abre o tratamento. Log: `.deployment/treatment-row-selection-publish.log`.

## Gerar Continuação no tratamento

- Adicionado Gerar Continuação no card superior do paciente para ciclos na fila Faturar, com confirmação de sequência e quantidade de sessões. Não exige clicar em Editar aba.
- Cria um novo registro/ciclo do mesmo paciente e tratamento, preservando o faturamento, documentos e sessões anteriores. Saldos, procedimentos e documentos do novo ciclo são independentes.
- Avaliação fica verde e pode ser consultada imediatamente no novo ciclo, mostrando a ficha inicial em somente leitura. Não precisa avaliar novamente, não permite editar/reabrir nem preencher lacunas históricas com dados do ciclo novo. Recepção e demais etapas continuam seu fluxo normal.
- Mantida a exigência dos três procedimentos e respectivas guias na nova Central. Sem duplicidade por cliques/requisições concorrentes; a API revalida a fila Faturar, bloqueios e permissões e rejeita tratamentos arquivados.
- Validações iniciais aprovadas: 166 testes backend, MySQL/API isolados (inclusive sequência até Guia 3, concorrência, rollback, legado e cobrança anterior preservada) e navegador com APIs simuladas (card, confirmação, erro/retentativa, avaliação, permissões, histórico do navegador e tablet/celular).
- Conferidos também TypeScript, fluxo sequencial/Central unificada e padrão compartilhado de telas. Remover uma guia obrigatória ou reabrir etapas invalida o atalho Faturar no servidor; alterações posteriores na avaliação de origem não sobrescrevem o snapshot da continuação.
- Logs: `.deployment/billing-continuation-db.log`, `.deployment/billing-continuation-backend.log`, `.deployment/billing-continuation-ui.log` e `.deployment/billing-continuation-final-ui.log`.
- Publicado na release `20261111-114447`, com 166 testes aprovados no servidor, nenhuma migration pendente, asset público `index-C9vL3USN.js` confirmado e API saudável. Fluxo revalidado com os arquivos publicados e APIs simuladas, sem criar continuação fictícia em produção. Logs: `.deployment/billing-continuation-publish.log` e `.deployment/billing-continuation-production-qa.log`.

## Recarga repetitiva na Gestão de Tratamentos

- Reproduzido o ciclo com dados fictícios, textos longos e API lenta: 12 consultas em cinco segundos, alternando capacidades de 5 e 1 linha. O carregamento removia as linhas e a nova medição disparava outra consulta.
- A tabela mantém as linhas visíveis durante atualização. A medição ignora carregamentos e preserva alturas já observadas na mesma largura, sem oscilar quando uma linha alta sai da página. Mantidas adaptação à resolução, filtros recolhíveis e paginação.
- Consultas da listagem são serializadas e respostas antigas não substituem a última página/filtro solicitado. Atualizações automáticas preservam a seleção quando o registro permanece na página.
- Os 11 contadores das abas são consultados juntos, sem buscar uma página de pacientes para cada contador. Compartilham as mesmas regras e permissões da listagem; não altera critérios de fila ou etapas.
- Conexões de atualização instáveis tentam reconectar com intervalos progressivos. Limite de requisições respeita Retry-After do servidor (ou pausa de 60 segundos quando ausente); acesso negado interrompe reconexões. Sair da tela cancela os temporizadores.
- Validação: regressão reproduzida antes da correção; 166 testes backend e MySQL/API isolados aprovados, com conferência dos 11 totais nas diferentes autorizações, requisitos reabertos, faturamento, excluídos e bloqueio de permissões. TypeScript e navegador aprovados: API lenta, linhas de alturas diferentes, resoluções, filtros, paginação, concorrência, seleção, 429/403, reconexões, saída da tela, dashboard e padrão compartilhado de telas. Testes de interface usam APIs simuladas; nenhuma alteração em tratamentos reais.
- Logs: `.deployment/list-stability-before.log`, `.deployment/treatment-reload-ui.log`, `.deployment/treatment-reload-db.log`, `.deployment/treatment-reload-backend.log`.
- Publicado na release `20261111-110455`: build/TypeScript e 166 testes aprovados também no servidor, nenhuma migration pendente, dependências idênticas reutilizadas com preservação do destino. Asset público `index-B8hTHc4Z.js` e API saudável confirmados; novo endpoint rejeita acesso sem sessão (401) e expõe Retry-After ao navegador.
- Regressão conferida com os assets publicados e APIs fictícias: carregamento estável, mudança de fila durante resposta lenta sem sobrescrita, seleção preservada e recuperação de 429. No teste de reconexão, a medição inicial passou a aguardar fontes/layout públicos antes de contar chamadas de fundo; revalidação aprovada para 503, 429, 403 e streams encerrados cedo. Código de produção não precisou de novo ajuste.
- Logs da publicação e conferência: `.deployment/treatment-reload-publish.log`, `.deployment/treatment-reload-final-ui.log`, `.deployment/treatment-reload-production-qa.log` e `.deployment/treatment-reload-production-backoff.log`.
