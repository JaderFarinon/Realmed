# Atendimento pelo WhatsApp com IA

> Documento de regras e desenho funcional. Para os caminhos HTTP efetivamente entregues e os bloqueios atuais, prevalece `docs/APIS_CHATBOT_WHATSAPP.md`. As tabelas de “APIs propostas” abaixo registram o desenho inicial e não devem ser fornecidas ao integrador como contrato.

## Objetivo e limites iniciais — 17/11/2026

O Realmed fornecerá as regras e APIs de negócio para agendamento de avaliação, confirmação e lembrete de atendimentos, contato com pacientes com faltas recorrentes e campanhas segmentadas. Um chatbot de terceiro controla a conversa e usa diretamente a API oficial da Meta. O Stenci continua sendo a fonte dos pacientes, agendas, serviços, atendimentos e situações. O Realmed persiste somente o necessário para orquestração, consentimento operacional, idempotência e auditoria; a fila de atendimento humano pode permanecer no chatbot, que informa ao Realmed a escolha/encaminhamento quando necessário.

Nenhum envio ou comando Stenci deve ser simulado. A leitura de disponibilidade da avaliação pode reutilizar o contrato de `AGENDAMENTO_ONLINE_AVALIACAO.md`; a criação da avaliação e qualquer reagendamento permanecem bloqueados até receber e validar os contratos Stenci de escrita, consulta de resultado, reconciliação e conflito. A integração Realmed↔chatbot usa autenticação de serviço e idempotência das respostas. Para campanhas, o Realmed chama um webhook HMAC do terceiro no início programado; estados de envio/entrega/leitura da Meta permanecem no sistema de terceiro.

Todas as datas e cortes operacionais usam `America/Sao_Paulo` e relógio do servidor. Não confiar em horários enviados pelo navegador, pelo paciente ou pelo modelo de IA.

## Módulos do fluxo

### 1. Agendamento de avaliação pela conversa

1. O paciente pede uma avaliação.
2. A conversa realiza a mesma identificação conservadora do agendamento público: CPF exato e nascimento antes de revelar dados de cadastro. O número de WhatsApp, isoladamente, não identifica uma pessoa com segurança.
3. A API consulta somente as agendas de avaliação, serviço, convênio/plano e grade explicitamente configurados em Agendamento online.
4. A API devolve opções de data e horário estruturadas. A IA não inventa nem interpreta vaga ausente como disponível.
5. O paciente escolhe uma opção e recebe uma revisão antes da confirmação.
6. A confirmação reconsulta a disponibilidade e a antecedência no servidor. Somente depois do contrato Stenci validado, cria o agendamento com chave de idempotência durável e reconcilia qualquer resposta ambígua.
7. Se cadastro, plano, vaga ou resultado da gravação estiverem ambíguos, abrir atendimento humano sem afirmar que o agendamento foi realizado.

Enquanto a escrita estiver pendente, a conversa pode listar a grade, mas a seleção termina em transferência para o atendente. A resposta deve informar claramente que nenhuma reserva foi feita.

### 2. Confirmações de atendimentos

O processo diário trabalha com duas datas civis: hoje (`D0`) e amanhã (`D+1`). Isso corresponde aos dois dias listados na execução, e não a `D+2`.

- `D0`: recuperar atendimentos elegíveis ainda sem confirmação válida, normalmente remanescentes do envio anterior. Nunca reenviar uma confirmação já respondida somente porque o processo rodou novamente.
- `D+1`: recuperar todos os atendimentos elegíveis ainda não processados para a campanha de confirmação daquele agendamento.
- Abrangência: fisioterapia, avaliação e Pilates, classificados por identificadores explícitos de serviço/agenda configurados. Não inferir a modalidade apenas pelo nome apresentado.
- A mensagem oferece **Confirmar** e **Pedir reagendamento**.
- **Confirmar** registra a resposta vinculada ao ID externo e à versão observada do agendamento. Se data, hora, paciente, agenda ou status mudarem, a resposta antiga não confirma o novo estado.
- **Pedir reagendamento** não altera o Stenci. Abre atendimento humano com o contexto do agendamento e marca a conversa como aguardando atendente.
- Texto livre que indique dúvida, cancelamento, reagendamento ou baixa confiança da IA também vai ao atendente. A IA não toma decisão irreversível por interpretação isolada.
- Cancelamento ou remarcação observado depois do envio encerra a solicitação anterior; não continuar cobrando resposta.

