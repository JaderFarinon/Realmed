# Implantação Realmed

Eventos → Confraternização 2026 publicado na release `20261112-104853`, asset `index-DM0B8JOH.js`. Build/TypeScript, 197 testes backend, integração MySQL temporária e padrão de telas aprovados; backup antes da migration `20261112000002_events`. Interface publicada validada com APIs sintéticas, catálogo/contagens existentes conferidos somente por leitura, API saudável e lista privada retornando 401 sem login. Permissão independente `events/view`, sem concessões automáticas; revisão geral de permissões adiada por solicitação do usuário. Dependências preservadas em `20261109-153438/backend/node_modules`. Registro em `docs/ALTERACOES_2026-11-12.md`.

Máximo de um acompanhante e aviso de custos junto à seleção publicados na release `20261112-103448`, asset `index-Cx8d45RS.js`. Build/TypeScript e 197 testes aprovados, sem migrations pendentes. API pública rejeita dois acompanhantes; layout/fluxo público e saúde confirmados, sem confirmações fictícias em produção. Dependências preservadas em `20261109-153438/backend/node_modules`. Registro em `docs/ALTERACOES_2026-11-12.md`.

Aviso sobre custos dos acompanhantes publicado na release `20261112-102730`, em `/confraternizacao`. Build/TypeScript e 197 testes aprovados, sem migrations pendentes, texto público e saúde confirmados. Dependências preservadas em `20261109-153438/backend/node_modules`. Registro em `docs/ALTERACOES_2026-11-12.md`.

Confirmação pública da confraternização publicada na release `20261112-090800`, rota `/confraternizacao`, asset `index-rPpnNtGZ.js`. Build/TypeScript e 197 testes aprovados; backup automático antes de aplicar `20261112000001_event_confirmations`. API saudável e interface/API sem login conferidas. Dependências seguem vinculadas a `20261109-153438/backend/node_modules`; preservar o destino. Detalhes em `docs/ALTERACOES_2026-11-12.md`.

Horários recolhidos da agenda publicados na release `20261111-182721`: build/TypeScript e 195 testes aprovados, nenhuma migration pendente, asset `index-CCu7dMaa.js` e API saudável. Expansão por toque/teclado, responsividade e bloqueio por horário conferidos na interface pública com dados fictícios. Dependências continuam em `20261109-153438/backend/node_modules`; preservar o destino. Registro em `docs/ALTERACOES_2026-11-11.md`.

Atendimento restrito à sessão atual publicado na release `20261111-181708`: 195 testes aprovados, nenhuma migration pendente, asset `index-qHFO5M3K.js` e API saudável. Interface pública conferida com relógio controlado/APIs sintéticas; autorização por horário validada também em MySQL/API temporários. Dependências continuam em `20261109-153438/backend/node_modules`; preservar esse destino. Registro funcional em `docs/ALTERACOES_2026-11-11.md`.

Densidade compacta do fisio publicada na release `20261111-180308`: build/TypeScript e 193 testes aprovados, sem migrations pendentes. Asset público `index-V-wcU6oi.js`, saúde da API, medidas responsivas e formulário/modal conferidos. Somente ajuste visual; dependências seguem em `20261109-153438/backend/node_modules`, que deve ser preservado. Registro em `docs/ALTERACOES_2026-11-11.md`.

Configurações do fisioterapeuta publicadas na release `20261111-175243`, com 193 testes aprovados, nenhuma migration pendente, asset `index-DqwTtLGA.js` e saúde confirmada. Tela pública validada com APIs sintéticas; envio de ajustes de agenda aguarda HAR, sem novas gravações Stenci. Dependências continuam vinculadas a `20261109-153438/backend/node_modules`; preservar esse destino. Detalhes em `docs/ALTERACOES_2026-11-11.md`.

Preservação de secrets — 11/11/2026: `enable-permissions.cjs` altera exclusivamente a linha PERMISSIONS_ENABLED e verifica que os demais valores dotenv continuam idênticos. Não reserializar o ambiente inteiro com JSON.stringify: as aspas escapadas por JSON mudam senhas quando interpretadas pelo dotenv. Preservar comentários/aspas/valores originais, gravar atomicamente com modo 600. Regressão coberta em `backend/test/deploy-env-preservation.test.js`.

Fisio local e notificações publicados na release `20261111-155354`, com 190 testes aprovados e migration de notificações aplicada após backup. Dependências resolvidas em `20261109-153438/backend/node_modules`, preservar esse destino. Asset `index-BiZSj6qx.js`, saúde e conexão compartilhada Stenci com consulta/logoff confirmados na versão ativa. Secrets privados configurados, bypass desativado. Log funcional em `docs/ALTERACOES_2026-11-11.md`.

