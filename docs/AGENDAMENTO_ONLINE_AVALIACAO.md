# Agendamento online de avaliações — 13/11/2026

## Consulta da agenda e layout ampliado — 13/11/2026

Por escolha explícita do usuário, selecionar a agenda Stenci **Avaliação**, da **Realmed Matriz**, identificador `64df712e7859670b029747fb` (usuário informou Helen como fisioterapeuta). O catálogo consultado confirma nome, unidade e identificador; não usar a agenda de avaliação do Hauer nem agendas de sessões. Conexão institucional autorizada, serviço Avaliação Inicial (Ambulatorial) e planos explicitamente vinculados ao serviço/agenda no Stenci. Configuração aplicada pela API privada com revisão e auditoria.

Habilitar consultas exige agendas/serviço/planos; endereço e contato podem ser completados na configuração antes da futura confirmação, sem inventar valores nem impedir a leitura atual. A reserva continua indisponível de forma incondicional. Administradores podem conferir a mesma grade pela configuração salva, escolhendo data e plano: POST privado `/availability`, sem CPF, dados de pacientes ou reserva. Preserva validação de datas, planos, revisão, permissão, relógio e regras compartilhadas da grade pública.

No computador, composição de até 1280 px, introdução lateral, formulário amplo, tipografia maior e seis colunas de horários; no celular, uma coluna de formulário e quatro de horários. Fluxo CPF → dados → horários → revisão preservado.

## Entrega desta versão

Rota pública `/agendar-avaliacao`, sem autenticação, em quatro passos: CPF/conferência do nascimento, dados do paciente, data/horário e revisão. Implementados consultas e preparação; **a confirmação de reserva está indisponível na interface e na API**, independentemente de flags enviadas pelo cliente ou configuração. Não se cria paciente, agendamento, solicitação para recepção ou tratamento local nesta versão.

Configuração em menu do usuário → Configurações → Agendamento online, exclusiva para administradores ativos, com revalidação do perfil no banco. Selecionar explicitamente agendas de avaliação da Realmed Matriz, serviço, convênios/planos aceitos e obrigatoriedade de carteirinha/validade. Horizonte de 1 a 90 dias (padrão 30), endereço e contato. Nenhuma agenda é selecionada automaticamente; não consultar rodízio ou agendas vinculadas ao fisio para descobrir participantes.

A configuração inicia desabilitada. Habilitar permite somente identificação/consulta, mantendo o aviso de preparação e a confirmação bloqueada. Salvar valida seleção atual no Stenci e utiliza revisão/lock transacional e auditoria. Desabilitar continua possível durante indisponibilidade do fornecedor.

## Consultas confirmadas

- `GET /v1/patients/search`, paginação de até 1.000 candidatos, filtro adicional por CPF normalizado exato. Resultados duplicados ou inconsistentes exigem recepção; nenhuma lista pública. CPF inexistente não cria cadastro. CPF encontrado exige nascimento exato antes de devolver nome, nascimento, celular, convênio/plano e carteirinha. Não retornar IDs do paciente, endereço, histórico, raw payload ou outros dados.
- `GET /v1/schedules?limit=0&active=true&type=elective` (api-x): agendas da Matriz.
- `GET /v1/schedule-expenses?limit=0&active=true` (api-x): serviço e vínculos explícitos `scheduleIds`/`insuranceIds`.
- `GET /v1/schedule-insurance-plans?limit=0&active=true` (api-x): convênio/plano e agendas. A chave interna é o par convênio/plano.
- `GET /v1/calendar?type=elective&date=...&scheduleId=...` (api-x): disponibilidade. O HAR confirma `startDate/endDate` locais da clínica sem offset, `status: available`, `isSlot: false`, paciente/id nulos. `available.insurancePlans` contém **IDs dos planos**, enquanto `schedule-expenses.insuranceIds` contém IDs dos convênios. `reserves` não é interpretado como número de reservas ocupadas (o HAR retorna 1 em posições livres).

Grade pública sempre tem 36 opções, 08h00–19h40, 20 minutos. Exige cobertura contínua explícita de todo o intervalo por posições livres compatíveis, sem sobreposição ocupada/bloqueada. Agenda vazia ou posição ausente é Ocupado. Resposta incompleta, falha de consulta ou agenda fora da seleção gera erro com nova tentativa, nunca disponibilidade presumida. Retorno público tem somente horário, rótulo e disponível/não disponível.

Relógio do servidor, fuso America/Sao_Paulo; duas horas inclusivas de antecedência e janela de datas revalidadas após consulta externa. Timestamps Stenci locais interpretados como horário da Matriz (UTC−03 no período suportado), offsets explícitos também aceitos. Interface acompanha o relógio por `performance.now()` e reconsulta ao retornar do segundo plano, sem polling da agenda. A confirmação futura deverá revalidar estes mesmos requisitos com consulta fresca.

