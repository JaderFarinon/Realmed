# Registro de alterações — 09/11/2026

Registro para preparar o resumo da equipe. Descreve o resultado final, agrupando ajustes que se sobrepõem. Atualizar a situação da publicação somente após verificar o servidor.

## Permissões e entrada no sistema

- Corrigida a validação de Tratamentos que interceptava indevidamente rotas do Estoque e negava acesso a usuários com permissões de estoque corretamente cadastradas.
- Login, endereço inicial, logo e retorno da tela Sem Permissão levam à primeira tela autorizada. Contas sem módulos disponíveis entram em Meu Perfil. Acesso negado a links diretos preserva a sessão.
- Matriz de permissões organizada por módulo, com pesquisa de funções e filtro de módulo.
- Atalhos por módulo: Habilitar tudo, Sem excluir, Só visualizar e Limpar; opção Todas por função. Atalhos afetam as funções exibidas.
- Visualizar continua sendo requisito para criar, editar ou excluir. Excluir/inativar permanece independente das demais ações. Nenhuma permissão é concedida automaticamente.
- Setor ativo obrigatório para permitir criar requisições/retiradas, com validação na interface e na transação do servidor. Botão Salvar permanece acessível no rodapé do modal.

## Alertas do sistema

- Mensagens transitórias padronizadas no canto superior direito, com destaque, ícone e botão de fechar; desaparecem após cinco segundos.
- Sucesso verde, informação azul, aviso amarelo e erro vermelho. Até quatro avisos simultâneos, sem repetir mensagem/tipo enquanto visível, sem persistir mensagens ou roubar foco.
- Aplicado aos fluxos de usuários, permissões, perfil, tratamentos, avaliação, documentos, faturamento, cadastros, estoque, pacientes, integração e modo fisioterapeuta.
- Confirmações e formulários continuam em modais; contexto permanente, editor atual e validações com links continuam na tela. Etapa finalizada avisa apenas ao tentar interagir com campo bloqueado.

## Dashboard de tratamentos

- Barras e indicadores sempre abrem Gestão de Tratamentos em Todos com filtro de estágio, inclusive Faturar e Liberação Parcial.
- Retirar o filtro mantém Todos; recarregar preserva a seleção. Abas operacionais continuam disponíveis para seleção manual.
- O destino do gráfico independe da existência de uma aba operacional correspondente ao estágio.

## Informações das filas

- Ícones de informação da Gestão de Tratamentos exibem descrição em alerta azul flutuante no canto superior direito por dez segundos, com o nome da fila consultada.
- Removida a descrição abaixo das abas. Consultar informações não muda a fila selecionada nem os filtros; ativação funciona por clique e teclado.
- A barra de tempo acompanha dez segundos; demais alertas continuam com cinco segundos. Ajuste publicado na release `20261109-152643`.
- Validação: onze descrições, identificação da fila, ativação por teclado, fechamento manual, deduplicação, duração real de dez segundos e preservação dos cinco segundos das outras mensagens; layout no celular.

## Validações

- Build de produção e verificação TypeScript aprovados.
- Suíte completa do backend: 164 testes aprovados localmente e no servidor.
- Testes de interface: todos os estágios do gráfico e indicadores; remoção de filtro, recarga e seleção manual de Faturar; matriz de permissões; entrada de conta somente de estoque; alertas e duração real; telas em desktop e celular.
- Padrão compartilhado das listagens e fluxo sequencial do tratamento aprovados.
- Integração em banco isolado: permissões de estoque, criação/edição permitidas, exclusão/inativação negadas, setor, revogação imediata e isolamento de módulos; faturamento por guia e suas permissões.

## Navegação entre telas

- Removidos botões/links de Voltar do tratamento, detalhe do paciente, cadastros de procedimentos/códigos, Sem Permissão e página não encontrada. Retorno/avanço usam os botões do navegador.
- Cancelamento da confirmação da avaliação usa Cancelar; alternância da lixeira usa Ver tratamentos ativos; rolagem usa Ir ao topo. Preservadas ações locais e proteções de rascunhos/reservas.
- Verificados retorno/avanço do navegador entre lista e detalhe do paciente, ausência de controles de retorno em cadastros/Sem Permissão/404, build/TypeScript e fluxo sequencial do tratamento.
- Ajuste publicado na release `20261109-153438`. Verificação geral do padrão das telas aprovada; site e API conferidos após a ativação.

## Aproveitamento de telas menores