Publicações seguintes: release.sh reutiliza por link a instalação resolvida de node_modules da versão ativa somente quando package.json e package-lock.json forem idênticos. Registra o destino em dependency-source.txt; preservar esse destino na limpeza. Se mudar qualquer manifesto, instalar normalmente. Testes completos, migrations, saúde e rollback continuam obrigatórios. publish.ps1 grava o log/status no servidor e acompanha a execução pela mesma sessão; a publicação continua caso a conexão caia, permitindo retomar a consulta ao log sem refazer a instalação.

## Limitação de disco na publicação — 09/11/2026

A tentativa `20261109-154430` encontrou processos de instalação/cópia em espera no limitador de I/O do contêiner (`iolimit_virtinfo`), embora houvesse espaço livre. A retomada verifica igualdade exata de package.json/package-lock.json antes de reutilizar dependências da release `20261109-153438`, mantém a suíte completa, migrations e health check/rollback. A operação de cópia interrompida deve estar encerrada antes de substituir o destino por um link.

Se `20261109-154430/backend/node_modules` estiver vinculado à release `20261109-153438`, preservar essa release enquanto o vínculo for utilizado. Antes de qualquer limpeza futura, resolver os links de node_modules das versões mantidas e preservar todos os destinos referenciados. Não apagar nem modificar as dependências em uso; uma nova instalação independente elimina essa dependência entre releases. Logs desta retomada ficam em `/qyvia/realmed/shared/publication-20261109-154430-link.log` e `.status`.

## Servidores

- Gateway SSH: `gate.paas.saveincloud.net.br:3022`.
- Proxy: usuário `235529-2628`, IP privado `10.100.39.155`, IP público observado `191.243.196.16`.
- Aplicação: usuário `225881-2628`, IP privado `10.100.67.92`.
- Autenticação: chave local carregada no Pageant. Não adicionar chave ou frase-senha ao repositório.
- Domínios: `realmed.qyvia.com.br` e `realmedapi.qyvia.com.br`.
- Certbot: e-mail `jadergfarinon@gmail.com`.

Alterar apenas recursos do Realmed. Nunca executar reinício global do PM2 nem modificar blocos Nginx de outros sistemas.

## Estrutura preparada

- `/qyvia/realmed/releases/initial`: primeira versão transferida.
- `/qyvia/realmed/shared/backend.env`: configuração privada, permissão 600; segredo JWT novo. Utiliza as credenciais existentes indicadas pelo usuário. Não alterar usuários ou estrutura do banco fora de migrations sem nova necessidade autorizada.
- `/qyvia/realmed/shared/storage`: documentos persistentes, ligados à versão.
- `/qyvia/realmed/logs`: logs exclusivos.
- Backend: porta 3013 no IP privado. Frontend compilado: Nginx na porta 5185.
- PM2 proposto: `realmed-api`, uma instância por causa das sessões em memória.
- Arquivo exclusivo no proxy: `/etc/nginx/sites-available/realmed`, ligado em `sites-enabled/realmed`.
- Desafio ACME: `/var/www/realmed-acme`.

## Estado em 14/10/2026

Build e TypeScript do frontend passaram. Os 62 testes de backend passaram no servidor.
Aplicação iniciada como `realmed-api` no PM2, com inicialização automática já disponível no servidor. Frontend compilado servido por bloco exclusivo no Nginx.

Banco e DNS confirmados pelo usuário:

1. O banco `realmed` é o mesmo utilizado no desenvolvimento. As 14 migrations já estavam aplicadas; nenhuma pendente. Nenhum dado ou schema alterado durante a implantação.
2. Registros A corrigidos para `191.243.196.16`. Resolvedores públicos confirmaram a mudança, mas caches locais podem levar mais tempo.
3. Certificado emitido para os dois domínios, validade inicial até 12/01/2027. Certbot timer ativo e hook exclusivo de recarga Nginx após renovação do certificado Realmed.
4. HTTPS do frontend respondeu 200; HTTPS da API respondeu `{"status":"ok"}`, com validação TLS.
5. Publicação automatizada validada com a versão `20261014-150244`; versão anterior `initial` preservada. Backend passou novamente nos 62 testes. Banco continua com os mesmos 2 pacientes, 3 tratamentos e 1 usuário; não há documentos ou templates cadastrados.
6. Estoque e permissões publicados em `20261014-153728`. Backup anterior à migration: `/qyvia/realmed/shared/backups/realmed-2026-10-14T18-37-44-546Z.sql`. A migration `20261014000001_create_inventory.js` adicionou o módulo sem alterar pacientes, tratamentos ou usuários. Total de migrations aplicadas: 15. Permissões habilitadas e administrador existente preservado. Os 69 testes e a verificação MySQL isolada passaram; leituras das novas rotas em produção retornaram 200 e logs de erro ficaram vazios.
7. Versão atual `20261014-154125`, incluindo acabamento responsivo dos formulários. Nenhuma migration adicional pendente. Links de estoque e permissões respondem 200 no proxy correto, e a API de estoque sem token responde 401. O resolvedor local do proxy ainda guarda o IP DNS antigo; verificação HTTPS foi realizada no IP correto com SNI e validação do certificado. Resolvedor público já confirma `191.243.196.16`.