## Conexão e contexto

Conector restrito `evaluationBookingStenci`: autenticação/branch/me, consultas permitidas e logoff em `finally`; não possui métodos de escrita. Usar secrets `STENCI_BOOKING_USERNAME/PASSWORD` ou, por opção explícita do administrador, a conexão institucional existente `STENCI_FISIO_USERNAME/PASSWORD`. As credenciais nunca saem do servidor. Esta opção estende a conexão institucional somente às consultas deste módulo, não às APIs administrativas genéricas. A operação compartilha a fila do fisio para não cruzar logoffs; até quatro operações de agendamento aguardando/em execução, com prazo de fila. Não altera conta/coletor/fluxos de login existentes.

Contexto opaco aleatório de 32 bytes, header `X-Booking-Context`, TTL absoluto de 30 minutos e capacidade limitada. Dados em memória somente; nenhuma gravação em localStorage/sessionStorage, URL, logs ou banco clínico. Reinício/expiração exige nova identificação. Mutação do mesmo contexto serializada; CPF/nascimento em corpos POST. Cinco divergências de nascimento por CPF em 15 minutos, compartilhadas entre contextos; limite de IP adicional. Respostas com `Cache-Control: no-store`; erros remotos sanitizados. A conferência de nascimento não equivale a autenticação do portal e não concede acesso a outro módulo.

Dados de paciente existente são reutilizados; nome/nascimento confirmados não podem ser sobrescritos por POST adulterado. Campos ausentes, celular, plano e exigências de carteirinha são validados no servidor. Dados preenchidos para agendamento não alteram automaticamente o cadastro Stenci.

## APIs

Públicas em `/api/public/evaluation-booking`:

| Operação | Método e caminho | Comportamento |
|---|---|---|
| Informações públicas | GET `/config` | Unidade, contato, endereço, janela, relógio e capacidades |
| CPF | POST `/identify` | Contexto e necessidade de nascimento; sem dados do paciente |
| Nascimento | POST `/birth-date` | Confere cadastro do contexto |
| Dados e convênios | POST `/catalogs` | Exige contexto verificado |
| Preparar dados | POST `/details` | Valida e mantém somente em memória |
| Horários | POST `/availability` | Data e grade mínima sem dados de terceiros |
| Confirmar | POST `/confirm` | 503 `BOOKING_WRITE_CONTRACT_PENDING`, nenhuma operação externa |
| Resultado | POST `/result` | `not_submitted`, sem protocolo fictício |
| Limpar | DELETE `/context` | Descarta dados temporários |

Privadas em `/api/evaluation-booking`: GET/PUT `/config` e POST `/options`. Migration `20261113000001_evaluation_booking` cria configuração e auditoria; sem alteração de pacientes ou tratamentos.

## Contratos pendentes e critério para habilitar a confirmação

Receber HAR de cadastro de paciente com convênio/plano/carteirinha, criação da avaliação para paciente existente, resposta de confirmação, consulta confiável da reserva após interrupção e conflito quando outro operador ocupa a vaga. Precisamos validar o comportamento real de concorrência com a recepção no Stenci.

Somente após esses contratos: implementar registro durável de operações e chave de idempotência, referência do paciente recém-criado para reutilização, reconciliação antes de qualquer reenvio ambíguo, reconsulta de disponibilidade/antecedência e recibo com protocolo confirmado. Esses cenários de escrita real ainda **não foram implementados nem validados**; repetir `/confirm` hoje apenas repete a recusa segura, não comprova idempotência do fornecedor. Não habilitar por simples variável de ambiente/configuração. Alterações/cancelamentos pela recepção, sem mensagens externas automáticas.

## Verificação

- `backend/test/evaluation-booking.test.js`: CPF/datas, grade/cobertura, antecendência, fechamento, convênios, dados obrigatórios, identidade imutável, contexto, consultas mínimas, duplicidades, sanitização e login/logoff.
- `deploy/test-evaluation-booking.cjs`: MySQL temporário local, migração/auditoria/revisões, admin atual, API anônima, nascimento, privacidade, conflito de contexto, indisponibilidade de confirmação, expiração e zero gravações de pacientes/tratamentos.
- `frontend/scripts/verify-evaluation-booking.cjs`: interfaces públicas/admin, celular e desktop, dados sintéticos, bloqueios, revisão, erros e recuperação, sem armazenamento clínico no navegador.
- Build/TypeScript e verificação do padrão compartilhado antes de publicação. Registro da release em `ALTERACOES_2026-11-13.md`.