O processo pode ser chamado mais de uma vez. A unicidade é por `appointment_external_id + appointment_revision + purpose`, e o envio usa uma caixa de saída transacional para impedir duplicidade entre execuções concorrentes.

### 3. Lembretes

Somente atendimentos com confirmação válida e ainda futuros recebem lembrete. O horário de disparo deve ser configurável por modalidade/unidade. Antes do envio, reconsultar o snapshot atual e descartar lembrete de atendimento cancelado, remarcado, concluído, faltado ou já iniciado.

Cada agendamento recebe no máximo um lembrete por versão e regra configurada. Falha de entrega pode ser repetida pela política do provedor usando o mesmo identificador lógico; não criar uma nova mensagem de negócio a cada tentativa técnica.

### 4. Pacientes com três faltas e retomada

O ponto de partida é `billingAbsenceReport`: paciente com falta na data de referência e pelo menos três faltas consecutivas incluindo a do dia. Comparecimentos e status pendentes/ignorados interrompem a sequência; cancelamentos e remarcações não contam. O contato só pode ser disparado com cobertura completa do período necessário e telefone explicitamente associado ao mesmo ID Stenci.

Ao paciente informar que pretende retomar:

1. Reconsultar o histórico e separar `faltas_concretizadas` de `agendamentos_futuros`.
2. Mostrar todas as faltas concretizadas que precisam de reposição e todos os agendamentos futuros existentes. Um futuro não é falta e não deve ser substituído silenciosamente.
3. Calcular quantas reposições são necessárias a partir das faltas atualmente válidas, sem inferir alta, saldo contratual ou série clínica.
4. Consultar vagas reais somente nas agendas explicitamente vinculadas ao tratamento/profissional e oferecer opções para cada falta. Feriados/bloqueios e conflitos observados são indisponíveis.
5. Apresentar revisão completa, sem alterar agendamentos futuros existentes.
6. Se o paciente aceitar, revalidar todas as vagas e o vínculo imediatamente antes da gravação. Criar cada reposição no Stenci somente com contrato real validado, chave idempotente e reconciliação.
7. Se uma das vagas mudou, não alegar sucesso parcial sem saber exatamente o resultado. Reconciliar e oferecer novamente apenas o que ainda falta; ambiguidade vai para o atendente.

Os contratos atuais do Realmed não permitem implementar com segurança a etapa 6. Até o HAR de escrita e reabertura, a conversa prepara a proposta e transfere para o atendente efetivar.

### 5. Feriados

Adicionar em **Atendimento WhatsApp → Feriados** uma gestão com permissão independente. Cada registro possui nome, data inicial/final, unidade, abrangência opcional por agenda/modalidade, situação ativa e observação interna. Criar, editar, inativar ou excluir logicamente exige auditoria e revisão para evitar sobrescrita concorrente.

O feriado local não cancela nem altera o Stenci. Ele:

- impede que o Realmed sugira aquela data em fluxos automáticos;
- sinaliza para revisão humana um agendamento Stenci que ainda exista na data;
- pode ser usado como contexto/segmento de uma campanha;
- não transforma uma posição ausente em vaga nem substitui os bloqueios reais da agenda.

### 6. Bloqueio planejado da agenda do fisioterapeuta

Quando um fisioterapeuta precisar bloquear um dia ou período, o bloqueio é registrado primeiro no Realmed. O registro informa profissional, agendas explicitamente vinculadas, data/período, motivo interno, autor e revisão. Antes de ativar, a API consulta novamente o Stenci e forma uma lista imutável dos agendamentos/pacientes impactados naquela revisão. Horários livres ou ausentes não geram pacientes fictícios.

O bloqueio local coordena o contato, mas não afirma que a agenda foi bloqueada no Stenci. A escrita externa continua dependente do contrato real de bloqueio/remarcação e reconciliação. Enquanto esse contrato não existir, a tela identifica o bloqueio como planejamento Realmed e transfere a efetivação para o atendente.

Cada paciente impactado recebe contato individual e escolhe uma alternativa:

- **Manter o atendimento na data com outro fisioterapeuta:** consultar profissionais/agendas explicitamente configurados como substitutos, com vaga real compatível com o serviço, convênio, unidade e horário. Mostrar a opção ao paciente e revalidar a vaga antes de qualquer alteração. Não trocar profissional por inferência ou rodízio silencioso.
- **Manter o fisioterapeuta atual:** preservar os agendamentos futuros e sugerir uma sessão de reposição depois da última sessão atualmente agendada daquele tratamento. A data precisa vir de vaga real da agenda vinculada do mesmo profissional. Não inferir alta, saldo ou fim do tratamento apenas pelo último item coletado.
- **Pedir ajuda ou responder algo diferente:** encaminhar ao atendente com todo o contexto, sem alterar o Stenci.