## Publicação e rollback

Geração SADT integrada publicada em `20261019-122239`: atalho na Gestão de Tratamentos, modelos padrão de consulta/fisioterapia/eletroestimulação, preenchimento pelo `pdf-lib` existente, área de logo no topo esquerdo e assets opcionais. Originais e versões preservados; bloqueio por tratamento serializa gerações. Build/TypeScript, 82 testes e verificação visual aprovados. Verificação em produção confirmou HTTP 200 das opções com três modelos, validação controlada das pendências e PDF fictício de uma página em memória, sem criar documentos de pacientes. Nenhuma migration nova. Detalhes em `docs/GUIA_SADT_HTML.md`.

Correção do botão duplicado publicada em `20261019-092746`: apenas um controle de três pontos, funcional no desktop e no celular, com acesso ao botão mesmo quando o painel móvel está aberto. Medição inicial das tabelas feita na montagem, sem depender do primeiro frame de pintura. Build/TypeScript, verificação do botão único e QA completo das telas aprovados; 74 testes aprovados no servidor. Sem novas migrations.

Grupos do menu recolhíveis publicados em `20261014-165450`: Central de Guias, Estoque, Cadastros, Configurações e Integrações, com preferência independente por grupo. Verificação de teclado/celular/persistência e QA das listagens aprovados; build/TypeScript e 74 testes do backend aprovados na publicação. Nenhuma migration nova.

Menu recolhível publicado em `20261014-164756`: botão de três pontos verticais, preferência persistida no desktop e abertura/fechamento no celular. Build/TypeScript, 74 testes de backend, verificação do menu e QA das listagens aprovados. API saudável, logs exclusivos vazios e nenhuma migration nova.

Sessões Stenci temporárias publicadas em `20261014-164115`: logoff após validação do login e após consultas, reautenticação da mesma conta solicitada na interface, sem persistir senha/token externo. 74 testes aprovados no servidor; build/TypeScript e teste visual de reautenticação aprovados. Nenhuma migration nova, API saudável e logs de erro exclusivos vazios. A confirmação do efeito no contador de licenças Stenci depende de login real pelo usuário; o HAR não incluía contexto autenticado. Regras em `docs/STENCI_SESSOES_TEMPORARIAS.md`.

Padronização das telas publicada em `20261014-162132`, conforme `docs/PADRAO_DE_TELAS.md` e referência obrigatória no `AGENTS.md`. Build e TypeScript aprovados; 69 testes de backend aprovados; QA visual das 17 listagens em quatro resoluções, seleção, paginação, modais e permissões aprovado com dados fictícios. Nenhuma migration nova. HTTPS frontend 200, API saudável e logs de erro exclusivos vazios após publicação.

Executar `deploy/publish.ps1` com a chave desbloqueada no Pageant. O script compila frontend com a URL pública da API, empacota sem arquivos `.env`, transfere uma nova versão e executa `release.sh`. No servidor: instala dependências, executa testes, verifica migrations e só aplica pendências após backup exclusivo do banco Realmed. Versões antigas e storage são preservados.

A publicação troca atomicamente o link `current` e reinicia apenas `realmed-api`. Se o health check falhar, restaura o link anterior e reinicia apenas esse processo. Rollback é do código; migrations não são revertidas automaticamente. Novas migrations devem ser compatíveis com a versão anterior.

Última versão anterior registrada em `/qyvia/realmed/shared/previous-release`. Para rollback manual, verificar esse caminho e a compatibilidade do schema, trocar atomicamente o link `current`, executar `pm2 startOrRestart /qyvia/realmed/current/deploy/ecosystem.config.cjs --only realmed-api --update-env` e verificar `/api/health`.

## Pendências funcionais preservadas

