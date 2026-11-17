# Evolução no tablet — 12/11/2026

## Entregue nesta etapa

Agenda e detalhe apresentam a numeração real do agendamento, obtida de `bundle.current` e `bundle.total` no Stenci. Não confundir o número do grupo de horário (Sessão 1, 2…) com a sessão do tratamento (por exemplo, 10/11). A consulta complementar usa GET `/v1/calendar/attendances?date=...&scheduleId=...`, limitada às agendas explicitamente vinculadas. Associar pelo ID do agendamento, paciente e agenda. `/v1/calendar` continua fornecendo posições vazias e horários para o agrupamento. Sem contador válido, mostrar numeração não informada; nunca calcular pela coleta ou por `performed_sessions` local.

O questionário prepara uma prévia editável com chegada/queixas, dor antes/depois, achados físico-funcionais, condutas/parâmetros, resposta, intercorrências, orientações e plano. Respostas vazias não viram normalidade, ausência de intercorrências ou alta. Atalhos preenchem somente por ação explícita. Dor aceita 0–10 ou Não avaliada. Quando `current === total`, independentemente de ser 10/10, 11/11 etc., acrescentar comparação com avaliação inicial, objetivos atingidos/pendentes, limitações e desfecho/encaminhamentos. Última sessão prevista não dá alta nem conclui um tratamento automaticamente.

Texto determinístico, sem geração clínica por IA. Usuário revisa e pode editar o texto; alterações nas respostas exigem gerar novamente antes de abrir a prévia. Rodapé identifica nome/CREFITO/UF do profissional vinculado ao usuário autenticado, resolvidos pelo servidor. A conta genérica Stenci não define a autoria clínica. Identificação textual não é assinatura digital certificada.

Referência para a organização documental: [Resolução COFFITO 414/2012](https://www.coffito.gov.br/nsite/?p=3177), itens sobre evolução e identificação profissional. O formulário serve de apoio ao registro e deve ser revisto pela equipe clínica; não preenche achados ou decisões por conta própria.

## Avaliação inicial

Ver Avaliação abre `ListDetailDialog` somente em leitura. A API encontra tratamentos pelo ID externo Stenci do paciente do agendamento autorizado, nunca pelo nome. Havendo mais de um tratamento, o fisioterapeuta seleciona o ciclo; apenas avaliações concluídas são exibidas. Continuidades mostram o snapshot inicial preservado. Não conceder permissões gerais de Gestão de Tratamentos nem permitir edição pela área do fisio.

GET `/physio/agenda/:id/clinical`, GET `/physio/agenda/:id/evaluation` e POST `/physio/agenda/:id/clinical/preview` revalidam usuário ativo, vínculo, agenda e sessão atual antes/depois da leitura. Login/logoff temporários e serialização da conta compartilhada permanecem. A prévia confere novamente o contador atual; mudança de numeração exige atualizar e revisar. POST preview apenas monta texto, sem escrever prontuário.

Rascunho apenas na memória da tela, preservado entre abas e durante revalidação de horário. Saída pelo navegador exige confirmação de descarte; atualização/fechamento alerta pelo navegador. Nada salvo em localStorage/sessionStorage, banco Realmed ou Stenci. Na expiração da sessão os campos deixam de ficar acessíveis; indicar rascunho ainda não enviado. Iniciar, salvar e finalizar continuam desabilitados, com indicação permanente dessa pendência.

## Contratos observados no HAR evolucao.har

HAR inspecionado localmente; não copiar credenciais, tokens, conteúdo clínico ou o arquivo bruto para repositório, logs ou release.

- GET `/v1/appointments/:id`: agendamento/paciente/agenda/convênio.
- GET `/v1/patients/:id/medical-records?status=pending,paused,triage&limit=20` e consulta de finalizados paginada: listagem dos registros; não são o objeto completo de edição.
- GET `/v1/templates?limit=0&active=true&type=anamnesis`: modelo ativo Texto livre com input editor `content`; ID precisa ser resolvido, nunca fixado ao HAR.
- POST `/v1/medical-records`: início com `appointmentId`, `patientId`, `professionalId` da identidade Stenci autenticada, `start:true`, `status:pending`, `startDate` e demais campos do editor.
- PUT `/v1/medical-records/:id`: salvamento com `anamnesis.templateId` e `anamnesis.inputs.content` HTML; finalização com `status:finished` e `endDate`. Resposta confirma o texto e estado; a agenda posterior aparece finalizada.

### Informação ainda necessária

Falta captura **reabrindo um atendimento já iniciado e abrindo uma evolução salva**, para identificar a consulta do registro completo e sua ligação ao agendamento. As listagens presentes não retornam todos os campos enviados pelo editor, como lembrete/telemedicina/tag, nem comprovam sozinhas o vínculo registro–agendamento. Não inferir endpoint GET individual, não substituir campos ausentes por valores vazios e não associar por nome/data aproximada. Não habilitar começo de um atendimento sem garantir sua retomada.

Após receber esse contrato, implementar início/rascunho/finalização com: mesma validação de sessão no servidor; revisão e assinatura textual baseada no usuário; proteção contra duplicidade/reenvio; confirmação remota; controle de alterações concorrentes; conservação dos demais dados do prontuário; recuperação de respostas incertas sem criar outra evolução. Não habilitar pausar, apagar, alergias ou outros comandos sem contratos correspondentes.

## Verificação

`backend/test/physio-evolution.test.js`: contador, isolamento agenda/paciente, última sessão variável, campos explícitos, dor e autoria. `deploy/test-physio-evolution.cjs`: MySQL temporário, avaliação por paciente/ciclo, exclusão de rascunhos, revogação, início/fim da janela e login/logoff sem escrita. `frontend/scripts/verify-physio-evolution.cjs`: questionário/prévia, autoria, alteração das respostas, leitura da avaliação, tablet/celular, ausência de persistência e de envio clínico. Regressões de agenda, janela atual e padrão de telas.
