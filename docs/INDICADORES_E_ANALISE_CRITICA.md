# Indicadores e análise crítica — 12/11/2026

## Acessos e telas

Menu Indicadores contém Painéis (`/indicadores/paineis`) e Análise crítica (`/indicadores/analise-critica`). Permissões independentes `indicator_panels/view` e `indicator_analysis` (visualizar, criar, editar e excluir), sem concessões automáticas. Administradores seguem o padrão vigente. Análise crítica permite consultar os indicadores para compor apresentações, mesmo sem a permissão de Painéis. A revisão geral de permissões não faz parte desta entrega.

As duas telas possuem Perfil epidemiológico, Recepção, Fisioterapia e Faturamento. Painéis usam PageShell, BillingChart e filtros recolhidos. Ver dados usa DataList. Apresentações salvas usam DataList/ListDetailDialog. Sem botão Voltar, polling ou armazenamento de indicadores/rascunhos no navegador. Aplicar filtros consulta dados locais e aborta respostas superadas.

## Bases e significado

- Agenda: `billing_stenci_appointments`, por branch configurada e data do agendamento; registros únicos pelo ID externo. Status, agenda, unidade e convênio filtram o recorte. Reutiliza memberships e classificação existente de fisioterapia/avaliação. Sem novos endpoints Stenci, consultas por paciente em massa ou alterações de prontuário.
- Realmed: ciclos não excluídos, por data de criação e convênio, com procedimentos e faturamento por guia. Situação operacional usa o mesmo CASE do dashboard de tratamentos. Exibe situação atual dos ciclos criados no período, sem reconstruir status históricos ou inferir receita/pagamento.
- Perfil: pacientes distintos da origem escolhida (Stenci, Realmed ou união). Ligação somente por `external_source=STENCI` e `external_id`, nunca por nome/CPF. Convênio do registro mais recente no recorte; no mesmo dia a agenda prevalece sobre a data de criação local. Paciente não é contado novamente por sessão. Padrão Ativos inclui agendados, faltas e finalizados, excluindo cancelados/remarcados. Finalizados pode ser selecionado.
- Sexo/nascimento: cadastro local sincronizado; dados disponíveis na agenda complementam os não cadastrados. Idade calculada no fim do período: 0–17, 18–29, 30–44, 45–59, 60–74 e 75+. Datas inválidas/futuras e idade acima de 120 são Não informado. Não inferir sexo pelo nome.
- Endereço agregado por município/UF e bairro/município. Busca de pacientes já retorna `addresses[0].city/neighborhood/state` (estrutura conferida nos HARs existentes). Sincronização passa a preservar esses campos. Agenda preserva nascimento/sexo e geografia se retornados, usando lista explícita. Não armazenar rua/número/CEP ou payload clínico para indicadores. Campos antigos ausentes aparecem Não informado até nova sincronização.
- Tipo de tratamento usa classificação explícita do atendimento e tipo cadastrado dos procedimentos locais. Multirresposta: paciente pode aparecer em fisioterapia, avaliação e eletroestimulação; soma pode ultrapassar população. Não equivale a diagnóstico/prevalência de doença.
- Filtros de agenda/unidade/status não restringem a origem local da união; formulário/resultado explicam. Para recortar apenas uma unidade observada, selecionar Agenda Stenci como origem.

Recepção: situação, agendamentos/dia e comparecimento/faltas (finished/missed). Fisioterapia: situação, finalizados/dia e convênios, excluindo avaliações. Faturamento: status por guia aplicável, situação atual dos ciclos e documentação. Finished não comprova evolução, conclusão clínica ou pagamento.

Faturamento por guia inclui as três guias previstas de cada ciclo, mesmo antes da primeira movimentação, com o mesmo fallback de `guideBilling.single`: status individual prevalece; sem registro, preservar BILLED/DELIVERED legado do ciclo ou considerar PENDING. Pendente não é elegibilidade para faturar; versões de arquivo não são contadas.

## Cobertura

Mostrar dias com snapshot, dias atualizados e última coleta. Ausência de coleta não vira zero nos indicadores exclusivos da agenda; dia coletado vazio é zero. Identificar dados parciais. Painéis usam o coletor existente, sem programar reprocessamento em massa. Não aceitar datas futuras; até 731 dias por consulta. Grupos acima de 200 são consolidados em Demais grupos, preservando soma. API devolve somente agregados, sem nome, CPF, contato, identificação individual ou evolução.

## Apresentações

Selecionar indicador cria uma tela com capturas calculadas no servidor: Agora usa o período escolhido (mês até hoje por padrão); Antes usa período anterior de igual duração. Ambos têm filtros próprios. Aplicar e atualizar comparação cria capturas novas, sem mudar silenciosamente as anteriores. Rótulos, fontes, filtros efetivos, cobertura, data de consulta e versão da definição acompanham resultados.

Cada tela possui Antes, Agora e Futuro. Interpretação: De onde eu vim; Como cheguei a este resultado; Para onde estou indo; O que fazer para seguir. Meta, responsável e prazo completam o plano. Rascunho incompleto pode ser salvo; apresentar/imprimir exige título e quatro textos. Metas são preenchidas pelo usuário, não previsões automáticas. Filtros diferentes além das datas recebem aviso. Faturamento continua sendo situação atual de coortes por criação, inclusive em Antes, conforme nota do indicador.

Misturar áreas, adicionar até 30 telas, reordenar/remover, salvar/reabrir, apresentar em sequência e imprimir/salvar PDF pelo navegador. Compartilhamento entre usuários autorizados. Salvamento explícito; aviso de alterações não salvas ao navegar/fechar. Nenhum rascunho no navegador.

`indicator_snapshots`: agregados imutáveis calculados no servidor, sem aceitar números enviados pelo cliente. `indicator_presentations`: referências às capturas, título, ordem e textos; revisão otimista/transação. Versão obsoleta retorna 409 e preserva o rascunho na tela. Exclusão lógica exige permissão própria e revisão atual. `indicator_presentation_audit`: autor/ação/revisão. Rollback preserva dados. Captura registra o que foi consultado naquele instante, não um histórico retroativo da base.

## Validação

- `backend/test/indicators.test.js`: deduplicação, campos ausentes, idade, filtros, privacidade, cobertura/origem.
- `deploy/test-indicators.cjs`: MySQL temporário com migrations, quatro áreas, sincronização demográfica, isolamento de branch, permissões CRUD, imutabilidade, conflitos e auditoria.
- `frontend/scripts/verify-indicators.cjs`: APIs sintéticas; áreas, 1440/1024/390 px, filtros, textos obrigatórios, várias telas/ordem, salvar/reabrir, apresentar/imprimir, sem recarga repetitiva.
- Padrão compartilhado de telas, build/TypeScript e suíte backend completa na publicação.