1. Edição progressiva dos dados administrativos do tratamento.
2. Integração entre avaliação, ficha gerada e checklist documental.
3. Preservação dos estados de autorização ao alterar documentação.
4. Invalidação de acesso local após logout.
5. Reabertura de avaliação concluída com histórico.
6. Salvamento de convênio sem plano quando aplicável.
7. Correção dos campos clínicos e textos longos no PDF.
8. Proteção contra versões documentais duplicadas em geração simultânea.
9. Centralização das pendências de encaminhamento no backend.
10. Validação completa do fluxo clínico e mapeamento dos documentos em `docs/`.

## Operação após ativação

Atualização de 19/10/2026 — consultas Stenci automáticas: credenciais cifradas apenas em memória, limitadas à validade do JWT Realmed, excluídas no logout/expiração/reinício. Reinício exige novo login para criar o envelope. Cache ausente passa a autenticar/consultar/encerrar automaticamente, com fila por sessão. Recuperação manual apenas quando falta credencial válida. Sem migration ou secret novo no ambiente. Fluxo e criptografia em `docs/STENCI_SESSOES_TEMPORARIAS.md`. Validação: 101 testes backend, build/type-check, testes visuais de consultas automáticas e recuperação, e padrão das 18 listagens.

Publicado na release `20261019-131325`, com 101 testes aprovados no servidor e sem migrations pendentes. Reiniciado somente `realmed-api`.

Códigos e de/para: migration `20261019000001_create_procedure_code_rules.js`; cadastro e leitura documentados em `docs/CODIGOS_E_DE_PARA.md`. OCR privado em `/qyvia/realmed/shared/ocr`, preparado por `deploy/setup-ocr.sh`, sem instalação global. Conferências de códigos em memória expiram após reinício; o usuário pode refazer a leitura. Validação desta entrega: 91 testes backend, build/type-check, padrão de 18 listagens em quatro tamanhos, conferência/versões SADT e OCR real de PDF fictício contendo somente imagem.

Publicado em 19/10/2026, release `20261019-125502`. Nova tabela criada após backup na primeira publicação da entrega; sem migrations pendentes na publicação final. Reiniciado somente `realmed-api`.

Consultar logs exclusivos em `/qyvia/realmed/logs` ou `pm2 logs realmed-api --nostream --lines 50`. Reinício: `pm2 restart realmed-api`; nunca `pm2 restart all`. Reinícios invalidam sessões Stenci em memória. A chave deve estar desbloqueada no Pageant para operações SSH locais. A publicação é executada sob solicitação; nenhum monitor ou agendamento de publicação foi criado.


## Importação do estoque — 19/10/2026

Release publicado: `20261019-135419`. Migration de procedência aplicada e importação concluída em produção e no banco local: 80 produtos (76 originais e quatro recuperados inativos), 100 saldos / 315 unidades, oito notas / 72 itens, 19 pedidos / 89 itens, 76 fotos verificadas por SHA-256 e nenhum arquivo ausente. Origem confirmada sem alteração; repetição em ambos os ambientes reconhecida sem duplicação. Cinco pedidos recuperados exigem confirmação de solicitante/data. Conferência em Estoque → Resumo e em `docs/IMPORTACAO_ESTOQUE_REALMED.md`.

Backup anterior à importação: `/qyvia/realmed/shared/backups/legacy-inventory/realmed-inventory-before-2026-10-19T16-56-22-032Z.json`; SQL anterior à migration pelo fluxo normal de deploy. ZIP original preservado nessa pasta privada. Validação: 104 testes backend, MySQL isolado com captura real (rollback, idempotência e conservação de saldo alterado), regressão do estoque, padrão de telas em quatro dimensões e relatório/bloqueio de pedidos em navegador. HTTPS frontend 200, API saudável e logs de erro vazios após publicação.

## Avaliação fisioterapêutica digital — 19/10/2026

Release final publicado: `20261019-143243`. Migration `20261019000003_expand_digital_evaluation.js` aplicada localmente e em produção, com backup pelo deploy anterior `20261019-142754`. Recepção inicia somente com paciente; avaliação digital segue as oito seções do DOCX, com lateralidade, mapa por toque, agenda, responsável e rubrica. Rascunho, confirmação de conclusão, leitura após concluir e reabertura auditada. Toque curto marca o mapa; arrastar para rolar não cria marcações.

