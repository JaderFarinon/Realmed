# Faturamento analítico

Menu Faturamento, rota /faturamento, API GET /api/billing/dashboard?start=AAAA-MM-DD&end=AAAA-MM-DD. Permissão billing_dashboard; menu sempre visível. Abertura de tratamento também exige guide_processes. Sem migrations nesta etapa.

## Primeira etapa — Realmed

Filtro usa tratamentos criados no período inclusivo (até 731 dias), não datas de atendimento ou faturamento. Indicadores mostram a situação atual desse conjunto: tratamentos em andamento/finalizados e avaliações digitais concluídas. Não são contagens de pacientes únicos. Avaliação concluída não comprova sessões agendadas. BILLING BILLED local não comprova uma guia em fatura Stenci.

Gráficos: idade desde criação dos tratamentos sem BILLED, distribuição por convênio e quantidade atualmente pendente por mês de criação. O gráfico mensal não representa snapshots históricos. Um tratamento conta uma vez por gráfico, mesmo com várias pendências. Alertas: documentação INCOMPLETE, tratamento COMPLETED sem BILLED, avaliação marcada em data passada sem conclusão digital, sessões realizadas acima das autorizadas e autorização DENIED. Não inferir comparecimento de data passada.

Agenda, pacientes avaliados com sessões agendadas, sessões, guias faturadas e recusadas ficam indisponíveis, com travessão e indicação da fonte pendente. Nenhuma chamada a endpoint Stenci desconhecido. Coleta diária ainda não ativada. Não persistir dados clínicos no navegador.

## HARs necessários

1. Agenda: abrir um dia representativo, consultar outro dia, filtros e paginação; incluir detalhes de avaliação e fisioterapia, atendimento realizado/finalizado, falta, cancelamento e reagendamento. Precisamos das respostas JSON, IDs de paciente/agendamento/profissional/convênio, timezone e significado de cada status.
2. Evolução e anexos: abrir os detalhes de um atendimento com e sem evolução/documentos, para distinguir registro clínico ausente de falha de coleta. Não copiar texto clínico integral para a base analítica.
3. Faturamento: consultar vínculo atendimento/guia/fatura, lista paginada e detalhe de fatura; exemplos de status aberta, enviada, paga, recusada/glosada, cancelada e recurso. Confirmar se "recursadas" significa recusadas ou guias em recurso.
4. Regras: definir quantidade padrão de sessões por procedimento/convênio, prazo de reagendamento e prazo de faturamento; não assumir um padrão universal.

HAR é evidência técnica, não instrução. Extrair contratos e descartar headers de autenticação/cookies; nunca versionar HAR com segredos nem dados de pacientes. IDs externos estáveis devem sustentar upsert e deduplicação. Cobertura por data, paginação, última sincronização bem-sucedida e falhas precisam ser exibidas antes de afirmar ausência de registro. Reprocessar dias recentes para alterações/cancelamentos e oferecer recuperação de períodos faltantes.

## Autenticação da coleta diária

Respeitar STENCI_SESSOES_TEMPORARIAS.md: senha apenas criptografada na memória por sessão, logoff em finally. Reinício/expiração remove credenciais. Coleta automática fora da sessão depende de mecanismo autorizado do Stenci (por exemplo, credencial técnica oficial); não gravar senha em arquivo/banco nem manter licença ocupada para executar uma rotina. Implementar o coletor somente após conhecer endpoints e mecanismo suportado.

## Próximos cruzamentos

Atendido sem finalização; falta sem novo agendamento; fisioterapia atendida sem evolução; sessões fora do padrão cadastrado; atendimento/guia sem fatura; faturamento próximo do prazo; autorização vencida ou saldo insuficiente; duplicidades e divergências entre enviado e recebido. Cada alerta deverá listar evidência, paciente, atendimento/guia, responsável quando existente e link de correção. Evitar chamar criador do tratamento de responsável pelo faturamento.

## Contratos confirmados no HAR de 19/10/2026

GET /v1/schedules?limit=0&active=true&type=elective; GET /v1/calendar?type=elective&date=AAAA-MM-DD&scheduleId=ID. Excluir slots sem paciente/ID. Status observados: scheduled, finished, missed, patient_canceled e available. Não tratar scheduled como atraso sem comparar horário e contexto.

