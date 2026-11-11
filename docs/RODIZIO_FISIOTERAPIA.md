# Rodízio de fisioterapeutas — 28/10/2026

## Confirmação de agendamento e histórico — 06/11/2026

Após consultar, abrir modal com o profissional indicado, agenda e todas as sessões. **Confirmar** só habilita após marcar **Agendei o paciente no Stenci**; o backend exige o booleano explícito. Esta marcação registra uma declaração do usuário, sem agendar remotamente nem comprovar agendamento via API. A indicação confirmada preenche automaticamente o executor na Central, sem trocar o responsável pela avaliação. Avaliação e Central precisam estar abertas e respeitar as reservas de edição.

Cada consulta, inclusive sem vagas, grava `PHYSIOTHERAPY_ROTATION_SUGGESTED` no histórico transacional do tratamento. O snapshot mantém a indicação, agenda, sessões, critérios de entrada e identificador de confirmação vinculado ao autor. Somente a sugestão mais recente daquele tratamento pode ser confirmada pelo autor; nova consulta invalida a anterior. A sugestão persiste no banco, sem depender da memória do servidor nem do antigo prazo de dois minutos.

Como a confirmação ocorre **depois** do agendamento manual, ela não exige que as vagas continuem livres e não recalcula o rodízio. Mantém o nome indicado e confere identidade das agendas/profissionais e a sugestão vigente sob locks. Esta decisão substitui a reconsulta de disponibilidade na confirmação. Confirmação e reenvio são idempotentes; alteração de configuração ou fechamento da etapa bloqueia a operação. Não presumir que vagas ocupadas pertencem ao paciente.

O histórico fica visível na própria avaliação, inclusive em somente leitura, com data/hora, consulta ou confirmação, nome sorteado, agenda, usuário e declaração de agendamento. Nomes novos são snapshots; registros antigos usam o nome cadastrado quando disponível e não recebem declaração retroativa de agendamento. A rota de leitura não expõe o identificador de confirmação. Testes: `physiotherapy-rotation-confirmation.test.js`, `deploy/test-physiotherapy-rotation.cjs` em banco isolado e `frontend/scripts/verify-rotation-confirmation.cjs` com dados simulados.

Referência analisada sem executar macros: Escala Atendimento - Fisioterapia.xlsm, módulo modStenciEscala. O VBA consulta /v1/schedules e /v1/calendar, limita a unidade pelo nome Realmed Matriz e conta status available. Usava a escala manual da aba Gráfico Ocupação, primeira ocorrência de cada dia, bloco de 45 minutos e histórico da própria planilha. Credenciais, histórico de pacientes e códigos de autenticação da planilha não foram importados.

## Uso

Na avaliação digital, seção 7, preencher dias, horários desejados por dia, início previsto e total previsto de sessões. Consultar próximo fisioterapeuta calcula a indicação automaticamente. A tela mostra todas as datas, horário desejado, início real da sessão, vaga exata de um minuto no Stenci e vagas disponíveis. Confirmar indicação reconsulta as vagas, grava a escolha auditada no Realmed e permite usar os horários na ficha. Salvar o rascunho continua necessário para persistir os demais dados da avaliação. Consulta não conta como rodada; confirmação conta uma única vez por tratamento/ciclo, inclusive em reenvios.

A função é de indicação: não agenda nem reserva no Stenci, não cria consultas remotas e não confirma disponibilidade até a data do atendimento. A avaliadora realiza/confronta os agendamentos no Stenci. Se mudar dias, início, horários ou quantidade, consultar e confirmar novamente. O profissional executor indicado não substitui a pessoa que assina a avaliação: a avaliação guarda seu responsável; guide_processes.physiotherapist_id recebe a indicação do rodízio, preservada nos salvamentos seguintes da ficha.

## Agendas participantes

Administrador acessa Agendas participantes na própria seção e vincula explicitamente agendas a profissionais Stenci ativos com CREFITO válido. Agendas sem vínculo não participam. Somente a unidade exatamente Realmed Matriz (acentos/caixa normalizados) é aceita; nomes de agendas contendo avaliação são excluídos. Não vincular nomes parecidos automaticamente. A configuração aceita até 40 agendas; profissional cadastrado é sincronizado pelo external_id Stenci. Todos os acessos a indicação exigem editar tratamentos; configuração também exige admin/masteradmin, validado no banco. Usuários sem edição podem consultar a indicação registrada no tratamento.

