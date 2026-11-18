# APIs para integração do chatbot WhatsApp

## Estado em 17/11/2026

O chatbot de terceiro usa a API oficial da Meta. O Realmed fornece regras de negócio, públicos, agenda e grava as respostas. O terceiro recebe apenas um token próprio; nunca recebe credenciais Realmed ou Stenci.

Base da integração: `/api/integrations/whatsapp/v1`  
Autenticação: `Authorization: Bearer <WHATSAPP_CHATBOT_API_TOKEN>`  
Todas as respostas usam `Cache-Control: no-store`.

A unidade é obrigatoriamente a instalação configurada em `STENCI_BRANCH_ID`. A API recusa operação sem esse valor e repete `branch_id` em todas as consultas locais de lotes, casos, campanhas, pesquisas e operações; IDs ou tokens de outra unidade retornam `404`.

Na retomada, o `caseToken` não autoriza um agendamento arbitrário: cada `sourceAppointmentId`, data e agenda precisam constar no snapshot de faltas daquele caso, a mesma falta não pode ser reutilizada e o conector confirma novamente no calendário Stenci que `source.patient.id` corresponde ao paciente do caso antes de copiar qualquer dado.

Estados deste documento:

- **ENTREGUE**: endpoint implementado e coberto por teste.
- **BLOQUEADO STENCI**: o formato de sucesso apareceu no HAR, mas falta evidência de conflito/reconciliação para habilitar gravação.
- **FALTA CONTRATO**: não há HAR suficiente para implementar sem inventar operação remota.

## 1. Infraestrutura comum

| Endpoint | Uso | Estado |
|---|---|---|
| `GET /health` | Credencial, versão, relógio e fuso. | **ENTREGUE** |
| `GET /capabilities` | Informa dinamicamente quais leituras e escritas estão habilitadas. | **ENTREGUE** |

As respostas do paciente são idempotentes por `externalEventId`. Campanhas não usam polling: o Realmed agenda e chama o webhook do terceiro no início configurado.

Configuração do webhook:

- `WHATSAPP_CHATBOT_WEBHOOK_URL`: URL HTTPS do terceiro.
- `WHATSAPP_CHATBOT_WEBHOOK_SECRET`: segredo HMAC.
- header enviado: `X-Realmed-Signature: sha256=<hex>`.
- evento: `campaign.ready`, sem lista de pacientes no corpo.
- em falha, o Realmed tenta novamente em 5, 10, 20, 40 e 60 minutos, sem ultrapassar o prazo final da campanha.
- o terceiro busca a revisão congelada dos destinatários no endpoint autenticado de recipients.

Estados `SENT`, `DELIVERED`, `READ` e `FAILED` da Meta continuam sob responsabilidade do sistema de chatbot; o Realmed não duplica a outbox da Meta.

## 2. Agendamentos para confirmação e lembrete

| Endpoint | Uso | Estado |
|---|---|---|
| `GET /appointments/scheduled?from=AAAA-MM-DD&days=2` | Lista agendamentos com status `scheduled`; por padrão hoje e amanhã. | **ENTREGUE** |
| `GET /appointments/confirmed?from=AAAA-MM-DD&days=2` | Lista agendamentos `confirmed` para lembrete; por padrão hoje e amanhã. | **ENTREGUE** |

O retorno inclui a cobertura diária da coleta. Se a cobertura não estiver completa, o consumidor não deve tratar a lista como completa. Cancelados permanecem no histórico Stenci e não entram nessas duas listas. O Stenci já libera o horário cancelado; não existe regra especial de encaixe.

As escritas usam `Idempotency-Key`, trava local do horário, reconsulta imediata e reconciliação pelo `GET /v1/calendar`:

| Endpoint | Uso | Estado |
|---|---|---|
| `POST /appointments/:appointmentId/status` | Grava `scheduled`, `confirmed`, `patient_canceled` ou `professional_canceled`. Exige `date` e `scheduleId`. | **ENTREGUE** |
| `POST /appointments/:appointmentId/reschedule` | Remarca na mesma agenda por `PUT`; entre agendas cria o novo, reconcilia e cancela o original preservando o histórico. | **ENTREGUE** |
| `GET /operations/:operationKey` | Consulta o resultado durável sem repetir uma escrita ambígua. | **ENTREGUE** |