Validação: 107 testes backend; MySQL isolado com criação mínima, preservação de campos/desenhos, sincronização, conclusão idempotente, reabertura e permissões; navegador em tablet vertical/horizontal e celular; compatibilidade de avaliações antigas; padrão de telas em quatro dimensões. PDF com texto clínico extenso, mapa e rubrica renderizado e conferido. Em produção, GET da avaliação/opções e prévia PDF retornaram 200, sem gravar documentos ou pacientes de teste. Frontend HTTPS 200, API saudável, logs de erro vazios e estoque preservado em 315 unidades. Referência funcional: `docs/AVALIACAO_FISIOTERAPEUTICA_DIGITAL.md`.

## Requisições para consumo e pedidos de compra — 19/10/2026

Release publicado: `20261019-172300`. Requisição para consumo identifica usuário/data no servidor e baixa itens atomicamente por setor, com chave de reenvio e bloqueios para evitar dupla baixa/saldo negativo. Pedidos de Compra usa `/estoque/pedidos`, com criação manual e geração automática de rascunho para produtos ativos em saldo <= mínimo (inclui zero/ausência de saldo); sugestão max(1,mínimo-saldo), itens e quantidades editáveis. Compras não movimentam estoque; recebimento permanece por nota fiscal. Histórico anterior preservado em Requisições Anteriores. Permissões novas independentes, sem concessão automática. Resumo e relatórios incluem consumo novo e preservam dados antigos.

Migration `20261019000005_consumption_and_purchase_orders.js` aplicada localmente e em produção, com backup antes da aplicação. Local: conferência por hash dos dados existentes; produção: 315 unidades e 19 requisições históricas preservadas. Novas tabelas e vínculo do movimento à retirada, sem reimportar ou converter dados anteriores.

Validação: 111 testes backend; MySQL isolado com rollback de múltiplos itens, reenvios concorrentes, consumo simultâneo, saldo insuficiente, identidade/setor, permissões, produtos inativos, limiares igual/zero/sem saldo, pedidos manuais/automáticos, edição e revisão concorrente, consumo imutável e resumo; navegador desktop/celular para retirada e revisão de compra; padrão de telas e build. Produção: seis endpoints de leitura autenticada HTTP 200, migrations conferidas, frontend HTTPS 200 e API saudável. Nenhuma retirada ou compra fictícia criada em produção. Log frontend vazio; log API mantém os 2201 bytes antigos de SADT, sem crescimento nesta validação.

## Datas MySQL nas guias SADT — 19/10/2026

Release publicado: `20261019-165911`. Corrigida a conversão prematura de Date para texto no motor de documentos, que impedia formatar REFERRAL_DATE e gerava excesso nas oito células. Formata datas antes da conversão genérica; preserva campos e limites do modelo, sem truncamento ou migration.

Validação: comandos de preenchimento equivalentes entre datas ISO e objetos MySQL Date nos três modelos, em prévia/geração; PDF fictício renderizado e conferido, com encaminhamento e validade completos; 111 testes backend. Servidor: três PDFs gerados somente em memória com Date, frontend HTTPS 200 e API saudável. Nenhum documento de tratamento foi criado para teste.

## Filas de avaliação e Central de Guias — 19/10/2026

Release publicado: `20261019-165433`. Abas Aguardando Avaliação e Aguardando Central de Guias, com filtros `workflow_queue` no servidor e contadores/paginação consistentes. Conclusão clínica separa as filas; READY segue em Pendentes; tratamentos enviados/liberados ou encerrados ficam fora dessas filas de preparação. URL preserva a aba; abas anteriores permanecem.

Validação: MySQL temporário cobrindo ausência/rascunho, conclusão, READY, reabertura e totais com página de uma linha; navegador com contadores, parâmetros, reload e celular; padrão de telas, build e 110 testes backend. Sem migrations. Produção: frontend/backend conferidos, HTTPS 200 e API saudável. Log frontend vazio; log API contém mensagens anteriores desta publicação (release `163744`, 19:49–19:51 UTC) de validação SADT REFERRAL_DATE excedendo oito caracteres, sem relação com as novas filas. Não apagar o log.

## Data de criação na Gestão de Tratamentos — 19/10/2026

Release publicado: `20261019-163744`. Coluna Criado em com data/horário; padrão Criação mais recente, também ao limpar filtros. Backend ordena criação decrescente e desempata por ID decrescente para paginação estável. Validado no MySQL temporário, navegador, padrão responsivo e build; 110 testes backend. Sem migrations. Produção: arquivos conferidos, HTTPS 200, API saudável e logs de erro vazios.

## Recepção, avaliação e preparação — 19/10/2026

