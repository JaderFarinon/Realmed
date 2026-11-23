# Evolução no tablet — 19/11/2026

## Entregue nesta etapa

## Destino após a finalização — decisão de 19/11/2026

Ao confirmar a revisão final, a evolução deverá ser gravada e finalizada no prontuário real do Stenci. Somente depois da confirmação remota do estado `finished` ela poderá aparecer no histórico clínico interno e na aba Evolução do app individual do paciente. Rascunhos, respostas parciais, pedidos incertos e registros ainda pendentes não podem ser publicados.

A consulta deve manter o vínculo explícito entre agendamento, paciente, agenda e registro médico retornado pelo Stenci, sem associação por nome ou data aproximada. A apresentação ao paciente inclui data/sessão, texto final e identificação do fisioterapeuta, sem metadados administrativos nem comandos de edição. O paciente poderá consultar e mostrar o registro ao médico pelo próprio link individual; a visualização não transforma o texto em laudo, receita ou alta automática.

Implementado em 19/11/2026 após o HAR `atendimento.har`: a finalização cria o prontuário, envia o texto assinado e confirma `finished`; somente então grava o snapshot cifrado usado nas consultas Realmed e no app do paciente.

Agenda e detalhe apresentam a numeração real do agendamento, obtida de `bundle.current` e `bundle.total` no Stenci. Não confundir o número do grupo de horário (Sessão 1, 2…) com a sessão do tratamento (por exemplo, 10/11). A consulta complementar usa GET `/v1/calendar/attendances?date=...&scheduleId=...`, limitada às agendas explicitamente vinculadas. Associar pelo ID do agendamento, paciente e agenda. `/v1/calendar` continua fornecendo posições vazias e horários para o agrupamento. Sem contador válido, mostrar numeração não informada; nunca calcular pela coleta ou por `performed_sessions` local.

O questionário foi adaptado ao uso por toque no tablet. Cada etapa apresenta três perguntas estratégicas, uma abaixo da outra, com respostas fechadas em botões. Quando as três respostas da etapa são selecionadas, a próxima abre automaticamente após uma transição curta; o fisioterapeuta também pode avançar manualmente ou voltar para rever qualquer escolha. A evolução rotineira usa três etapas — estado atual, atendimento e continuidade — e a última sessão prevista acrescenta uma quarta etapa de reavaliação. Não há campo de digitação durante as perguntas.

As escolhas preenchem chegada/queixas, dor antes/depois, achados físico-funcionais, condutas/parâmetros, resposta, intercorrências, orientações e plano. Dor aceita 0–10 ou Não avaliada. Quando `current === total`, independentemente de ser 10/10, 11/11 etc., acrescentar comparação com avaliação inicial, objetivos atingidos/pendentes, limitações e desfecho/encaminhamentos. Cada alternativa corresponde a uma afirmação clínica explícita; nenhuma opção selecionada autoriza inferir outro achado, normalidade, ausência de intercorrência ou alta. Última sessão prevista não dá alta nem conclui um tratamento automaticamente.

Ao concluir as etapas, a prévia é gerada automaticamente pelo servidor e abre a tela final de revisão. O texto é determinístico, sem geração clínica por IA, e permanece totalmente editável antes da conferência; voltar e alterar uma resposta regenera a versão correspondente. O fisioterapeuta é responsável por revisar a coerência e complementar particularidades que as alternativas não representem. Rodapé identifica nome/CREFITO/UF do profissional vinculado ao usuário autenticado, resolvidos pelo servidor. A conta genérica Stenci não define a autoria clínica. Identificação textual não é assinatura digital certificada.