- Filtros das listagens recolhidos por padrão, com seta para abrir/fechar, mantendo os valores preenchidos.
- Abas da Gestão de Tratamentos e indicadores dos filtros aplicados sempre disponíveis fora do recolhimento.
- Títulos de listagem menores e menos espaçamento em telas baixas. Detalhe do paciente mantém identificação destacada.
- Tabela aproveita a altura disponível em tablets em paisagem; quantidade de linhas é calculada pelo tamanho real. Filtros expandidos permitem rolagem sem cortar campos.
- Verificação com dados fictícios: três tratamentos visíveis em 1280×600, 1024×600 e 800×600; quatro em 1024×650; paginação dentro da tela e sem linhas cortadas. Abrir/recolher filtros preserva os valores e a visibilidade das abas; celular conferido.
- Padrão compartilhado das listagens, links do dashboard, troca manual de fila e alertas das onze abas aprovados após a reorganização.
- Release `20261109-154430` publicada e conferida no site/API. A demora do gateway e o limite de I/O foram contornados sem ativar a instalação incompleta.
- Diagnóstico operacional: limitação de I/O do contêiner bloqueou instalação e cópia de dependências, com disco ainda disponível. Retomada preparada para referenciar a instalação anterior somente após comparar os manifests e encerrar a cópia; testes completos e proteção de saúde/rollback preservados. Destinos de dependências vinculados devem ser mantidos, conforme deploy/README.md.
- Retomada concluída: dependências vinculadas à release `20261109-153438` após igualdade exata dos manifests e encerramento do processo de cópia. Os 164 testes do backend passaram na retomada; nenhuma migration pendente. Preservar o destino do vínculo enquanto utilizado.
- Conferência pós-publicação aprovada nas seis resoluções, usando os assets reais do site e respostas de API fictícias no navegador de teste; filtros recolhidos, abas visíveis, valores preservados e paginação sem cortes. Saúde real da API também conferida.

## Fila Faturar após alterações no tratamento

- Corrigida divergência entre abas internas e filas externas: Faturar exige etapas anteriores concluídas e documentos obrigatórios atuais/adequados.
- Reabrir etapas/avaliação ou remover/inadequar documento obrigatório retira o ciclo da fila, dos contadores e do gráfico. Reposição sem concluir etapas não libera o faturamento.
- Tratamento retorna à etapa operacional pendente, mesmo com status clínico antigo de concluído; filas de Avaliação/Central compartilham o cálculo do dashboard.
- Faturamentos já registrados, histórico, anexos opcionais e dispensas das continuidades preservados. Motivo do bloqueio disponível no formulário por guia.
- Testes MySQL isolados reproduzem exclusão e restauração e conferem concordância entre filas, resumo, gráfico e elegibilidade por guia. Publicado na release `20261109-165042`; 164 testes do backend aprovados, build/TypeScript e verificações de interface aprovados.
- Publicação otimizada para reutilizar dependências idênticas e manter log/status no servidor, sem dispensar testes e saúde/rollback.

## Novo Tratamento — botão único

- Removido Salvar tratamento duplicado do cabeçalho; mantida uma única ação ao final do formulário, bloqueada durante importação/gravação.
- Publicado na release `20261109-170041`; build/TypeScript, padrão compartilhado das telas e 164 testes de backend aprovados. Site/API conferidos.

## Identificação unificada do tratamento

- Resumo Tratamento e Dados do Paciente removidos como cards separados. Informações reunidas no card fixo do nome, sem repetir identificação, convênio ou fisioterapeuta.
- Sessões solicitadas, autorizadas, realizadas e restantes visíveis no card. Médico, início previsto, prioridade, situação clínica, atualização do Stenci e controles existentes em Mais informações dentro dele.
- Aviso de quem está editando integrado ao mesmo card, permanecendo visível. Nome continua destacado; detalhes extensos têm rolagem própria para preservar espaço em telas pequenas.
- Build/TypeScript, padrão compartilhado das telas, rascunho preservado, cartão fixo em tablet/celular e finalização/reabertura das etapas aprovados.
- Publicado na release `20261109-172033`; site e API conferidos, com 164 testes de backend aprovados.

## Finalização direta da Recepção

