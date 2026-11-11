# Continuidade das guias — 27/10/2026

## Gerar Continuação no card do paciente — 11/11/2026

No detalhe de um ciclo que está na fila Faturar, o card fixo do paciente oferece **Gerar Continuação**. Reutiliza a permissão authorizations/edit, sem precisar entrar em edição da aba. Abre confirmação com número de sessões da nova guia e declaração de continuidade em sequência; se antecipar encerramento, exige motivo. Somente o ciclo mais recente pode continuar; uma continuação já criada desabilita o botão. A ação anterior Adicionar Guias em Liberação permanece disponível conforme suas regras.

O botão usa billing_due calculado pela mesma condição SQL da fila, e envia require_billing=true. A API revalida essa condição sob lock: reabertura/remoção de requisitos depois de abrir o modal impede criar por esse atalho. Tratamentos arquivados não podem continuar. Mantidos reserva de edição, autorização, transação da raiz, unicidade e auditoria existentes; não há concessão de permissões.

O resultado é outro registro/ciclo ligado ao tratamento inicial, com sessões solicitadas próprias, autorizadas nulas e realizadas zero. A avaliação inicial é preservada por snapshot em somente leitura. A aba Avaliação fica verde e pode ser consultada imediatamente, inclusive enquanto a Recepção do novo ciclo está aberta; não permite editar/reabrir e não usa médico ou dados clínicos novos para preencher lacunas da ficha histórica. Sem ficha digital legada, informar a ausência, mantendo a dispensa de nova avaliação. As outras etapas continuam sequenciais, começando pela conferência da Recepção.

O ciclo anterior mantém arquivos, sessões, histórico e cobranças. Procedimentos e documentos não são copiados: os três procedimentos e as três guias continuam obrigatórios na nova Central, conforme a decisão de 10/11. Criar continuação não fatura nem agenda no Stenci.

Validação atual: verify-guide-continuity.cjs cobre card, confirmação/repetição após erro, restrição por fila/permissão, navegação, avaliação inicial verde consultável e imutável e tablet/celular; test-guide-continuity.cjs cobre SQL da fila, revalidação, arquivos/procedimentos independentes, três guias, snapshots até Guia 3, concorrência, rollback, arquivo excluído, legado e faturamento preservado.

Na aba Liberação, Adicionar Guias inicia outro ciclo do mesmo tratamento/paciente. Cada guia possui suas próprias sessões solicitadas/autorizadas/realizadas, autorização, datas, arquivos, pendências e faturamento. O tratamento raiz e a sequência Guia 1, 2, 3… ficam visíveis; a tabela da Liberação permite abrir ciclos anteriores. O identificador interno de guide_processes identifica um ciclo, ligado por treatment_root_id/continuation_of_id/guide_number. Não criar outro paciente.

O operador informa sessões da nova guia e confirma o encerramento da atual. Se ainda há sessões pendentes, exige motivo. É permitido após liberação/conclusão da guia atual, inclusive com etapa Liberação fechada: a ação cria outro ciclo sem reabrir ou sobrescrever a decisão anterior. Somente a guia mais recente pode continuar. A guia anterior fica COMPLETED/READY para Faturar; se já estava DELIVERED/BILLED, mantém esse faturamento. Documentos, autorizações, saldos utilizados e histórico anteriores permanecem no ciclo original. Campos de documentação incompleta não são marcados completos artificialmente.

A nova guia começa READY (Pendente de Liberação), WAITING, faturamento NOT_READY, sessões realizadas zero e autorizadas nulas. Reaproveita os dados salvos do paciente, convênio, profissional, médico e encaminhamento; início previsto fica para revisão. Procedimentos e arquivos não são copiados automaticamente: anexar/gerar a nova guia em Documentos e conferir os códigos conforme o convênio. A continuidade exige somente PHYSIOTHERAPY_GUIDE; não exige outra consulta/avaliação. Enquanto organiza documentos, permanece pendente; encaminhamento continua bloqueado até os dados e a nova guia estarem adequados.

Se houver avaliação digital concluída, copia-se uma referência histórica materializada (snapshot de conteúdo, rubrica, datas e autoria), auditada com evaluationSourceId. Ela fica somente leitura na continuidade, também pela API; não constitui uma nova avaliação ou assinatura. Avaliação legada ausente não obriga o paciente a repetir a avaliação para continuar: a interface informa a dispensa, sem inventar uma ficha concluída. Alterações da avaliação original não sobrescrevem snapshots de ciclos anteriores. O paciente do vínculo não pode ser trocado.

Ao realizar as sessões autorizadas ou concluir o novo ciclo, ele chega a Faturar novamente. O dashboard conta guias/ciclos, e pode mostrar simultaneamente a guia anterior em Faturar e a nova pendente. Não faturar automaticamente nem perder a cobrança anterior ao iniciar continuidade.

POST /api/guide-processes/:id/continuities exige authorizations/edit, requested_sessions inteiro positivo até 100000, confirm_end_current=true e motivo no encerramento antecipado. Trava raiz e guia atual, confirma a guia mais recente, usa unicidade de continuidade/numeração e transação para criar ciclo, snapshot, encerramento e auditoria. Reenvios/concorrência não criam duas guias. GUIDECONTINUITY é registrado como GUIDE_CONTINUITY_ADDED no ciclo anterior e GUIDE_CONTINUITY_CREATED no novo. Sem permissões automáticas. Migration 20261027000014 é aditiva e preserva vínculos na reversão.

Validações: deploy/test-guide-continuity.cjs cobre sequência até Guia 3, autorização e Faturar repetidos, avaliação preservada/bloqueada, independência de arquivos e saldos, guia legada, concorrência, rollback e 403. frontend/scripts/verify-guide-continuity.cjs verifica modal, confirmação, erro/nova tentativa, navegação/recarregamento/voltar, campos obrigatórios por ciclo e celular. Revalidar dashboard, autorização, avaliação digital e padrão de telas.


## Faturamento por guia — 28/10/2026

Ver [FATURAMENTO_POR_GUIA.md](FATURAMENTO_POR_GUIA.md). Consulta pode ir a Faturar após avaliação, simultaneamente à liberação. Cobrar a consulta não fatura fisioterapia/eletro; estas retornam a Faturar ao concluir sessões. O dashboard permite sobreposição da fila Faturar e conta total distinto. Permissão própria guide_billing, sem concessão automática.
Atualização — 10/11/2026: todos os ciclos, inclusive continuidades, exigem os três procedimentos (consulta/avaliação, fisioterapia e eletroestimulação) e suas três guias adequadas antes de finalizar a Central. Esta decisão substitui a dispensa anterior da guia/procedimento de consulta e a eletro opcional. Continua dispensada nova avaliação clínica; não copiar procedimentos/anexos nem faturar automaticamente. Preservar ciclos e cobranças anteriores.