Release publicado: `20261019-163228`. Novo Tratamento solicita somente paciente e data da avaliação; convênio conhecido acompanha o paciente. Agenda fica na avaliação. Dados da recepção e Preparação pela Central de Guias permanecem recolhidos e editáveis no detalhe, incluindo sessões, início e procedimentos na preparação. Conclusão clínica informa a passagem à Central, sem encaminhamento automático ao convênio. Atualizados os documentos do fluxo e o teste que exigia os campos antigos.

Validação: MySQL temporário com criação mínima, edição posterior, prioridade zero e opções de preparação; navegador desktop/celular com criação, retorno ao detalhe e edição persistente; avaliação em tablet, agenda e conclusão; padrão de telas; build e 110 testes backend. Sem migrations. Produção: componentes e rota conferidos, HTTPS 200, API saudável e logs de erro vazios. Nenhum tratamento fictício criado em produção. Release `20261019-163019` foi interrompido nos testes antes de ativação.

## Colunas dinâmicas na Gestão de Tratamentos — 19/10/2026

Release publicado: `20261019-160908`. Distribuição automática pelo conteúdo, sem percentuais fixos; prioridade ao paciente, nomes com quebra e datas/status completos. Largura reajusta ao recolher menu; rolagem horizontal interna quando necessária. Validação com nomes curtos/longos, quatro larguras e menu recolhido, padrão de telas, build e 110 testes backend. Sem migrations. Produção: CSS conferido, HTTPS 200, API saudável e logs de erro vazios.

## Replicação de procedimentos por convênio — 19/10/2026

Atualização publicada: `20261019-155239`. Modal carrega os procedimentos da origem e permite seleção individual ou selecionar todos; exige seleção explícita. Backend recebe `procedure_ids`, valida pertencimento e copia somente os itens escolhidos. Trocar origem limpa a seleção. Validado com dois itens no navegador desktop/celular, subconjunto e IDs inválidos em MySQL isolado, padrão de telas, build e 110 testes backend. Sem migrations novas.

Release publicado: `20261019-154139`. Cadastros → Convênios possui ação de copiar com origem e múltiplos destinos, pesquisa e seleção. Copia procedimentos e regras específicas, preserva vínculos já existentes e cancela todos os destinos em caso de conflito. Sem migrations novas. Documentação em `docs/CODIGOS_E_DE_PARA.md`.

Validação: MySQL temporário com múltiplos destinos, descrições/regras avançadas, inativos, repetição sem duplicação, rollback e permissões; modal desktop/celular; padrão de telas; build e 110 testes backend. Produção: backend/modal publicados conferidos, HTTPS 200, API saudável e logs de erro vazios. Nenhuma replicação fictícia executada em produção.

## Tipografia compartilhada — 19/10/2026

Release publicado: `20261019-153118`. Outfit compartilhada em títulos, campos, tabelas, botões e diálogos, com escala por função e campos de 16 px em tablet/toque. Paginação considera a altura real do cabeçalho e das linhas após carregar fontes; espaçamento compacto preserva linhas e rodapé em desktop baixo. Padrão documentado em `docs/PADRAO_DE_TELAS.md` e centralizado em `frontend/src/assets/typography.css`.

Validação: 75 combinações de tela/resolução, diálogos e login; padrão de listagens em quatro dimensões; build e 110 testes backend. Sem migrations pendentes. Produção: CSS conferido, frontend HTTPS 200, API saudável e logs de erro vazios.

## Procedimentos dentro dos convênios — 19/10/2026

Release publicado: `20261019-145234`. Migration `20261019000004_insurance_procedures.js` aplicada localmente e em produção, com backup pelo fluxo de deploy. Convênios usa a fonte Stenci do tratamento; vínculo estável pelo identificador externo. Procedimento, descrição por convênio e códigos substituídos são cadastrados juntos, sem entradas avulsas no menu. Cadastros anteriores e regras avançadas permanecem acessíveis dentro de Convênios. Gerar guia lê o original recebido do mesmo tipo quando existir e abre conferência antes da nova versão.

Validação: 110 testes backend; MySQL isolado cobrindo 1234 → 1567, isolamento de descrições/regras por convênio, rollback de conflito, inativação/reativação, impressão digital de conferência e permissões; navegador desktop/celular cobrindo seleção Stenci, vínculo, cadastro conjunto, leitura automática, quantidades, prévia e preservação do original; padrão de telas em quatro dimensões e build. Produção: catálogo do convênio, regras/lookups e resolução no tratamento HTTP 200, migration e backfill conferidos, estoque preservado em 315 unidades, logs de erro vazios, API saudável e frontend HTTPS 200. Nenhum código fictício foi cadastrado em produção. Documentação: `docs/CODIGOS_E_DE_PARA.md`.