## 3. Faltas e retomada

| Endpoint | Uso | Estado |
|---|---|---|
| `POST /absence-batches` | Cria/reobtém o lote diário. Aceita `date`, `historyStart` e `minimumMisses` (padrão 3). | **ENTREGUE** |
| `GET /absence-batches/:batchId` | Totais, cobertura e excluídos sem telefone. | **ENTREGUE** |
| `GET /absence-batches/:batchId/items` | Casos tokenizados para contato. | **ENTREGUE** |
| `POST /absence-cases/:caseToken/response` | Grava `CONTINUE_TREATMENT`, `STOP_TREATMENT`, `NO_RESPONSE`, `HUMAN_ASSISTANCE` ou `OTHER`. | **ENTREGUE** |
| `GET /absence-cases/:caseToken/resumption` | Retorna faltas concretizadas, agendamentos futuros e dias/horários habituais. | **ENTREGUE** |
| `POST /absence-cases/:caseToken/availability` | Recebe `keepUsualDays: true` ou `weekdays`, `preferredTime` e `horizonDays`; consulta vagas reais e separa horário exato de sugestões. | **ENTREGUE** |
| `POST /absence-cases/:caseToken/book` | Grava exatamente as reposições confirmadas pelo paciente, copiando o agendamento faltado e preservando falta/futuros. | **ENTREGUE** |

A disponibilidade reconsulta o paciente, plano e agendas envolvidas no Stenci. Ela não remove nem substitui implicitamente agendamentos futuros. A IA deve apresentar as alternativas e somente chamar a futura gravação depois da confirmação expressa do paciente.

## 4. Pesquisa após conclusão

Entra no lote apenas ciclo Stenci explicitamente `finished`, com `bundle.current = bundle.total` e `bundle.total >= 10`. Sessões soltas não são somadas para inferir conclusão.

| Endpoint | Uso | Estado |
|---|---|---|
| `POST /completion-batches` | Cria/reobtém lote dos pacientes que concluíram na data. | **ENTREGUE** |
| `GET /completion-batches/:batchId` | Totais e cobertura. | **ENTREGUE** |
| `GET /completion-batches/:batchId/items` | Casos tokenizados para pesquisa. | **ENTREGUE** |
| `POST /completion-cases/:caseToken/response` | Grava notas de estrutura, atendimento, profissionais e geral, recomendação e comentário. | **ENTREGUE** |

## 5. Eventos, feriados e campanhas

A tela administrativa **Atendimento WhatsApp** foi criada com permissão independente `whatsapp_automation`. Nenhuma permissão é concedida automaticamente. O feriado é um evento local e não bloqueia a agenda Stenci.

| Endpoint administrativo | Uso | Estado |
|---|---|---|
| `GET /api/whatsapp/events` | Lista feriados, campanhas e outros eventos. | **ENTREGUE** |
| `POST /api/whatsapp/events` | Cria evento/campanha. | **ENTREGUE** |
| `PUT /api/whatsapp/events/:id` | Altera por revisão concorrente. | **ENTREGUE** |
| `DELETE /api/whatsapp/events/:id` | Exclusão lógica auditada. | **ENTREGUE** |
| `POST /api/whatsapp/events/:id/preview` | Calcula até 100 exemplos e totais do público, sem enviar. | **ENTREGUE** |
| `POST /api/whatsapp/events/:id/approve` | Congela texto, revisão e destinatários e programa o webhook. | **ENTREGUE** |
| `POST /api/whatsapp/events/:id/notify` | Tentativa administrativa manual quando a campanha já venceu o horário inicial. | **ENTREGUE** |
| `GET /campaigns/:id/recipients?revision=N` | Entrega ao chatbot o público congelado da revisão aprovada. | **ENTREGUE** |