- Finalizar etapa disponível na Recepção sem precisar clicar antes em Editar aba, mantendo a confirmação.
- Confirmação obtém a reserva exclusiva e recarrega os dados atuais antes de concluir. Não regrava a data quando o usuário apenas confere os dados salvos.
- Permissões, conflito com outro editor, validações, leitura após concluir e necessidade de editar para reabrir preservados.
- Verificação de interface aprovada para conclusão, cancelamento, concorrência, acesso somente leitura e rejeição pela API; TypeScript, padrão compartilhado e etapas sequenciais aprovados. Interface publicada também conferida com APIs simuladas, sem alterar dados reais.
- Publicado na release `20261109-173633`, com 164 testes de backend aprovados, asset `index-NgvZ-4VG.js` confirmado e API saudável. Logs: `.deployment/reception-finalize-publish.log` e `.deployment/reception-finalize-production-qa.log`.

## Rascunho automático da avaliação

- Salvamento automático a cada minuto, somente com alterações na avaliação ativa, em edição e não concluída. Mantido o botão Salvar rascunho.
- Permite continuar preenchendo durante o salvamento, preserva foco e alterações feitas depois do envio. Impede gravações sobrepostas e mantém a confirmação manual de conclusão.
- Falhas mostram alerta e preservam o rascunho na tela. Sem armazenamento clínico no navegador; permissões e reserva de edição continuam obrigatórias.
- Teste de interface com tempo acelerado aprovado: intervalo completo de um minuto, leitor/rascunho limpo sem gravação, concorrência de requisições, digitação durante envio, falha e recuperação manual. TypeScript, padrão de telas e etapas sequenciais aprovados.
- Publicado na release `20261109-174634`, com 164 testes do backend aprovados, asset `index-D6rGyblj.js` confirmado e API saudável. Teste da interface publicada aprovado com APIs simuladas, sem gravar dados reais. Logs: `.deployment/evaluation-autosave-publish.log` e `.deployment/evaluation-autosave-production-qa.log`.

## Histórico de publicações

- Rascunho automático da avaliação publicado: `20261109-174634`; site/API e salvamento periódico conferidos. Log do servidor: `/qyvia/realmed/shared/publication-20261109-174634.log`.

- Finalização direta da Recepção publicada: `20261109-173633`; testes e site/API conferidos. Log do servidor: `/qyvia/realmed/shared/publication-20261109-173633.log`.

- Card único de identificação publicado: `20261109-172033`; assets `index-DwJoZEmS.js` / `index-C173IWNQ.css` confirmados e API saudável. Log técnico: `.deployment/unified-header-publish.log` e `/qyvia/realmed/shared/publication-20261109-172033.log`.

- Botão único em Novo Tratamento publicado: `20261109-170041`; asset `index-Da7oH-nD.js` confirmado, API saudável. Log técnico: `.deployment/new-treatment-save-publish.log` e `/qyvia/realmed/shared/publication-20261109-170041.log`.

- Correção das filas após reabrir/excluir requisitos publicada: `20261109-165042`; site confirmado com `index-B6OyR9uO.js` e API saudável. Publicação reutilizou dependências idênticas com suíte completa e log persistente; log técnico local `.deployment/billing-stage-publish.log`, servidor `/qyvia/realmed/shared/publication-20261109-165042.log` e `.status`.

- Listagens compactas publicadas: `20261109-154430`; assets `index-Burswahm.js` / `index-BZXcC4aB.css` confirmados no site; API saudável. Log técnico local: `.deployment/compact-lists-link-publish.log`; servidor: `/qyvia/realmed/shared/publication-20261109-154430-link.log` e `.status` (sucesso).

- Remoção de controles de retorno publicada: `20261109-153438`; assets `index-ChSBOn8N.js` / `index-CC6i405L.css` confirmados no site; API respondeu `{"status":"ok"}`. Log técnico: `.deployment/browser-navigation-publish.log`.

- Atualização de informações das filas publicada: `20261109-152643`; site confirmado com `index-DH0g6LXV.js` / `index-BLEd5pqK.css` e API saudável. Verificações de interface e padrão de telas aprovadas; 164 testes do backend aprovados no servidor. Log técnico local: `.deployment/queue-help-publish.log`.

- Release ativada: `20261109-151531`.
- Site verificado com os assets da nova versão (`index-DNpHzQ2r.js` e `index-C63LAd9w.css`); API respondeu `{"status":"ok"}`.
- Primeira tentativa interrompida na autenticação SSH; retomada após o usuário abrir o Pageant. Ativação concluída com execução independente da conexão e log no servidor em `/qyvia/realmed/shared/publication-20261109-151531.log`.
