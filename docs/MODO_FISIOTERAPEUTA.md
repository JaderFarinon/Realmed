# Modo Fisioterapeuta

## Horários recolhidos na agenda — 11/11/2026

Todas as sessões iniciam recolhidas, inclusive a atual. Cabeçalho com número, início/fim, agenda, situação e quantidade de pacientes permanece visível; tocar no cabeçalho/seta expande ou recolhe seus pacientes. Botão nativo com aria-expanded/aria-controls permite teclado; sessões expandem independentemente, sem novas consultas. Trocar a data ou retornar à tela reinicia os grupos recolhidos. Atualizar a mesma data ou alternar as abas mantém a escolha em memória, sem armazenamento no navegador. A mudança de horário não expande grupos automaticamente. Expandir sessões anteriores/futuras permite somente consultar seus cards; a abertura do atendimento continua limitada à sessão atual na interface/API.

## Abertura limitada ao horário atual — 11/11/2026

Somente a sessão agrupada atual permite abrir os atendimentos. Considerar início inclusivo/fim exclusivo em America/Sao_Paulo: por exemplo, 13:00–13:45 libera todos os pacientes das posições 13:00…13:05 desde 13:00 e bloqueia exatamente às 13:45. Preservar intervalos variáveis e o fim previsto do último grupo; permitir a janela que atravessa a meia-noite somente até o fim calculado. Dias anteriores/futuros permanecem em consulta da agenda.

groupSessions informa start_minute/end_minute; sessionAccess compartilha a regra de autorização no backend. GET /physio/agenda inclui server_time gerado após a consulta. GET /physio/agenda/:id revalida vínculo e janela antes e depois da leitura do histórico; horário externo retorna 409/PHYSIO_OUTSIDE_SESSION, sem dados do atendimento nem encerramento do login. Ignorar parâmetros de relógio enviados pelo cliente. Nenhuma gravação clínica habilitada; os futuros comandos Stenci devem aplicar essa mesma checagem.

Frontend ancora o relógio em server_time e performance.now, sem usar a data/fuso local para conceder acesso. Atualiza cards a cada segundo, sem requisições periódicas; ao voltar do segundo plano invalida a referência e consulta novamente uma vez. Sem horário válido, abertura indisponível. Cards fora da janela são artigos com aria-disabled, sem link/tabulação/ação; indicam Aguardando horário ou Horário encerrado e mantêm dados/status legíveis. Sessão atual destacada e cards com Abrir. Detalhe já aberto é ocultado por aviso de fora do horário quando a janela termina.

Validação: testes unitários de limites, fuso/data, grupos e meia-noite; MySQL/API temporário para URLs diretas, parâmetros falsificados e expiração durante leitura; frontend/scripts/verify-physio-session-window.cjs para toque, relógio do tablet incorreto, troca automática, segundo plano, detalhe aberto, ausência de horário e zero polling.

## Componentes compactos no tablet — 11/11/2026

Redução aproximada de 30% solicitada pelo usuário para diminuir a ocupação visual da área autenticada. CSS responsivo reduz cabeçalho, abas, campos, cards de pacientes/sessões, indicadores de status, formulário de ajustes, revisão e detalhe/evolução. Agenda, Pacientes, Produção e Configurações usam ações principais/campos de 36 px no tablet, com textos legíveis; a dimensão efetiva varia com o conteúdo e a quebra de linhas. Sem escala global/zoom, sem esconder dados e sem mudar consultas ou gravações. Celular e login facial/câmera mantêm o layout anterior. Validação visual em tablet paisagem/retrato, celular e regressões existentes de agenda/configurações/padrão compartilhado.

## Configurações e pedidos de ajuste de agenda — 11/11/2026

Quarta aba Configurações, ao lado de Agenda, Pacientes e Produção. Ajustes na agenda mostra as sessões com pacientes da data consultada, reutilizando GET /physio/agenda e seus vínculos/agrupamento. Não apresenta esses horários como grade semanal completa nem como disponibilidade. Data vazia, erro e ausência de vínculo têm tratamento distinto; alternar abas não dispara novas consultas.

Formulário permite preparar ajuste pontual (uma data) ou definitivo (vigência e dias da semana), selecionando uma agenda vinculada e a ação Alterar horário, Adicionar horário ou Bloquear horário. Selecionar um horário preenche a referência, mantendo o aviso quando o fim é estimado. Validar períodos positivos de até 24 horas, passagem ao dia seguinte, ao menos um dia no definitivo, motivo e mudança efetiva ao alterar. A consulta de outra data não apaga o pedido em preparação.