## Regras de cálculo

- Exigir disponibilidade em todas as sessões previstas, distribuídas cronologicamente nos dias selecionados a partir do início informado. Não verificar somente a primeira semana. Não inferir vaga pela ausência de atendimentos.
- Aceitar início de sessão até 25 minutos antes ou depois do horário desejado, conforme resposta explícita do usuário. Horário de vaga 14:03 representa uma posição da sessão das 14:00, não três minutos de diferença na preferência.
- Agrupar entradas consecutivas de um minuto; cada grupo observado possui no máximo seis posições. Duplicatas não aumentam capacidade; conflito ocupado/disponível é ocupado. Grupos ambíguos acima de seis posições não são usados. Bloqueios, ocupados, cancelados ou ausência de status available não são vagas. Apenas posições realmente retornadas contam; nunca fabricar seis vagas para uma agenda vazia.
- Manter o mesmo início de sessão em todas as ocorrências de cada dia da semana. Segunda pode diferir de quarta conforme a preferência de cada dia. Um profissional sem uma das sextas necessárias é eliminado.
- A janela de até 25 minutos define quais horários são elegíveis; a proximidade dentro dessa janela não ordena os fisioterapeutas. Após exigir disponibilidade em todas as sessões, priorizar o maior mínimo de vagas livres entre as sessões e depois a maior soma de vagas livres. Empates seguem menor número de indicações confirmadas, indicação mais antiga e ID estável da agenda. A vaga usada em cada agenda/dia é a mais próxima do horário desejado que permita manter o mesmo horário nas ocorrências daquele dia da semana.
- Uma pessoa aparece uma vez no resultado. Quando há múltiplas agendas para a mesma pessoa, cada agenda precisa cobrir a sequência inteira; não combinar agendas distintas por suposição.

## Integração e persistência

rotationRead reutiliza a fila serializada por sessão, AES na memória, validação da identidade e logoff em finally. As consultas de rodízio ignoram cache e só publicam resultados após logoff confirmado. O orçamento desta operação é de 120 segundos, até quatro consultas externas paralelas por lote e timeout individual existente; logoff mantém suas tentativas fora do orçamento. Falha parcial não retorna indicação baseada somente nas agendas que responderam. Não reutilizar credencial do coletor diário para operações interativas.

Limites explícitos: 1–60 sessões, até 40 agendas e 1.200 combinações agenda/data por consulta. Limites excedidos pedem ajuste; não truncar tratamentos ou resultados silenciosamente. Datas são interpretadas em America/Sao_Paulo e exibidas dd/mm/aaaa.

Migration 20261028000001 cria physiotherapy_rotation_agendas, physiotherapy_rotation_state e physiotherapy_rotation_assignments. Confirmação tem prévia vinculada a usuário/sid/tratamento, validade de dois minutos e revalidação fresca. Transação bloqueia tratamento e fila, confere alterações de configuração/disponibilidade, incrementa sequência e grava profissional/histórico atomicamente. Mudança do recomendado exige nova consulta; fechamento da avaliação ou da Central impede alterar. Reenvio do mesmo token não avança duas vezes. Nova confirmação do mesmo tratamento substitui a indicação corrente, preservando a auditoria no histórico. Nenhum dado clínico ou token Stenci é gravado nessas tabelas.

## Validação

Testes unitários de blocos/duplicatas/limite/dias/recorrência/disponibilidade/desempate/login/logoff; teste MySQL isolado test-physiotherapy-rotation.cjs para configuração, confirmação, reenvio, vagas alteradas, concorrência, permissões e separação do avaliador; verify-physiotherapy-rotation.cjs para a tela com APIs simuladas. Regressões de avaliação e padrão de telas permanecem obrigatórias. Testes simulados não comprovam vagas de pacientes reais; o primeiro uso exige conferir os vínculos de agendas e o retorno do Stenci.


## Executor na Central de Guias — 28/10/2026

Confirmar a indicação preenche e persiste automaticamente o fisioterapeuta executor na Central de Guias e no cabeçalho, sem concluir a etapa. A atualização é propagada entre abas sem recarregar a ficha clínica nem descartar rascunhos. Se a Central já estiver aberta, atualizar somente o executor, preservando os outros campos editados. O usuário confere os dados e finaliza a Central explicitamente. O profissional responsável pela avaliação não é alterado.