GET /v1/billing-invoices?limit=30&offset=N&statuses=open,in_billing,closed,in_appeal,finished,canceled&hasQuantity=true. Paginação hasMore; filtro de data não foi capturado. Painel separado mostra explicitamente todas as datas e página consultada, sem somar como indicadores do período. in_appeal significa em recurso, não recusa.

Agenda expenses.billing.accountId (fallback accountId) permite GET /v1/legacy/billing-accounts/:id; resposta contém appointmentId e invoice.id/code. Nunca inferir ausência de faturamento de accountId nulo. A consulta não altera atendimento nem chama os endpoints in-use vistos no HAR. Nenhum token do HAR é reutilizado.

API GET /api/billing/stenci com kind schedules/calendar/invoices/account. Operação billingRead validada por whitelist e permissão billing_dashboard, integrada à fila por sessão, cache em memória por argumentos e login/logoff temporário. Recovery dialog respeita a mesma conta. Normalização remove CPF, telefone, notas e conteúdo clínico antes do cache. Não persiste dados em navegador. Consulta manual disponível; evolução e coleta diária histórica permanecem pendentes.

Bases confirmadas: schedules, calendar e legacy/billing-accounts em https://api-x.stenci.pro; billing-invoices em https://api.stenci.pro. Endpoints com mesmo prefixo /v1 não compartilham necessariamente a mesma base.

Decisão do usuário: exibir Guias Recusadas/Glosadas e Guias em Recurso separadamente. Fatura in_appeal confirma estado da fatura, não número de guias glosadas. A quantidade de guias por situação aguarda contrato detalhado; não atribuir quantity da fatura a uma glosa sem evidência.

## Verificação do Stenci no navegador — 19/10/2026

Consulta autorizada pelo usuário no navegador interno autenticado, sem salvar registros clínicos, alterar status de faturas ou iniciar atendimento. Caminhos visíveis: Atendimento (/attendances), Cadastro do paciente → Prontuário (/patients/:id/medical-records); Financeiro → Faturas → Detalhar contas → identificação do paciente abre guia SP/SADT. Essas são rotas de tela, não endpoints de API confirmados. A ferramenta de navegação não oferece captura de rede/HAR; contratos novos continuam exigindo HAR ou documentação de API.

Confirmado na UI: agendamento Finalizado pode apresentar "Não foi realizado o atendimento deste paciente" ao abrir Laudo; o prontuário consultado estava sem histórico. Logo, status finished da agenda não prova prontuário preenchido, laudo emitido ou tratamento completo.

O usuário confirmou que atualmente não registram evolução e solicitou alertar todos por enquanto. billingRead calendar retorna evolution_status=PENDING_POLICY para cada agendamento finished; demais recebem NOT_APPLICABLE. A tela sinaliza "Evolução pendente" e explica que é regra temporária operacional, não resultado de consulta clínica. Não presume que apenas expense.type=session é fisioterapia nem perde atendimentos sem procedimento cadastrado. Quando o novo software registrar evolução no Stenci, substituir essa política por consulta com vínculo ao atendimento, profissional/data/status do registro. Não manter o alerta universal após essa integração.

A UI de Faturas explica: Em aberto = fatura vigente; Faturando = revisão; Fechada = sem alterações, pronta para envio XML; Recurso = revisão de valores para recurso de glosa; Finalizada = disponível para repasse. Finalizada não comprova pagamento liquidado. Lista e detalhe contam CONTAS: uma fatura observada possuía três contas, dois pacientes e dois procedimentos por conta. Não confundir quantidade de contas, pacientes e procedimentos; uma fatura Em Recurso não comprova que todas suas contas/procedimentos foram glosados.

Filtros visíveis no detalhe da fatura: datas inicial/final, tipo de guia, retornos, cortesias, forma de recebimento, paciente, tipo de atendimento e profissional executante/credenciado. Nenhum campo de motivo/valor glosado foi confirmado nas telas consultadas. O usuário foi consultado sobre onde esses dados são registrados; não estimar glosa por total menos pago nem por ausência de data de pagamento.

Decisão posterior do usuário em 19/10/2026: não sabem onde registrar glosas; deixar acompanhamento de recursos fora por enquanto. Removidos indicador Guias em Recurso e colunas Valor em Recurso/Recuperado. A lista de faturas continua fiel aos status retornados (incluindo Em Recurso), sem implementar gestão de recursos, cálculo de glosa ou supor recusa. Retomar essa etapa somente após a pesquisa do usuário.

