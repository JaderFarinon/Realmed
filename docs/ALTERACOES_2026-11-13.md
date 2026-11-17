# Alterações do Realmed — 13/11/2026

## Republicação solicitada

Pacote consolidado `20261113-122051` compilado com sucesso, mesmo asset `index-apI0ahvB.js`. Envio interrompido por falha de conexão antes de executar a publicação remota. Ao retomar, Pageant ausente e autenticação SSH indisponível; solicitada recarga da chave. Conferência HTTPS confirmou as melhorias anteriores em funcionamento, consulta de agendamento habilitada, confirmação bloqueada, prévia administrativa protegida e página responsiva. Nenhuma troca de release foi confirmada nesta tentativa; última publicação concluída: `20261113-121311`.

## Agendamento online: agenda de avaliação e desktop

- Layout ampliado no computador, com introdução lateral, formulário maior e horários mais legíveis. Celular mantém o fluxo em uma coluna.
- Agenda escolhida pelo usuário: Avaliação, Realmed Matriz (Helen informada como fisioterapeuta); consulta institucional com horários de 20 minutos, 08h–19h40, antecedência mínima de duas horas e indisponíveis visíveis como Ocupado.
- Consulta de conferência em Configurações → Agendamento online, sem preencher dados de paciente; usa a configuração salva e respeita os mesmos critérios.
- Endereço/contato pendentes não impedem consultas; confirmação real permanece bloqueada até integrar e validar os contratos Stenci de gravação.
- Publicado na release `20261113-121311`, asset `index-apI0ahvB.js`. Build/TypeScript, 225 testes backend, integração MySQL descartável, interface pública/administrativa e padrão compartilhado aprovados. Site publicado conferido em 360/390/1280/1920 px e API saudável.
- Configuração aplicada com auditoria, revisão 1: apenas Avaliação da Matriz, serviço Avaliação Inicial (Ambulatorial), 75 planos vinculados no catálogo Stenci. Consulta real de MedSênior retornou 36 posições por data e vagas em 18, 19 e 23/11; 13 e 16/11 sem vagas no momento consultado. Nenhum cadastro, tratamento ou reserva criado. Confirmação permanece desabilitada.

## Rodapé do app do paciente

- Barra fixa e discreta de 28 px no fim da tela, respeitando a área segura do celular.
- Conteúdo curto preenche a altura disponível; conteúdo longo tem espaço reservado para não ficar coberto. Rodapé também aparece durante carregamento e em erro.
- Ajuste visual, sem alteração de links, vínculos ou dados. Conferidos conteúdos curtos, longos e erro em 360×640, 390×844 e 1280×900, com barra de 28 px na base e última informação acessível. Build/TypeScript, padrão compartilhado e 225 testes backend aprovados.

Publicado na release `20261113-103318`, asset `index-CeBlbjgx.js`, sem migrations. Site/API saudáveis e build ativo conferido; dependências preservadas em `20261109-153438/backend/node_modules`, rollback anterior `20261113-100348`. Logs `.deployment/patient-footer-build.log`, `patient-footer-screen-pattern.log`, `patient-footer-publish.log` e `patient-footer-production.log`; capturas `patient-footer-*.png`.

## App do paciente pela Gestão de Tratamentos — comportamento final

- App do paciente no card superior e olho na lista abrem a página pública individual, sem login, no mesmo endereço entregue ao paciente.
- Avaliação prepara automaticamente um QR code com controles Abrir app do paciente e Copiar link. O código é estável por paciente e reutilizado nas continuações.
- Interface para celular com Início, Agenda, Avaliação e Evolução, seletor de tratamentos do mesmo paciente e opção Salvar no celular. Apenas avaliações concluídas são exibidas; horários usam a coleta existente, com indicação de atualização. Evoluções e relatório final continuam aguardando consulta integrada.
- Agendamento online permanece separado em `/agendar-avaliacao`, sem botão na Gestão de Tratamentos. Configuração de agendas e bloqueios de confirmação preservados.
- Link com código aleatório, vínculo conferido no servidor, emissão concorrente idempotente e registro de criação sem gravar o código no histórico. Nenhuma alteração de etapa, prontuário, paciente ou reserva de edição.
- Build/TypeScript e 225 testes backend aprovados. MySQL descartável confirma vínculo, concorrência, acesso sem login, isolamento, rascunhos, exclusão e revogação. Interface validada em 360/390/1280 px, com QR, abertura real da nova aba e manifesto individual sem cache clínico.

