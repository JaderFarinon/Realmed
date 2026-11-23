# Alterações — 19/11/2026

## Contatos removidos do modo fisioterapeuta

- Telefone, celular, e-mail, endereço e demais meios de contato deixaram de integrar as respostas da busca de pacientes do fisio, inclusive na visualização administrativa.
- A filtragem ocorre no backend por projeção explícita; ocultar campos no Vue é apenas uma segunda barreira.
- Agenda e detalhe já usavam campos mínimos e receberam regressão para impedir que novos dados de contato do Stenci atravessem esses contratos.
- Permanecem nome, CPF, nascimento e dados assistenciais necessários para identificar corretamente o paciente e realizar o atendimento.

## Destino das evoluções finalizadas

- Definido que a confirmação final deve gravar a evolução no Stenci e aguardar a resposta remota `finished` antes de publicá-la.
- Evoluções finalizadas deverão ficar disponíveis no histórico interno e na aba Evolução do app individual do paciente, com data/sessão, texto final e identificação do fisioterapeuta.
- O app permitirá ao paciente consultar e apresentar o registro ao médico, sem expor rascunhos, metadados administrativos ou registros de outro paciente.
- Implementado após o HAR `atendimento.har`: criação e finalização no Stenci, associação única por agendamento, assinatura do fisioterapeuta individual e snapshot cifrado somente após confirmação `finished`.

Atualização com `atendimento.har`: criação, PUT de rascunho/finalização, listagem por paciente e GET individual foram confirmados. O Stenci trata uma evolução `finished` como consulta; uma evolução posterior cria outro registro. Como `appointmentId` não volta nas leituras, o Realmed guarda o ID retornado no POST dentro de uma operação única do agendamento. O usuário autorizou snapshot clínico final cifrado no Realmed para o app público; a conta compartilhada do tablet permanece restrita ao modo do fisioterapeuta.

## Evolução do fisioterapeuta por escolhas no tablet

- O formulário textual foi substituído por um fluxo de respostas por toque, com três perguntas estratégicas exibidas em cada etapa.
- A evolução rotineira tem três etapas: estado atual, atendimento e continuidade. Quando o contador Stenci identifica a última sessão prevista, uma quarta etapa registra reavaliação, objetivos/limitações e desfecho.
- Ao responder as três perguntas, a próxima etapa abre automaticamente. O fisioterapeuta pode voltar, trocar qualquer resposta e avançar manualmente.
- Ao final, o servidor monta o texto apenas com as afirmações explicitamente selecionadas. A tela de revisão permite editar e complementar livremente antes da conferência.
- O rascunho permanece somente em memória. Confirmar a revisão final cria e encerra o prontuário no Stenci; não há salvamento intermediário, e registros finalizados ficam imutáveis.

Validação local: build/TypeScript, teste de navegador do questionário em tablet e celular, avanço automático, retorno, regeneração, texto editável, reavaliação final e regressões da agenda e da visualização administrativa.

## Pacientes além das posições-base na agenda do fisioterapeuta

- Separadas as duas responsabilidades da consulta Stenci: `/v1/calendar` continua definindo exclusivamente as posições e os limites das sessões; `/v1/calendar/attendances` passa a completar a lista de pacientes da mesma agenda e data.
- Todos os pacientes cujo agendamento começa dentro da janela detectada aparecem na sessão, inclusive encaixes e quantidades acima de seis. O número de posições do bloco não limita os cards exibidos.
- Horários adicionais de pacientes não criam, encurtam nem estendem sessões. Agendamentos fora das janelas conhecidas continuam visíveis em sessão estimada separada, conforme a regra anterior.
- Associação do atendimento complementar permanece restrita ao ID do agendamento, paciente e agenda. A tela continua sem gravar dados clínicos ou alterar a agenda Stenci.

## Validação

Build e TypeScript aprovados. Os 233 testes do backend passaram, incluindo regressões com 13 pacientes dentro de uma sessão delimitada por posições-base e preservação de encaixes/horários esparsos. O teste em navegador validou sete pacientes na primeira sessão, três intervalos inalterados, expansão por toque/teclado, bloqueio por horário e layouts de tablet, paisagem e celular.

## Publicação

Release **20261119-192118** publicada, asset `index-Di9GnGii.js`. A projeção sem contatos foi validada em unidade, integração MySQL descartável e navegador local/publicado com telefone, e-mail e endereço sintéticos. Build/TypeScript e os **235 testes backend** passaram localmente e novamente no servidor. Sem migration pendente; frontend e API responderam 200 e a saúde interna também foi confirmada após o reinício. Nenhum paciente real foi consultado ou alterado. Dependências continuam em `20261109-153438/backend/node_modules`; rollback de código para `20261119-184415`.

Release **20261119-184415** publicada, asset `index-DnI_m7XW.js`. Build/TypeScript, os **235 testes backend** localmente e no servidor e os testes de navegador do fluxo de evolução, app do paciente, agenda e visão administrativa foram aprovados. A validação da integração clínica usou o contrato confirmado pelo HAR e respostas Stenci sintéticas; nenhum prontuário de paciente real foi criado ou alterado durante os testes. Site e API responderam 200 após a troca atômica.

O backup obrigatório foi concluído antes da migration `20261119000001_physio_evolutions`, aplicada sem pendências. A versão ativa é `20261119-184415`, com rollback de código para `20261119-145504`; um rollback não deve apagar a nova tabela nem snapshots finais já gravados. Dependências continuam vinculadas a `20261109-153438/backend/node_modules`, cujo destino deve ser preservado.

Release **20261119-145504** publicada, asset `index-Bfab0pwm.js`. Build/TypeScript e os **233 testes backend** passaram localmente e novamente no servidor. A interface publicada foi conferida com APIs sintéticas, sem consultar ou gravar pacientes reais; site e API responderam 200 e os hashes dos dois serviços alterados coincidem com os arquivos locais.

Esta correção não criou migration. O fluxo encontrou a migration anterior `20261117000001_whatsapp_automation` ainda pendente, fez o backup obrigatório e a aplicou antes da troca atômica. Dependências continuam vinculadas a `20261109-153438/backend/node_modules`, cujo destino deve ser preservado. Rollback de código: `20261116-170823`; o schema da automação permanece preservado em rollback.