Referência para a organização documental: [Resolução COFFITO 414/2012](https://www.coffito.gov.br/nsite/?p=3177), itens sobre evolução e identificação profissional. O formulário serve de apoio ao registro e deve ser revisto pela equipe clínica; não preenche achados ou decisões por conta própria.

## Avaliação inicial

Ver Avaliação abre `ListDetailDialog` somente em leitura. A API encontra tratamentos pelo ID externo Stenci do paciente do agendamento autorizado, nunca pelo nome. Havendo mais de um tratamento, o fisioterapeuta seleciona o ciclo; apenas avaliações concluídas são exibidas. Continuidades mostram o snapshot inicial preservado. Não conceder permissões gerais de Gestão de Tratamentos nem permitir edição pela área do fisio.

GET `/physio/agenda/:id/clinical`, GET `/physio/agenda/:id/evaluation` e POST `/physio/agenda/:id/clinical/preview` revalidam usuário ativo, vínculo, agenda e sessão atual antes/depois da leitura. Login/logoff temporários e serialização da conta compartilhada permanecem. A prévia confere novamente o contador atual; mudança de numeração exige atualizar e revisar. POST preview apenas monta texto, sem escrever prontuário.

Rascunho apenas na memória da tela, preservado entre abas e durante revalidação de horário. Saída pelo navegador exige confirmação de descarte; atualização/fechamento alerta pelo navegador. Nada é salvo em localStorage/sessionStorage ou no banco enquanto rascunho. Finalizar exige confirmação explícita, revalida vínculo/horário/contador, assina no servidor com nome/CREFITO/UF do usuário individual e grava no Stenci pela conta compartilhada. Não há salvamento intermediário no Stenci. Após `finished`, o texto fica imutável e somente para consulta; outro atendimento cria outro prontuário.

## Contratos observados nos HARs evolucao.har e atendimento.har

HARs inspecionados localmente; não copiar credenciais, tokens, conteúdo clínico ou os arquivos brutos para repositório, logs ou release.

- GET `/v1/appointments/:id`: agendamento/paciente/agenda/convênio.
- GET `/v1/patients/:id/medical-records?status=pending,paused,triage&limit=20` e consulta de finalizados paginada: listagem dos registros; não são o objeto completo de edição.
- GET `/v1/templates?limit=0&active=true&type=anamnesis`: modelo ativo Texto livre com input editor `content`; ID precisa ser resolvido, nunca fixado ao HAR.
- POST `/v1/medical-records`: início com `appointmentId`, `patientId`, `professionalId` da identidade Stenci autenticada, `start:true`, `status:pending`, `startDate` e demais campos do editor.
- PUT `/v1/medical-records/:id`: salvamento com `anamnesis.templateId` e `anamnesis.inputs.content` HTML; finalização com `status:finished` e `endDate`. Resposta confirma o texto e estado; a agenda posterior aparece finalizada.
- GET `/v1/patients/:patientId/medical-records?status=finished&offset=...&limit=...&search=...&onlyMine=...`: lista as evoluções anteriores do paciente, incluindo ID do registro, estado, profissional e conteúdo da anamnese.
- GET `/v1/medical-records/:id`: abre o registro completo finalizado e devolve o editor como `anamnesis.inputs[]`, com o HTML em `value`.
- A interface observada não reabre um registro `finished` para edição. Uma nova evolução executa outro POST e produz outro ID; registros anteriores permanecem apenas em lista/consulta.
- `appointmentId` é enviado na criação e nos PUTs, mas não aparece na resposta final, na listagem nem no GET individual. O Realmed deve conservar a associação entre agendamento e ID do prontuário a partir da resposta confirmada do POST; não reconstruir por nome, horário ou conteúdo.

### Gravação, idempotência e publicação

O contrato de criação, salvamento, finalização, listagem e leitura está confirmado. Uma linha única por branch/agendamento registra o ID retornado pelo POST antes dos PUTs e impede que recarregamentos ou toques repetidos criem outra evolução. Se a resposta do POST for incerta, a linha fica `UNCERTAIN`, bloqueia nova tentativa e exige conferência; a listagem não contém `appointmentId` e não permite reconciliação determinística.

Para o app público, o usuário autorizou em 19/11/2026 um snapshot cifrado local somente após `finished` confirmado, vinculado ao ID do prontuário, paciente e agendamento. A conta compartilhada `STENCI_FISIO_*` permanece exclusiva do modo autenticado do fisioterapeuta e nunca é usada pela rota pública. O envelope usa chave derivada de `PATIENT_PORTAL_KEY` (ou fallback atual de `JWT_SECRET`); preservar essa chave para manter os registros legíveis.

A finalização mantém validação de sessão antes das escritas; revisão e assinatura textual baseada no usuário individual; proteção contra duplicidade/reenvio; confirmação remota; conteúdo final cifrado; e bloqueio de respostas incertas. Não habilita pausar, apagar, alergias ou outros comandos sem contratos correspondentes.

## Verificação

`backend/test/physio-evolution.test.js` e `physio-evolution-snapshot.test.js`: contador, isolamento, campos explícitos, autoria, contrato HAR e envelope cifrado vinculado ao paciente/registro. `deploy/test-physio-evolution.cjs`: MySQL temporário, assinatura individual, criação/finalização Stenci simulada, idempotência, imutabilidade, snapshot cifrado, revogação e janela da sessão. `deploy/test-patient-portal.cjs`: acesso público exato ao paciente e evolução final cifrada/assinada. `frontend/scripts/verify-physio-evolution.cjs` e `verify-patient-portal.cjs`: questionário por toque, confirmação final, consulta imutável, app do paciente, impressão, tablet/celular e ausência de persistência clínica no navegador.