A escolha e a execução são independentes por paciente. O bloqueio não fica concluído apenas porque alguns responderam. A tela mostra, por impactado: aguardando envio, aguardando resposta, quer substituto, quer manter profissional, aguardando vaga, aguardando atendente, alteração confirmada no Stenci, falha ou sem contato. Cancelar/editar o bloqueio cria nova revisão, encerra mensagens obsoletas e reconsulta os pacientes; não apaga respostas nem auditoria anteriores.

Para qualquer alternativa, a operação externa deve tratar o agendamento original e a reposição com identificadores/versionamento explícitos. Uma resposta do paciente não equivale a alteração concluída. Somente informar sucesso depois de reconciliar o estado final no Stenci. Se houver conflito, manter o original conhecido, não criar duplicação e encaminhar ou oferecer nova opção.

### 7. Campanhas segmentadas

Adicionar em **Atendimento WhatsApp → Campanhas** uma tela com rascunho, prévia de público, revisão e envio. Filtros inicialmente suportados:

- situação: pacientes ativos e pacientes com faltas;
- sexo explícito: feminino e masculino;
- faixa etária na data de referência;
- tipo de serviço;
- unidade/agenda, quando explicitamente selecionadas;
- período de atendimento usado para formar a base;
- feriado relacionado, apenas como contexto da campanha.

`Paciente ativo` precisa de um critério configurado e visível na prévia. Preferência: campo ativo do cadastro Stenci, quando o contrato o fornecer. Na ausência desse campo, não inferir atividade sem uma regra aprovada (por exemplo, atendimento em um período definido). `Paciente faltante` deve indicar se significa qualquer falta no período ou a regra conservadora de três consecutivas; a campanha grava a regra escolhida.

Sexo, nascimento, telefone, serviço e identidade precisam vir de campos explícitos. Dados ausentes excluem o paciente do filtro correspondente e aparecem na cobertura da prévia; não adivinhar sexo por nome nem idade por texto. Deduplicar por ID Stenci e telefone normalizado, impedindo que a mesma pessoa receba duas vezes a mesma campanha.

A prévia retorna total elegível, total sem telefone, total sem dados para os filtros, duplicados removidos e amostra sem expor dados além da permissão do operador. O público é congelado em uma versão imutável quando o administrador confirma o envio. Alterar texto ou filtros cria nova revisão e exige nova prévia.

O texto digitado pelo administrador não pode ser ampliado ou reinterpretado pela IA no envio em massa. O provedor pode exigir template previamente aprovado. Incluir opção de exclusão/descadastro e uma lista de supressão; campanha nunca envia a contato suprimido. Envio real exige confirmação em modal, permissão de envio, caixa de saída e auditoria.

## APIs propostas

Todas as APIs administrativas usam autenticação, revalidação da permissão atual no banco, `Cache-Control: no-store` para dados de conversa/paciente e respostas paginadas. Webhooks são públicos somente no transporte, com assinatura obrigatória do provedor, proteção contra replay e idempotência por ID externo.

### Integração com o chatbot de terceiro

| Método e caminho | Finalidade |
|---|---|
| `GET /api/integrations/whatsapp/v1/health` | Validar credencial de serviço, versão e relógio do Realmed. |
| `GET /api/integrations/whatsapp/v1/capabilities` | Informar ao terceiro quais leituras/escritas estão habilitadas. |
| `GET /api/integrations/whatsapp/v1/outbox` | Buscar tarefas de mensagem com cursor, template e variáveis mínimas. |
| `POST /api/integrations/whatsapp/v1/outbox/:itemId/accepted` | Confirmar que o chatbot assumiu a tarefa. |
| `POST /api/integrations/whatsapp/v1/outbox/:itemId/status` | Informar IDs/estados normalizados da mensagem Meta. |
| `POST /api/integrations/whatsapp/v1/inbound-events` | Registrar evento normalizado quando necessário ao fluxo/auditoria. |
| `GET /api/integrations/whatsapp/v1/operations/:operationId` | Consultar operação assíncrona/reconciliada sem repeti-la. |

### Avaliação pela conversa