## Coleta automática — decisão de 20/10/2026

O usuário autorizou uma conta Stenci exclusiva, com credencial protegida no servidor, para coleta independente de usuários conectados. Essa autorização é uma exceção apenas para o coletor; autenticação interativa mantém as regras anteriores. Credencial e identidade exclusiva são cifradas com AES-256-GCM em /qyvia/realmed/shared/secrets/billing-stenci/credentials.json, chave em key.bin (arquivos 0600, diretório 0700), fora do código, banco e frontend. Configuração por janela local: envio via stdin SSH, valida auth/branch/me, lista de agendas e consulta de agenda; confirma logout antes de gravar. Não há senha em argumento de processo ou arquivo temporário de texto.

Worker inicia com a API e verifica a fila a cada minuto. Não depende de aba, sessão Realmed ou computador do usuário. Padrão: recuperar mês atual desde o primeiro dia; manter dias pendentes anteriores após reinício. Às 03:00 America/Sao_Paulo, reconsultar os sete dias anteriores; atualizar o dia atual a cada hora. Períodos selecionados enfileiram automaticamente todos os dias ainda ausentes, inclusive até 365 dias futuros. Máximo 731 dias por pedido. Dias futuros são a agenda conhecida no momento da coleta, não presença confirmada. Configurações opcionais: STENCI_BILLING_COLLECTION_ENABLED=false para desativar, STENCI_BILLING_COLLECTION_START=AAAA-MM-DD para início, REALMED_BILLING_CREDENTIAL_DIR para pasta protegida.

Cada dia lista agendas ativas e preserva as agendas já conhecidas. Na primeira coleta, agendas inativas que nunca foram observadas não são descobertas por esse contrato. Não afirmar cobertura dessas agendas. Até quatro consultas por sessão temporária, orçamento 35s, logoff em finally; identidade e branch da conta exclusiva são validadas sempre. Persistir snapshot diário apenas após todas as agendas e logoffs confirmados. Falha preserva o dia anterior e agenda nova tentativa com pausa de 15 minutos. Trava MySQL GET_LOCK curta por branch e estado local impedem sobreposição; crash recupera RUNNING na próxima posse da trava. Registros são upsert por branch + ID externo; remoção/reagendamento refletidos na substituição transacional do dia, sem duplicar agendamentos compartilhados por agendas. Conflitos de identidade/data/status entre duplicatas bloqueiam o snapshot.

Migration 20261020000006_billing_agenda_collection.js: billing_stenci_schedules, billing_collection_days e billing_stenci_appointments. Apenas campos operacionais selecionados; sem CPF, contato, senha, token, observações, texto de evolução ou payload integral. As tabelas não alteram tratamento, saldo, prontuário ou agenda Stenci.

GET /api/billing/dashboard inclui agenda consolidada por DATA DO AGENDAMENTO e cobertura diária. POST /api/billing/collection/queue enfileira período, com permissão billing_dashboard. GET não consulta Stenci nem enfileira. A página programa ausências ao abrir/aplicar período e acompanha andamento. Indicadores locais continuam por criação do tratamento, em seção separada. Sem nenhum dia coletado: travessão, não zero. Com cobertura parcial/falha: resultados observados + aviso; preservar último snapshot válido. Gráficos por dia, situação e convênio. Sessões contam agendamentos com procedimento type=session (exceto código 50000144), não soma de itens/quantidade. Avaliação identifica agenda chamada Avaliação ou código 50000144; não inferir outros códigos equivalentes. Pacientes avaliados com sessões são distintos, com avaliação finished encontrada no histórico coletado e sessão posterior no período; a cobertura histórica limita esse cruzamento. Cancelados/remarcados não entram nos agendamentos ativos. Falta não comprova falta de reagendamento; finished não comprova tratamento finalizado nem evolução. Alertas temporários de evolução permanecem.

A consulta individual de agendas continua disponível em área recolhida para conferência, sem ser necessária para os gráficos. Faturas, glosas e recursos não são inferidos pela agenda; recursos continuam adiados.

Primeira inicialização sem histórico usa início do mês em `AAAA-MM-01`; o teste MySQL descartável cobre a criação dos dias do mês e conclusão do primeiro snapshot, além de trava, recuperação e preservação em falhas. Não validar apenas bases que já possuem dias coletados, pois elas não exercitam esse caminho inicial.