Revisar solicitação abre ListDetailDialog com agenda, tipo, período/vigência, horários e motivo. O usuário enviará o HAR do Stenci depois: Enviar solicitação permanece indisponível e a tela explica que a prévia não foi enviada nem salva. Nenhum endpoint de gravação inventado, pedido local persistido, notificação administrativa enviada ou agenda alterada. Conteúdo apenas em memória do componente, mantido ao alternar abas e descartado ao sair/recarregar; sem localStorage/sessionStorage. As configurações do rodízio e os atendimentos permanecem independentes.

Validação: frontend/scripts/verify-physio-settings.cjs cobre os dois tipos de pedido, dias da semana, períodos inválidos e noturnos, adicionar/bloquear, seleção de agenda, prévia, estados vazios/erro, preservação entre abas, ausência de escrita/persistência e telas de tablet/celular.

## Agenda agrupada e ficha do atendimento — 11/11/2026

O usuário confirmou duração atual de 45 minutos, mas pediu inferir os limites pela agenda para acompanhar alterações. `physioRead` usa o contrato GET `/v1/calendar` já conhecido, retornando campos selecionados do paciente/convênio/serviços e apenas os horários das posições vazias. `physioAgenda.groupSessions` agrupa minutos consecutivos da mesma agenda/data, inclusive posições vagas entre pacientes. Não fabricar vagas, somar capacidade ou misturar agendas. Agendamentos duplicados em várias agendas vinculadas aparecem uma vez; grupos vazios ajudam a delimitar os horários, mas não ocupam cards na tela. Numeração cronológica dos grupos com pacientes.

O fim de uma sessão corresponde ao início do próximo grupo observado. Para o último grupo, usa o intervalo entre os dois últimos grupos; se só houver um grupo observado, usa 45 minutos. Ambos os casos mostram Fim previsto; previsão de 45 minutos é indicada explicitamente. Não confundir o endDate técnico de um minuto de cada posição com a duração da sessão. Datas/horas em America/Sao_Paulo. Cálculo do rodízio e contagem da produção permanecem independentes.

Paleta da legenda enviada pelo usuário: scheduled/agendado #F1E87A; cancelamentos paciente/profissional #FF9696; confirmed #00B6AE; unsuccessful #8B68CE; in_attendance #20F8FF; waiting #E8A363; missed #F85C5C; finished #3197FF; report #30FF9B; payment #B74AFF; pending #787878; rescheduled #E895FF; screening #B4FF00. Rótulo textual acompanha a cor; estado desconhecido não é apresentado como Agendado. Códigos corroborados pelos contratos anteriores, inclusive `stenci_har_docs.zip`.

Toque no paciente abre `/modo-fisio/atendimentos/:id?date=...`. GET `/api/physio/agenda/:appointmentId` consulta exclusivamente agendas vinculadas e rejeita IDs externos ao recorte; retorna identificação, nascimento informado, convênio, grupo/posição, serviços e até 20 atendimentos operacionais próprios. Esse histórico não é evolução clínica. Alergias não consultadas são identificadas como tal.

Tela tablet com nome destacado, resumo, ficha Anamnese/evolução e histórico. A pedido do usuário, preparar a interface enquanto ele envia o HAR de gravação. Iniciar atendimento, salvar rascunho, finalizar e campos clínicos ficam indisponíveis, com indicação permanente de consulta. Não criar cronômetro, estado clínico ou sucesso fictício. Não escrever no Stenci, banco Realmed ou armazenamento clínico no navegador. Os dados de evolução, alergias e comandos de gravação dependem dos próximos contratos. Voltar/avançar usa navegador; data da agenda preservada na URL. Troca rápida de data cancela/descarta respostas anteriores, sem ciclo de recarga.

Testes: `backend/test/physio-agenda.test.js`, `deploy/test-physio-shared-access.cjs` e `frontend/scripts/verify-physio-agenda.cjs`, cobrindo intervalos variáveis, vagas intermediárias, último grupo, horários UTC, duplicidade, cores, escopo no servidor, dispositivos e ausência de gravações.

## Conta Realmed, senha e avisos aos administradores — 11/11/2026

Administradores podem criar contas locais, escolher perfil User e vincular o profissional PHYSIOTHERAPIST/CREFITO ativo. Vínculo é individual/único; não exige login próprio no Stenci nem concede permissões nos demais módulos. Cadastro facial fica disponível também para contas locais. A tela facial oferece Entrar com senha: autenticação local com bcrypt, seguida de abertura direta da área do fisioterapeuta. Senhas continuam com os limites de tentativas do login convencional; a regra dez tentativas/um minuto vale somente para o facial.