Publicado na release final `20261113-100348`, asset `index-SVsBgmp0.js`. Backup e migration `20261113000002_patient_portal` executados na publicação inicial `20261113-100201`; versão final inclui recarregamento do QR quando muda o paciente do tratamento, sem nova migration. Build/TypeScript, 225 testes backend, MySQL descartável e padrão compartilhado aprovados. Site/API saudáveis; código público inválido retorna 404/no-store, emissão anônima retorna 401. Interface publicada em 360/390/1280 px aprovada com dados sintéticos, incluindo abertura sem login, QR, seleção de ciclo e manifesto individual. Nenhum acesso de paciente fictício foi criado em produção, nem dados reais consultados nos testes. Dependências preservadas em `20261109-153438/backend/node_modules`, manifests idênticos. Logs `.deployment/patient-portal-*.log`. Substitui a prévia autenticada da release `20261113-093952` e remove seu atalho de agendamento. Detalhes atuais em `VISAO_DO_PACIENTE.md`.

## Agendamento online de avaliações — implementação

- Nova página pública `/agendar-avaliacao`, adaptada ao celular: CPF, conferência de nascimento para paciente existente, dados, convênio/plano, carteirinha e validade, escolha do horário e revisão.
- Grade de 20 minutos das 08h às 19h40, com horários ocupados/indisponíveis visíveis e bloqueados. Antecedência de duas horas no relógio do servidor; período padrão de 30 dias, configurável.
- Configurações → Agendamento online: seleção explícita de agendas de avaliação da Matriz, serviço e convênios; requisitos de carteirinha, endereço e contato; acesso administrativo com revisão e auditoria.
- Consultas restritas ao Stenci com login/logoff temporários, contexto público em memória, conferência de nascimento, validação de CPF e respostas sem dados de pacientes da agenda.
- Confirmação permanece desabilitada na tela e na API. Nenhum cadastro/reserva/tratamento é criado. Pendentes os contratos Stenci de cadastro, criação de avaliação, reconciliação e conflito de vaga; detalhes em `AGENDAMENTO_ONLINE_AVALIACAO.md`.
- Configuração inicial desabilitada, sem agenda escolhida automaticamente. A equipe deverá escolher as agendas e os convênios antes de habilitar as consultas públicas.

## Validação e publicação

Publicado na release `20261113-091126`, asset `index-DRfYKFNN.js`. Build/TypeScript e 220 testes backend aprovados localmente e no servidor; backup executado antes da migration `20261113000001_evaluation_booking`. Dependências preservadas em `20261109-153438/backend/node_modules`, manifests idênticos; versão anterior `20261112-180930` disponível para rollback.

API/MySQL descartável e interfaces com APIs sintéticas aprovados. CPF/nascimento, integridade dos cadastros, horários/convênios, proteção de dados de terceiros, falhas, repetição de confirmação bloqueada e ausência de gravações clínicas verificados. Telas públicas testadas em 360, 390 e 1280 px; configuração administrativa e padrão compartilhado aprovados. Contrato de leitura conferido com o HAR fornecido, sem consultas/gravações de pacientes reais nos testes.

Produção: site e saúde API HTTP 200; configuração pública 200/no-store, configuração privada sem autenticação 401, CPF inválido 422, confirmação sem contexto 410. Fluxo visual da versão publicada validado com APIs sintéticas. Configuração continua desabilitada/sem agendas, confirmação indisponível; não houve ativação automática da conexão institucional.

Logs: `.deployment/evaluation-booking-publish.log`, `evaluation-booking-backend-tests.log`, `evaluation-booking-api-tests.log`, `evaluation-booking-ui-tests.log`, `evaluation-booking-screen-pattern.log`, `evaluation-booking-production.log` e `evaluation-booking-public-ui.log`. Contratos de escrita, idempotência durável e conflitos reais com a recepção permanecem pendentes conforme o plano.