| Método e caminho | Finalidade |
|---|---|
| `POST /api/whatsapp/conversations/:id/evaluation/identify` | Vincular CPF ao contexto efêmero, sem revelar cadastro. |
| `POST /api/whatsapp/conversations/:id/evaluation/birth-date` | Conferir nascimento e liberar dados mínimos. |
| `POST /api/whatsapp/conversations/:id/evaluation/availability` | Listar grade de avaliação pela configuração existente. |
| `POST /api/whatsapp/conversations/:id/evaluation/confirm` | Futuro comando Stenci; enquanto pendente, retorna `503 BOOKING_WRITE_CONTRACT_PENDING` e encaminha ao atendente quando solicitado. |

### Confirmações e lembretes

| Método e caminho | Finalidade |
|---|---|
| `POST /api/whatsapp/appointment-runs` | Criar execução para `D0` e `D+1`; idempotente pela data/revisão da regra. |
| `GET /api/whatsapp/appointment-runs/:id` | Totais por data/modalidade, pendências, falhas e cobertura. |
| `GET /api/whatsapp/appointments` | Consultar confirmação, lembrete, entrega e encaminhamento humano por agendamento. |
| `POST /api/whatsapp/appointments/:id/confirm` | Registrar resposta estruturada recebida; uso interno/webhook, com versão observada. |
| `POST /api/whatsapp/appointments/:id/request-reschedule` | Abrir atendimento humano, sem alterar Stenci. |
| `POST /api/whatsapp/reminder-runs` | Processar lembretes elegíveis conforme horário configurado. |

### Faltas e retomada

| Método e caminho | Finalidade |
|---|---|
| `POST /api/whatsapp/absence-runs` | Formar público usando a regra de faltas e cobertura atual. |
| `GET /api/whatsapp/absence-runs/:id` | Expor totais, excluídos por cobertura/telefone e estados de envio. |
| `POST /api/whatsapp/conversations/:id/resumption/preview` | Reconsultar faltas e futuros; preparar quantidade de reposições. |
| `POST /api/whatsapp/conversations/:id/resumption/availability` | Consultar vagas reais para as reposições. |
| `POST /api/whatsapp/conversations/:id/resumption/confirm` | Futuro comando Stenci idempotente; bloqueado até contratos de escrita/reconciliação. |

### Feriados e campanhas

| Método e caminho | Finalidade |
|---|---|
| `GET/POST /api/whatsapp/holidays` | Listar e criar feriados. |
| `GET/PUT/DELETE /api/whatsapp/holidays/:id` | Consultar, revisar e inativar/excluir logicamente. |
| `GET/POST /api/whatsapp/campaigns` | Listar e criar rascunhos de campanha. |
| `GET/PUT/DELETE /api/whatsapp/campaigns/:id` | Consultar, editar revisão e cancelar rascunho. |
| `POST /api/whatsapp/campaigns/:id/preview` | Calcular segmento e cobertura sem enviar. |
| `POST /api/whatsapp/campaigns/:id/approve` | Congelar texto, filtros e destinatários da revisão. |
| `POST /api/whatsapp/campaigns/:id/send` | Enfileirar envio da revisão aprovada, mediante confirmação administrativa. |
| `GET /api/whatsapp/campaigns/:id/deliveries` | Listar estados de entrega sem expor segredo do provedor. |

### Bloqueios de agenda do fisioterapeuta

| Método e caminho | Finalidade |
|---|---|
| `GET/POST /api/whatsapp/schedule-blocks` | Listar e preparar bloqueio local de profissional/data/período. |
| `GET/PUT/DELETE /api/whatsapp/schedule-blocks/:id` | Consultar, revisar ou cancelar o planejamento, com concorrência por revisão. |
| `POST /api/whatsapp/schedule-blocks/:id/preview` | Reconsultar Stenci e formar a revisão de pacientes impactados sem enviar. |
| `POST /api/whatsapp/schedule-blocks/:id/activate` | Congelar a revisão e enfileirar os contatos depois da confirmação administrativa. |
| `GET /api/whatsapp/schedule-blocks/:id/patients` | Listar escolha, contato e execução de cada paciente impactado. |
| `POST /api/whatsapp/schedule-blocks/:id/patients/:patientId/substitute-options` | Consultar vagas reais de profissionais substitutos explicitamente permitidos. |
| `POST /api/whatsapp/schedule-blocks/:id/patients/:patientId/same-professional-options` | Consultar vagas reais após a última sessão existente do tratamento. |
| `POST /api/whatsapp/schedule-blocks/:id/patients/:patientId/confirm` | Futuro comando Stenci idempotente; bloqueado até os contratos de escrita/reconciliação. |