Login por senha bem-sucedido de fisioterapeuta vinculado gera `PHYSIO_PASSWORD_LOGIN` para os administradores. O sino da barra superior mostra o contador e abre o histórico com usuário, profissional e horário. Leitura independente por administrador; registros persistidos em `system_notifications` e `system_notification_reads`. Consulta a cada 30 segundos em página visível e ao recuperar foco, sem chamadas sobrepostas e respeitando 429. Falhas, facial e renovação da conexão não notificam. Nenhuma mensagem externa é enviada.

`GET /physio/me` revalida usuário/vínculo e informa se a conexão precisa ser criada. `POST /physio/session` usa somente a identidade autenticada e os secrets do servidor; retorna JWT com o mesmo prazo restante, jamais estende a sessão. Renovação automática após reinício preserva a conta Realmed, sem pedir senha compartilhada ao profissional. Cada sid guarda o usuário e profissional; vínculo/situação são revalidados em todas as rotas. Sessões `physio-shared` só atendem chamadas internas com escopo `physio`, rejeitadas pelos endpoints genéricos Stenci. A fila compartilhada serializa operações entre sessões para não sobrepor logins/logoffs da mesma conta externa.

Validação: `deploy/test-physio-shared-access.cjs` usa MySQL temporário e Stenci simulado para cadastro, vínculo, biometria, senha, leitura individual das notificações, revogação, escopo de agenda/paciente/produção e recuperação. `frontend/scripts/verify-physio-password-notifications.cjs` cobre o fluxo de senha, sino responsivo e renovação. A conta configurada no servidor foi validada por autenticação, consulta de agenda e logoff reais, sem alterar atendimentos.

## Acesso facial pelo tablet

O endereço `/modo-fisio/entrar` é público. A câmera frontal do tablet captura quadros durante a validação. O servidor executa detecção, vivacidade passiva e comparação facial; as imagens não são gravadas. O usuário precisa ser ativo, ter perfil `user`, estar vinculado explicitamente a um profissional CREFITO ativo e possuir cadastro facial.

Redesenho de 11/11/2026: uma única área ampla de câmera ocupa o centro da tela, com instrução e ações em uma faixa inferior. Substitui completamente a composição anterior de texto à esquerda e câmera pequena à direita. Priorizar o TCL 8492A em paisagem pela dimensão/orientação da janela, sem depender do tipo de ponteiro. Adaptar também ao celular em retrato; controles principais com pelo menos 48 px e sem corte em janelas baixas.

O fluxo atual é **Ativar câmera → posicionar o rosto → Entrar → verificar → abrir atendimento**. A pedido do usuário em 11/11/2026, remover espera de três segundos e piscada obrigatória. Capturar seis quadros JPEG de largura 480, qualidade 0,82, separados por 120 ms (cerca de 600 ms entre primeiro/último), com novo desafio descartável por tentativa. Não capturar nem autenticar automaticamente ao abrir a câmera, nem repetir tentativas em loop. Prévia espelhada com `object-fit: contain`, sem cortar a imagem capturada; o contorno acompanha as dimensões reais do vídeo, inclusive após girar o dispositivo.

Cancelar continua disponível durante permissão, captura e requisições. Abortar requisições/temporizadores, parar todas as trilhas ao cancelar, navegar ou ocultar a página e ignorar resultados atrasados. Permissão concedida depois do cancelamento também deve liberar a câmera. Limpar quadros/canvas após a operação; não armazenar imagens no navegador. Sucesso mostra confirmação breve e abre a área existente. Falhas de permissão, câmera ausente/ocupada e reconhecimento oferecem orientação e nova tentativa explícita; erros usam notificação global, mantendo a orientação de recuperação na faixa de ações. Respeitar Retry-After no 429, com botão temporariamente indisponível.

Verificação automatizada: `frontend/scripts/verify-physio-login.cjs`, com câmera sintética e APIs interceptadas. Abrange resoluções, ausência de captura automática, sequência de quadros, cancelamento/respostas tardias, permissão negada, retentativa/429, saída da página, sucesso e descarte de mídia. Não usa webcam real nem cria sessões de produção. A calibração física da câmera/posição do tablet continua exigindo teste no dispositivo.

O frontend pode ser instalado como PWA no Android. No Chrome, abra `/modo-fisio/entrar`, use **Instalar app** quando o botão aparecer ou o menu do navegador → **Instalar app**. A tela inicial instalada abre no acesso facial. O service worker mantém somente o shell e os arquivos estáticos do app para abertura offline; nenhuma resposta de API, cadastro de paciente ou dado clínico é armazenado no cache.