Filtros disponíveis no cadastro: situação do paciente, sexo explícito, idade mínima/máxima e tipos de serviço explícitos. A base é isolada pela unidade Stenci configurada. Dados ausentes não são inferidos. A campanha exige início e prazo final de envio; editar uma campanha invalida a aprovação anterior.

## 6. Relatórios administrativos

| Endpoint | Uso | Estado |
|---|---|---|
| `GET /api/whatsapp/absence-responses` | Lista respostas, inclusive quem informou que vai parar. | **ENTREGUE** |
| `PATCH /api/whatsapp/absence-responses/:id/billing` | Controla cobrança `PENDING`, `CONTACTED`, `RESOLVED` ou `NOT_APPLICABLE`, com revisão e auditoria. | **ENTREGUE** |
| `GET /api/whatsapp/completion-responses` | Lista pesquisas finais e avaliações. | **ENTREGUE** |

## 7. Avaliação pelo WhatsApp

O fluxo público `/api/public/evaluation-booking/*` já identifica o paciente, valida nascimento/dados, retorna catálogos e disponibilidade real. O `POST /confirm` permanece bloqueado e não cria agendamento.

O HAR recebido mostrou:

- criação de agendamento por `POST /v1/appointments`;
- remarcação por `PUT /v1/appointments/:id`;
- cadastro por `POST /v1/patients`;
- pré-validação por `GET /v1/appointments/info`;
- trava de edição por `POST/DELETE /v1/appointments/:key/in-use`.

A captura de paciente novo termina após o cadastro e não mostra o agendamento desse paciente. O agendamento capturado inclui valores financeiros do serviço no corpo, mas os catálogos recebidos não fornecem esses valores para cada plano. Por isso a avaliação pública continua **BLOQUEADO STENCI** e `/capabilities` retorna `evaluationBooking: false`; o Realmed não enviará valor zero nem copiará o preço de outro convênio.

## 8. Bloqueio de agenda e troca de fisioterapeuta

O HAR confirmou que um bloqueio é criado por `POST /v1/appointments?toCalendar=true`, com agenda, início/fim, profissional, observação e `status: blocked`. A tela **Atendimento WhatsApp → Bloqueios de agenda** permite selecionar os vínculos de fisioterapeuta já cadastrados, revalida a vaga e cria/reconcilia o bloqueio real.

| Endpoint | Uso | Estado |
|---|---|---|
| `POST /api/integrations/whatsapp/v1/schedule-blocks` | Cria bloqueio pelo chatbot/serviço, com `Idempotency-Key`. | **ENTREGUE** |
| `GET /api/whatsapp/schedule-block-options` | Agendas e profissionais explicitamente vinculados. | **ENTREGUE** |
| `GET/POST /api/whatsapp/schedule-blocks` | Histórico e criação administrativa do bloqueio real. | **ENTREGUE** |

O HAR não contém a requisição de desbloqueio. Essa operação permanece indisponível até capturar o comando real; não foi presumido que um bloqueio aceite a mesma mudança de status de um agendamento de paciente.

Depois de receber os contratos, o módulo deve armazenar o planejamento, congelar os pacientes impactados, registrar a escolha `SUBSTITUTE`, `KEEP_PROFESSIONAL` ou `HUMAN`, sugerir vagas e efetivar somente após confirmação individual.

## 9. Evidências ainda necessárias para liberar escritas Stenci

1. Desbloquear no Stenci um horário bloqueado e capturar a requisição/resposta.
2. Identificar de onde a interface obtém `totalInsurance`, código/tabela e demais valores da despesa ao criar uma avaliação para cada plano, ou capturar o endpoint correspondente.
3. Confirmar quais campos mínimos o Stenci aceita no cadastro do paciente novo; o HAR atual envia sexo e endereço, que a tela pública ainda não coleta integralmente.

Mudança de status, remarcação, troca de agenda/profissional, reposição e criação de bloqueio estão habilitadas em `/capabilities`. A criação da avaliação pública e o desbloqueio permanecem desligados até os contratos acima.