## Faturamento analítico — 19/10/2026

Release `20261019-173951` publicado. Menu/permissão billing_dashboard, indicadores locais por criação do tratamento, gráficos de idade/convênio/mês e pendências selecionáveis. Consultas Stenci de agenda diária, faturas paginadas e vínculo conta/fatura com contratos do HAR; login/logoff temporário e cache por argumentos, normalização sem CPF/contato/texto clínico. Guias recusadas/glosadas e em recurso são indicadores separados; consolidação por guia e coleta diária ainda pendentes. Sem migrations.

Validação: 115 testes backend, build, padrão obrigatório de telas, QA específico em desktop/tablet/celular e bloqueio de permissão; replay de seis respostas reais do HAR sem reutilizar tokens. Produção: dashboard autenticado HTTP 200, período/consulta inválidos 400, acesso anônimo 401, frontend HTTPS 200, API saudável. Logs preservados: api-error 2201 bytes históricos, frontend-error zero, sem crescimento. Teste de produção apenas de leitura, sem login externo nem dados fictícios. Chamadas Stenci autenticadas deverão ser conferidas pela sessão do usuário. Contratos e pendências em docs/FATURAMENTO_ANALITICO.md.

## Evolução pendente e adiamento de recursos — 19/10/2026

Release `20261019-180014`. Após inspeção autorizada do Stenci, o usuário confirmou que ainda não registram evolução. Agenda marca agendamentos finished como Evolução Pendente por política temporária explícita; faltas/agendados/cancelados não recebem o alerta. Sem consulta clínica inventada. Removidos indicador de recursos e colunas de valores em recurso/recuperado por solicitação posterior; status das faturas preservados. Quantidade de fatura rotulada Contas, distinta de pacientes e procedimentos; fatura finished exibida Finalizada.

Validação: build, 116 testes backend (incluindo distinção entre finalizados/faltas/cancelados para a política), QA do dashboard em três larguras e padrão obrigatório das telas. Produção: dashboard 200, validações 400, anônimo 401, frontend HTTPS 200, API saudável e logs sem crescimento (2201 bytes históricos no api-error, frontend-error zero). Sem migrations, sem novos endpoints Stenci, sem alterações em registros externos. Mapeamento de telas e decisões em docs/FATURAMENTO_ANALITICO.md.

## Coleta automática — publicação pendente por armazenamento (20/10/2026)

Implementação e migration 20261020000006 preparadas; 120 testes backend, build, MySQL descartável (upsert/rollback/remoções/isolamento/trava/recuperação), QA responsivo e padrão de telas passaram. Replay de três snapshots do HAR (92 agendamentos) validou datas e normalização sem persistir dados pessoais.

Tentativa `20261020-151405` parou antes da troca de release: MySQL ER_DISK_FULL_NOWAIT ao criar billing_stenci_schedules. Nenhuma tabela de coleta foi criada. Produção manteve `20261019-180014`. Diagnóstico somente de leitura: aplicação com 8,2 GB livres, proxy com 25 GB livres; nó MySQL 228019, /var/lib/mysql no volume de 29 GB, 100% usado e zero disponível. Tabelas Realmed pequenas; nenhuma limpeza de outros bancos/serviços foi feita. Solicitada ampliação do disco do MySQL ao usuário. Credencial exclusiva autorizada, configuração em janela local apontando para o candidato validado; confirmar resultado antes de ativar coleta. Reexecutar publicação e conferir migração/conta/snapshots após liberar o armazenamento.

Atualização de 20/10: credencial configurada com sucesso na janela local, com arquivos protegidos confirmados no servidor, sem exibir conteúdo. Usuário ampliou o disco: lsblk informa disco/partição próximos de 100 GB, mas df ainda mostra ext4 com 29 GB, 100% usado e zero disponível. A conta mysql tem sudo autorizado para resize2fs; tentativa online em /dev/ploop44259p1 foi recusada pelo ambiente com “Operation not permitted while opening”. Necessário concluir expansão do sistema de arquivos pelo painel/suporte SaveInCloud. Sem reinício ou exclusão de dados; release ativo continua 20261019-180014 e health ok. Correções de usuários/permissões também aguardam a publicação.

## Faturamento em abas e gráficos das referências — 20/10/2026