O cadastro é feito em Configurações → Usuários. Primeiro associe o usuário ao profissional local; depois capture três imagens (frente, leve esquerda e leve direita). O servidor armazena somente os descritores faciais cifrados com AES-256-GCM em `physiotherapist_face_biometrics`. A chave `REALMED_BIOMETRY_KEY` deve ser uma chave Base64 de 32 bytes, armazenada como segredo de ambiente e mantida em backup seguro. Perder ou substituir a chave torna os cadastros existentes ilegíveis; será necessário recadastrar os rostos. Remover a associação ou bloquear/inativar o usuário apaga o modelo facial.

O reconhecimento usa `@vladmandic/human` 3.3.6 e `@tensorflow/tfjs-node` 4.22.0 no backend. O processamento depende dos modelos locais empacotados pela biblioteca; não baixar modelos dinamicamente no tablet. Atualizações de modelo que mudem os descritores exigem nova versão do modelo e recadastro. A câmera do tablet precisa de origem HTTPS e permissão do navegador.

**Tentativas e pausa — 11/11/2026:** somente o login facial permite dez tentativas sem sucesso por tablet/IP compartilhado. A décima falha inicia uma pausa fixa de 60 segundos e já responde 429 com `Retry-After`; ao terminar, há dez novas tentativas. Pedidos durante a pausa recebem somente o tempo restante, sem prolongá-la. Bloqueia também a emissão de desafios enquanto essa pausa estiver ativa. Login bem-sucedido zera as falhas; solicitação intermediária de piscada, indisponibilidade do servidor/Stenci e leituras ainda em processamento não consomem a cota. Tentativas simultâneas reservam o saldo disponível para impedir ultrapassar dez falhas.

A emissão de desafios mantém proteção separada contra excesso de chamadas: 30 por minuto, com espera restante de no máximo 60 segundos. Esses dois POSTs públicos usam suas proteções próprias, sem a janela geral de 15 minutos da API. A contagem no navegador também é separada da espera dos demais módulos; ao terminar, libera Tentar novamente sem disparar nova leitura automaticamente. Login por usuário/senha e alteração de senha mantêm as regras anteriores. Testes de ciclos, concorrência e isolamento: `backend/test/facial-login-attempts.test.js`, `backend/test/physiotherapist-face-api.test.js` e `frontend/scripts/verify-physio-login.cjs`.

### Reconhecimento ágil — 11/11/2026