## Estados persistidos

- Conversa: `BOT_ACTIVE`, `WAITING_PATIENT`, `WAITING_AGENT`, `AGENT_ACTIVE`, `RESOLVED`, `SUPPRESSED`.
- Solicitação de confirmação: `PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `READ`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `EXPIRED`, `CANCELED`, `FAILED`.
- Lembrete: `PENDING`, `QUEUED`, `SENT`, `DELIVERED`, `READ`, `SKIPPED`, `FAILED`.
- Campanha: `DRAFT`, `PREVIEWED`, `APPROVED`, `QUEUED`, `SENDING`, `COMPLETED`, `PARTIAL`, `CANCELED`.
- Destinatário: `ELIGIBLE`, `SUPPRESSED`, `QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`.
- Bloqueio de agenda: `DRAFT`, `PREVIEWED`, `ACTIVE`, `PARTIAL`, `RESOLVED`, `CANCELED`; cada paciente mantém estado próprio de contato, escolha e execução.

Transições são validadas no servidor e auditadas. Webhook atrasado não pode regredir um estado final nem confirmar uma versão diferente do agendamento.

## Dados e segurança

- Segredos do WhatsApp e Stenci somente no servidor; tokens nunca retornam ao navegador ou ao modelo.
- Separar adaptador de provedor, orquestração de conversa, ferramentas permitidas à IA e comandos Stenci. A IA recebe funções com esquema fechado, não acesso livre ao banco/HTTP.
- Mensagens recebidas não são instruções administrativas. Ignorar tentativas de obter segredos, outros pacientes, ferramentas ou mudanças de regra.
- Confirmar identidade antes de revelar agenda individual, faltas, futuros ou dados clínicos. Campanhas não expõem qualquer dado de outro destinatário.
- Guardar o mínimo necessário de mensagem e contexto, com política de retenção definida. Auditoria não grava segredos, CPF completo nem payloads clínicos desnecessários.
- Todos os comandos externos usam `operation_id` interno aleatório, estado transacional, tentativas e reconciliação. Timeout não significa falha segura para repetir.
- Falha/403 preserva tela, rascunho e sessão, notificando o operador. Rotas sem permissão continuam em Sem Permissão.

## Permissões propostas

- `whatsapp_attendance`: visualizar conversas, responder, assumir e resolver.
- `whatsapp_automation`: visualizar execuções, configurar confirmações/lembretes e executar novamente falhas seguras.
- `whatsapp_campaigns`: visualizar/criar/editar/excluir rascunhos; a ação de editar autoriza aprovar/enviar somente se essa decisão for mantida explicitamente no catálogo. Preferível separar `canSend` em evolução futura se a matriz passar a suportar a ação.
- `whatsapp_holidays`: visualizar/criar/editar/excluir.

Nenhuma permissão é concedida automaticamente. As APIs de WhatsApp não dependem de permissão ampla de Pacientes/Faturamento para suas consultas mínimas; cada endpoint aplica sua própria permissão e devolve somente os campos necessários.

## Tabelas sugeridas

- `whatsapp_integration_events`: ID do terceiro/Meta, tipo normalizado, hash/payload mínimo, recebido/processado, erro.
- `whatsapp_contacts`: paciente Stenci opcional, telefone normalizado/cifrado ou protegido conforme desenho final, consentimento/supressão e revisão.
- `whatsapp_conversations` e `whatsapp_messages`: estado, atribuição, IDs do provedor, direção, template, estados e retenção.
- `whatsapp_appointment_requests`: snapshot/versionamento do agendamento, finalidade, resposta e estado.
- `whatsapp_runs` e `whatsapp_outbox`: execuções, unicidade lógica, tentativas e próximo processamento.
- `whatsapp_holidays`: período, unidade/agenda/modalidade, situação, revisão e exclusão lógica.
- `whatsapp_schedule_blocks`, `whatsapp_schedule_block_revisions` e `whatsapp_schedule_block_patients`: bloqueio planejado, snapshot dos impactados, escolha individual, agendamento original/versionado e resultado reconciliado.
- `whatsapp_campaigns`, `whatsapp_campaign_revisions` e `whatsapp_campaign_recipients`: rascunho, filtros/texto imutáveis aprovados, base congelada e entrega.
- `whatsapp_audit`: autor/tipo, objeto, revisão e metadados sem segredos/conteúdo sensível desnecessário.

Definir chaves estrangeiras e unicidades somente depois de conferir os identificadores reais devolvidos pelo provedor e pelo Stenci. Não usar telefone ou nome como identidade primária de paciente.

## Entrega em fases

1. **Contratos e fundação:** definir autenticação e payloads com o chatbot que usa a Meta; capturar Stenci de criação/reabertura/reagendamento/conflito; definir retenção, horários e critério de paciente ativo.
2. **Leitura e gestão sem envio:** migrations, permissões, Feriados, rascunho/prévia de Campanhas, listagem de elegíveis para confirmação e faltas. Nenhuma mensagem real.
3. **Transporte com o chatbot:** autenticação de serviço, caixa de saída, callbacks de estados Meta, supressão, encaminhamento humano no terceiro e testes com números de sandbox.
4. **Confirmações e lembretes:** `D0/D+1`, respostas estruturadas, reagendamento encaminhado e lembretes dos confirmados.
5. **Bloqueios de agenda:** planejamento, prévia dos impactados, escolha individual e fila humana; alteração real somente após validar escrita/reconciliação Stenci.
6. **Agendamento de avaliação:** grade pela conversa e, somente após validar os HARs, confirmação real.
7. **Faltas e retomada:** contato dos três faltantes, proposta de reposição e, somente após validar gravação/reconciliação, criação real no Stenci.
8. **Campanhas reais:** aprovação de template, segmento congelado, envio controlado e relatório de entrega.

## Contratos e decisões ainda necessários

1. Contrato do chatbot de terceiro: autenticação suportada, polling ou webhook de tarefas, formatos de template/botões, callbacks dos estados Meta e ambiente/número de sandbox.
2. HARs Stenci de criação de avaliação, criação de reposição/reagendamento, consulta individual completa depois da gravação e conflito de vaga.
3. Mapeamento explícito das agendas/serviços de fisioterapia, avaliação e Pilates em cada unidade.
4. Contratos Stenci para bloquear período, trocar profissional/agenda e criar sessão ao final do tratamento, incluindo consulta individual posterior e conflitos.
5. Regras de profissionais substitutos: mesma unidade, serviço, convênio, horário e quais agendas podem substituir cada fisioterapeuta.
6. Horários de envio das confirmações e lembretes e janela em que o atendente deve receber um pedido de reagendamento.
7. Definição operacional de paciente ativo, período padrão dos filtros e se faltante em campanha significa qualquer falta ou três faltas consecutivas.
8. Política de consentimento/descadastro, retenção das conversas e responsáveis autorizados a aprovar campanhas/bloqueios.

## Primeira entrega e HARs avaliados — 17/11/2026

Implementados cadastro versionado de eventos/feriados/campanhas, lote do relatório de três faltas, resposta tokenizada do paciente, fila administrativa de cobrança para quem decidiu parar e pesquisa final para ciclos explicitamente concluídos com `bundle.current = bundle.total >= 10`. A tela **Atendimento WhatsApp** reúne Eventos e campanhas, Retorno das faltas e Pesquisas finais. Permissão independente `whatsapp_automation`, sem concessão automática.

Os HARs recebidos comprovaram os formatos de sucesso de cadastro de paciente, criação de agendamento, mudança de data/horário e alteração isolada para `confirmed`, `unsuccessful`, `patient_canceled` e `professional_canceled`. Preservar cancelados no histórico é compatível com a coleta atual, que ignora cancelados no cálculo de faltas sem apagá-los. O próprio Stenci já libera o horário cancelado, portanto não há fluxo especial de encaixe. Ainda faltam conflito e reconciliação após timeout; até essa evidência, nenhuma dessas escritas Stenci é habilitada no Realmed.

## Verificação mínima futura

- Testes unitários de datas `D0/D+1`, estados, deduplicação, filtros, idade, dados ausentes, faltas e feriados.
- MySQL descartável para migrations, permissões reais, revisão/auditoria, concorrência, outbox, webhook repetido, replay e rollback.
- Adaptadores sintéticos do provedor/Stenci para falha, timeout, resposta ambígua, reconciliação e conflito sem contatar pacientes reais.
- Interface em desktop/tablet/celular com DataList/ListDetailDialog, paginação, rascunho preservado, confirmação de envio e 403 sem perda de tela.
- Teste ponta a ponta de sandbox com destinatários de teste explicitamente permitidos. Nunca usar pacientes reais em testes de envio.