Filtros publicados no release `20261020-164848`: Agenda, Tipo (Todos/Fisioterapia/Avaliação), Local, Status e datas no topo, Aplicar filtros e Limpar. Backend calcula indicadores/gráficos/alertas após o recorte; tratamentos locais preservam filtro exclusivo de datas e explicam essa fonte. Locais confirmados em schedule.place no HAR; placeId do atendimento prevalece. Preserva múltiplos vínculos de agenda/local sem duplicar agendamentos. Avaliação tem prioridade no filtro de tipo; fisioterapia usa CREFITO ou descrição explícita do procedimento.

Migration `20261020000007_billing_agenda_filters.js` aplicada após backup; metadados antigos são reconsultados sem descartar snapshots válidos. Build, 127 testes backend, MySQL descartável com requeue/preservação, QA do dashboard em quatro dimensões e padrão obrigatório aprovados. Produção: dashboard/API HTTPS 200, quinze agendas e três locais (Hauer, Matriz, Tatuquara), filtros de tipo/status/local combinados HTTP 200 e tipo inválido 400, sem falhas do coletor. Na conferência inicial, 644 de 4084 agendamentos já possuíam vínculos atualizados e dois de vinte dias estavam atualizados; interface informa cobertura parcial enquanto os demais seguem no worker. Nenhum atendimento/agenda Stenci foi alterado.

Release `20261020-163425`: grupos do menu iniciam recolhidos, exceto o que contém a função atual. Navegação redefine os grupos pela rota ativa, sem restaurar expansões antigas do localStorage; expansão manual para escolher função permanece disponível. QA do faturamento e usuários/permissões aprovado, build e 123 testes backend passaram; frontend e API HTTP 200. Sem migration ou alteração na coleta.

Atualização de menu publicada no release `20261020-163038`: pais em ordem alfabética e grupo Faturamento → Dashboard, em `/faturamento/dashboard`. Pai apenas expande/recolhe. Links antigos preservados por redirect com query/aba. Grupo ativo abre também no carregamento direto. QA específico e padrão obrigatório de telas aprovados; build e 123 testes backend passaram, sem migrations. Nova rota pública e API health HTTP 200.

Release final `20261020-162509` publicado; `20261020-162137` foi a primeira reorganização em abas, refinada pelas novas referências do usuário. Agenda, Guias e Tratamentos, Pendências e Consultas Stenci separam gráficos e listagens. Cards principais largos, barras verticais turquesa, curvas de área preenchida, rosca com percentuais/total e legenda inferior. Distribuição e evolução mensal alternam o gráfico esquerdo e preservam convênios à direita. Demais indicadores recolhidos; filtros/cobertura compartilhados e aba preservada na URL. Consultas não empilham agenda e faturas. Valores financeiros permanecem indisponíveis, sem inferência.

Validação: build/type-check; QA específico com quatro abas em 1366, 1920, 768 e 390 px, pesquisa, indicadores adicionais, modal de dados, preservação de aba no reload, agenda/conta/faturas, negação de acesso e ausência de coleta; padrão obrigatório de telas aprovado; 123 testes backend passaram no publicador. Sem migrations novas; frontend e API pública HTTP 200. Abertura em aproximadamente uma tela de desktop (798 px na fixture em 1366×768), sem esconder conteúdo para forçar altura. Documentação visual e funcional atualizada.

## Coleta automática e usuários/permissões — publicados em 20/10/2026

Após ajuste do usuário, MySQL com 168 GB totais, 139 GB livres. Release `20261020-155705` aplicou a migration de coleta após backup e 123 testes aprovados. Verificação inicial identificou data inválida no início do mês quando não há histórico; corrigido para AAAA-MM-01, adicionado cenário de primeira instalação ao teste MySQL descartável e publicado pelo mesmo fluxo no release `20261020-160159`, novamente com 123 testes aprovados. Sem migrations adicionais pendentes e sem alterações em outros serviços.

Coleta com conta exclusiva protegida confirmada: 15 agendas, quatro dias completos, 640 agendamentos em dois dias com registros, dezesseis dias restantes na fila do mês, zero dias com falha e errorCode null na verificação. Dias completos sem agendamento são mantidos como cobertura válida. Continuação pelo worker em segundo plano; gráficos mostram cobertura parcial e nenhum período completo foi afirmado nesta conferência.

Usuários sem senha local, bloqueio preservando histórico, login Stenci respeitando bloqueados/inativos e página Sem Permissão publicados junto. GET autenticados de usuários, permissões e faturamento HTTP 200; anônimo 401. Frontend HTTPS 200, API pública /api/health 200. Nenhum usuário, tratamento ou lançamento fictício criado em produção. Validações locais de usuários/permissões: MySQL descartável, navegador, padrão obrigatório e build; collector inclui teste de bootstrap sem histórico. Credenciais nunca expostas nos logs de verificação.