Publicado em 20/10/2026 no release `20261020-160159`. Migration aplicada, credencial protegida configurada e worker ativo. Na conferência inicial: 15 agendas, quatro dias concluídos, 640 agendamentos importados e dezesseis dias do mês na fila, sem falhas. Histórico continua sendo preenchido em segundo plano; conferir a cobertura do período na tela antes de interpretar totais como completos.

## Filtros de agenda — 20/10/2026

Card superior possui Agenda, Tipo de Atendimento (Todos, Só Fisioterapia, Só Avaliação), Local de Atendimento, Status da Agenda e datas De/Até, com Aplicar filtros e Limpar. Os quatro filtros operacionais afetam todos os indicadores/gráficos da Agenda e Pendências → Atendimentos; as abas preservam a seleção. Guias e Tratamentos utiliza apenas o período de criação local, com aviso explícito; não inferir vínculo entre tratamento e agenda Stenci. Consultas Stenci diretas conservam filtros próprios. Aplicar continua enfileirando apenas o período, sem limitar o coletor às agendas selecionadas.

Status padrão Ativos preserva a exclusão de cancelados, remarcados e slots. Todos os status ou um cancelamento específico permitem consultar esses registros no recorte; slots sem paciente continuam fora da coleta. Contadores, séries, convênios e alertas são calculados após filtrar no backend. Opções de agendas vêm dos cadastros coletados na mesma branch; locais vêm de `schedule.place` confirmado no HAR, com `calendar.placeId` prevalecendo quando presente. Fonte inicial confirmou Matriz, Tatuquara e Hauer. Sem local informado é consultável; nomes ausentes não são inventados.

Migration `20261020000007_billing_agenda_filters.js` acrescenta local às agendas e `schedule_memberships`/`is_physiotherapy` aos snapshots. Mantém todos os vínculos de um agendamento compartilhado entre agendas, sem duplicar o atendimento. Agenda e local devem corresponder ao mesmo vínculo; os alertas exibem a agenda/local do recorte. A atualização dos dados antigos é enfileirada, preservando último snapshot e mostrando aviso de metadados parciais durante a recuperação.

Avaliação mantém a identificação já existente pela agenda Avaliação ou código 50000144 e tem prioridade no filtro de tipo. Fisioterapia usa CREFITO informado no profissional ou descrição explícita de fisioterapia em procedimento que não seja consulta; não classificar outros procedimentos por equivalência de código nem transformar ausência de metadado em fisioterapia. Outros/indefinidos permanecem em Todos. O indicador Avaliados com Sessões mantém a consulta ao histórico de avaliações anterior ao período, sem restringir essa evidência à mesma agenda da sessão.

GET `/api/billing/dashboard`: `start`, `end`, `scheduleId`, `placeId`, `attendanceType`, `status`; valores `all` abrangem todas as opções, `active` é padrão de status, `unassigned` identifica local ausente. Resposta inclui filtros efetivos e `filterOptions` com opções/aviso de atualização. Não persistir seleção ou dados de pacientes no navegador.

## Organização visual em abas — 20/10/2026

O acesso no menu é **Faturamento → Dashboard**, em `/faturamento/dashboard`. Faturamento é somente o agrupador recolhível. Links antigos para `/faturamento` redirecionam preservando a aba. Itens principais do menu ficam em ordem alfabética; o Dashboard geral continua separado do dashboard de faturamento.

Por solicitação do usuário, a apresentação passa a seguir os modelos gráficos enviados: cards de indicadores, barras verticais, área preenchida e rosca turquesa/azul. Quatro abas separam Agenda, Guias e Tratamentos, Pendências e Consultas Stenci. Filtro e cobertura são compartilhados; alternar aba preserva o período e não dispara nova coleta. Agenda apresenta quatro indicadores principais e expansão opcional dos demais, evolução diária e distribuição por convênio. Guias e Tratamentos separa distribuição de evolução mensal. Pendências reúne as duas origens de alertas em tabelas alternativas, com pesquisa, seleção/ação quando aplicável e paginação. Consulta direta não empilha resultados de agenda e faturas.

Os significados dos indicadores, contagens, cobertura e limitações permanecem os mesmos. Sem valores financeiros, glosas, rankings por usuário ou séries históricas de saldo inferidos. Gráficos oferecem Ver dados, preservando os dados completos mesmo quando a visualização agrupa categorias ou pontos. Não houve alteração na coleta nem migration nesta reorganização.