- Pré-carregar/aquecer modelos com a amostra embutida da biblioteca ao iniciar a API. Desligar íris e emoções; manter malha facial, alinhamento por rotação, descritor, antifoto, vivacidade e cálculo leve de gestos a partir da malha. Inferência serializada entre logins/cadastros, fila limitada a quatro trabalhos e caches de detecção desativados para não reaproveitar resultados entre pessoas.
- Analisar primeiro início/meio/fim da captura; parar em três quadros válidos e usar no máximo seis análises. Aceitar quadros intermediários ruins, mas exigir pelo menos duas imagens distintas com qualidade, antifoto e vivacidade >= 0,6. Rejeitar múltiplos rostos na imagem analisada. Bytes idênticos não constituem duas confirmações.
- Uma sequência praticamente estática não basta, mesmo que os modelos passivos retornem scores altos. Comparar assinaturas temporárias de luminância central (16×16 blocos) pela correlação normalizada, ignorando mudança global de brilho/contraste; diferença inferior a 0,0005 pede confirmação adicional. Servidor emite outro desafio descartável de 30 segundos vinculado ao modo `blink` e retorna `FACE_MOTION_REQUIRED`. Interface mantém a câmera, explica e aguarda Confirmar com piscada; captura então 16 quadros e o servidor exige sequência olhos abertos → piscada → abertos, além de dois descritores de olhos abertos. Não repetir automaticamente e não aceitar opção do cliente para retirar a exigência. A checagem de movimento bloqueia a amostra estática testada, mas não prova profundidade ou rejeição universal de fotografias/vídeos.
- Comparar cada descritor com os cadastros existentes, mantendo similaridade mínima 0,5 e margem mínima 0,04 entre identidades. Exigir duas confirmações do mesmo usuário e rejeitar identidades conflitantes; um quadro ambíguo não vota. Descartar descritores de consulta, retornos do motor e temporários também em falhas.
- Correção limitada de sombras antes da inferência: medir luminância mediana central, aplicar curva gama entre 0,65 e 1 apenas quando moderadamente escuro (mediana 10–84), preservando altas luzes. Imagens normais e praticamente pretas não são modificadas. Essa compensação não recupera detalhes perdidos no escuro nem garante leitura com janela/sol diretamente atrás. Modelo e vetores de 1024 valores permanecem compatíveis com os cadastros cifrados existentes.
- A verificação passiva substitui o desafio ativo em toda entrada; a piscada fica como confirmação adicional para sequência estática. Mantém filtros probabilísticos contra apresentação de fotos, mas não comprova profundidade física nem oferece a segurança de sensores infravermelhos. A biblioteca descreve limitações dos modelos em [antifoto/vivacidade](https://github.com/vladmandic/human/discussions/206); [Face ID](https://support.apple.com/en-us/102381) usa hardware específico. Não afirmar equivalência nem taxa de acerto validada sem calibração representativa no tablet.

Testes de política/inferência isolada em `backend/test/physiotherapist-face.test.js` cobrem confirmações, ambiguidade, rejeições, repetição, limpeza, limites, concorrência e compensação. Testes sintéticos não medem falsos aceites/rejeições de pessoas reais.

## Identidade e Stenci compartilhado

Cada fisioterapeuta continua sendo um usuário Realmed individual para identificação, auditoria e associação à agenda. A senha e o usuário Stenci usados pelo modo ficam em secrets do servidor `STENCI_FISIO_USERNAME` e `STENCI_FISIO_PASSWORD`; não vão ao navegador, banco ou logs. Essa conta Stenci compartilhada é uma exceção autorizada para o modo de fisioterapia e não muda o login individual do restante do Realmed nem a conta isolada do coletor de faturamento.

Após o reconhecimento, o backend autentica a conta Stenci compartilhada, seleciona a branch Realmed, valida `/v1/me`, confirma o logoff e então cria o JWT Realmed do profissional reconhecido. As credenciais são copiadas para o `StenciSessionStore` criptografado em memória durante a validade do JWT, encerradas no logout/expiração/reinício e usadas em operações com login/logoff temporários.

Para desenvolver o fluxo de login e a montagem das telas antes de configurar a conta compartilhada, `STENCI_FISIO_DEV_BYPASS=true` habilita uma sessão Realmed sem Stenci. O reconhecimento facial, usuário ativo e vínculo ao profissional continuam obrigatórios. Nesse modo, `/physio/me` sinaliza a sessão de desenvolvimento e a interface mostra as abas sem chamar agenda, busca de pacientes ou produção. A variável fica desativada por padrão em `.env.example`. Em produção, a ativação requer também `STENCI_FISIO_DEV_BYPASS_IN_PRODUCTION=true`, para tornar explícita a janela de teste.

## Agenda, pacientes e produção disponíveis

- Agenda lê as agendas associadas explicitamente ao profissional em `physiotherapy_rotation_agendas` e consulta `/v1/calendar` para a data escolhida.
- Busca usa o cadastro de pacientes do Stenci, mas retorna somente pacientes com atendimento nas agendas vinculadas ao profissional, na branch configurada. Histórico filtrado pelas mesmas agendas; consulta também a agenda atual para pacientes ainda não coletados. A busca upstream limita 30 resultados e informa quando é necessário refinar nome/CPF. Atendimentos compartilhados usam `schedule_memberships`, sem expor nomes de outras agendas nem contar duas vezes.
- Produção soma os registros já coletados em `billing_stenci_appointments` no período informado. O resumo compartilhado pelo tablet não inclui dados de pacientes.
- O acesso facial também pode ser alcançado pela área autenticada e pelo link da tela de login regular. Contas locais usam a própria senha Realmed como alternativa; contas Stenci existentes continuam com seu login regular.

## Operações Stenci ainda pendentes de contrato

Este modo não inventa contratos para ler/gravar evolução, finalizar atendimento ou alterar o status de agenda. Não exibir essas ações como concluídas até receber e implementar os endpoints e respectivos corpos/respostas fornecidos pelo usuário.

## Configuração de ambiente

```dotenv
STENCI_FISIO_USERNAME=
STENCI_FISIO_PASSWORD=
STENCI_FISIO_DEV_BYPASS=false
STENCI_FISIO_DEV_BYPASS_IN_PRODUCTION=false
REALMED_BIOMETRY_KEY=
```

Gere `REALMED_BIOMETRY_KEY` com 32 bytes aleatórios codificados em Base64, por exemplo `openssl rand -base64 32`. Use secrets do servidor em produção; não coloque valores reais em `.env.example`, imagens, frontend ou repositório.
