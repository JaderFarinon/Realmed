# Alterações do Realmed — 10/11/2026

## Carregamento dos procedimentos do convênio

- Corrigido o carregamento inicial da aba Procedimentos no editor de convênios: o componente abria sem buscar os vínculos cadastrados.
- A consulta acompanha o convênio correto, mostra carregamento, diferencia ausência de vínculos de falha e permite atualizar/tentar novamente sem manter dados ou seleção antigos. Respostas atrasadas são descartadas.
- Preservadas as configurações, regras de substituição e distinção entre catálogo geral (disponível na Central) e procedimentos vinculados ao convênio. Nenhum vínculo é criado automaticamente.
- Falha reproduzida antes da correção com procedimentos já cadastrados. Depois, aprovados TypeScript, padrão compartilhado de telas e regressão no navegador: abertura inicial, ID local correto, atualização após salvar, alternância de abas/convênios, inativos, lista sem vínculos e falha/retentativa. APIs simuladas, sem modificar vínculos reais.
- A tentativa `20261110-110921` parou antes da ativação porque um teste HTTP de sessão Stenci presumiu que três requisições sempre chegariam dentro de 20 ms. Corrigida somente essa premissa de teste: continua verificando serialização, logoff completo e cache sem reautenticação; o agrupamento exato continua coberto pelo teste direto de lote. Código de autenticação de produção não alterado. Carregamento publicado em `20261110-112102`, com 166 testes aprovados, asset `index-B1JmDYte.js` confirmado e API saudável.
- Após esclarecimento de que os códigos estavam no catálogo geral, adicionada ação **Vincular procedimentos do catálogo geral**, com pesquisa e seleção múltipla dentro do convênio. Reutiliza códigos existentes, sem recadastrar, mudar regras ou sobrescrever configurações de outros convênios. Não vincula automaticamente itens não selecionados.
- Testes MySQL/API isolados aprovados para seleção, preservação do catálogo/regras/configuração local, repetição sem duplicação, rejeição transacional de IDs inválidos/inativos e permissões. Interface validada para seleção, cancelamento, falha/retentativa, atualização da lista e tablet/celular; padrão compartilhado de telas aprovado após aguardar fontes e redimensionamento da tabela na medição de teste.
- Vinculação publicada na release `20261110-113157`, com 166 testes aprovados, sem migrations pendentes, asset `index-o5C3T9tO.js` confirmado e API saudável. Fluxo reconferido na interface pública com APIs simuladas, sem criar vínculos fictícios em produção.
- Logs: `.deployment/insurance-procedure-loading-before.log`, `.deployment/insurance-procedure-loading-retry-publish.log`, `.deployment/link-catalog-db.log`, `.deployment/link-catalog-ui.log`, `.deployment/link-catalog-pattern.log`, `.deployment/link-catalog-publish.log` e `.deployment/link-catalog-production-qa.log`.

## Cadastro rápido de médico na Central

- Botão + ao lado do médico solicitante abre cadastro sem sair do tratamento: nome, CRM e UF obrigatórios, CBO opcional. O médico fica disponível no cadastro de Profissionais e selecionado no rascunho da Central.
- Dados já preenchidos são preservados. Salvar rascunho ou gerar guia grava a seleção no tratamento; cancelar/erro não trocam o médico. Cadastro respeita criação em Profissionais e edição exclusiva da etapa aberta.
- TypeScript, padrão compartilhado de telas e testes de criação/seleção, CRM duplicado, cancelamento, falha/retentativa e preservação do rascunho aprovados. Bloqueios validados para consulta, etapa finalizada, outro editor e ausência de criação em Profissionais; modal conferido em tablet e celular. Geração com salvamento prévio continua aprovada.
- Publicado na release `20261110-105710`, com 166 testes aprovados no servidor, sem migrations pendentes, asset `index-ro5Z9dIn.js` confirmado e API saudável. Os seis cenários foram reconferidos na interface pública com APIs simuladas, sem cadastrar médicos fictícios em produção.
- Logs técnicos: `.deployment/quick-doctor-publish.log`, `.deployment/quick-doctor-ui.log`, `.deployment/quick-doctor-production-qa.log` e `/qyvia/realmed/shared/publication-20261110-105710.log`.

## Identificação dos relatórios de faltas

- A lista principal identifica o relatório pelo tipo e data/hora de emissão, em vez de usar o nome de um paciente. Exibe também data de referência, início do histórico e total de pacientes.
- Abrir relatório mostra os pacientes para consulta, com pesquisa, histórico individual e impressão completa preservados. Critérios de inclusão e conteúdo impresso não foram alterados.
- Testes com dados fictícios aprovados para identificação, abertura, histórico, pesquisa, impressão de todas as páginas, telas menores e permissões independentes. TypeScript e padrão compartilhado de telas aprovados.
- Publicado na release `20261110-082623`, com 164 testes de backend aprovados, asset `index-BXaIMg_q.js` confirmado e API saudável. Interface publicada conferida com dados/API simulados, sem alterar pacientes reais.
- Logs técnicos: `.deployment/report-identification-publish.log`, `.deployment/report-identification-production-qa.log` e `/qyvia/realmed/shared/publication-20261110-082623.log`.

## Guias não aplicáveis ocultas

Regra posterior nesta mesma data: os três tipos passaram a ser obrigatórios/aplicáveis, conforme a seção seguinte. O filtro genérico permanece, mas as três guias obrigatórias não podem ser desmarcadas.

- Liberação e Faturamento exibem somente as guias aplicáveis ao ciclo. Eletroestimulação ausente na Central de Guias deixa de aparecer como Não aplicável; consulta dispensada em continuidade também fica oculta.
- Guias aplicáveis negadas/em recurso ou ainda sem elegibilidade para faturar continuam disponíveis. Nenhum registro, arquivo ou histórico é excluído e os critérios de conclusão permanecem iguais.
- TypeScript e testes de interface aprovados para tratamentos com/sem eletroestimulação, continuidade, fluxo de faturamento, etapas sequenciais e padrão compartilhado de telas.
- Publicado na release `20261110-085618`, com 164 testes de backend aprovados, asset `index-CkOd1hqB.js` confirmado e API saudável. Interface publicada conferida nos três cenários com APIs simuladas, sem alterar dados reais.
- Logs técnicos: `.deployment/applicable-guides-publish.log`, `.deployment/applicable-guides-production-qa.log` e `/qyvia/realmed/shared/publication-20261110-085618.log`.

## Procedimentos e documentos obrigatórios na Central

- Todos os tratamentos/ciclos exigem pelo menos um procedimento de consulta/avaliação, sessão de fisioterapia e eletroestimulação, com quantidade positiva, e as três guias adequadas, geradas ou anexadas. Substitui eletro opcional e consulta dispensada em continuidade; não exige nova avaliação clínica em continuidade.
- A Central mostra o que falta e bloqueia Finalizar etapa. Rascunhos incompletos continuam permitidos. API, avanço e fila de faturamento validam os mesmos requisitos, inclusive quando há marcadores antigos de conclusão.
- As três guias passam a ser aplicáveis, sem permitir desmarcar eletroestimulação. Não há geração, agendamento ou cobrança automáticos.
- Reconciliação auditada da documentação dos processos ativos, preservando decisões, etapas, arquivos e histórico já faturado.
- Aprovados: 166 testes do backend, validação em MySQL/API isolados de cada procedimento/documento ausente, fila SQL e elegibilidade, bloqueio por chamada direta, nove estados de liberação, migração idempotente/auditada e preservação de faturados. Interface validada com requisitos ausentes/completos, etapas sequenciais e padrão compartilhado.
- Publicado na release `20261110-091925`, com 166 testes aprovados no servidor, backup/migração aplicados, asset `index-DXvHoulj.js` confirmado e API saudável. Interface publicada conferida com os seis cenários e APIs simuladas, sem criar dados reais.
- Logs técnicos: `.deployment/required-guides-publish.log`, `.deployment/required-guides-database.log`, `.deployment/required-guides-production-qa.log` e `/qyvia/realmed/shared/publication-20261110-091925.log`.

## Dados preenchidos na geração de guias

- Geração individual, unificada e prévia salvam automaticamente as alterações pendentes da Central e recarregam os dados/modelos antes da conferência. Corrige a consulta de médico/datas antigos pelo gerador quando já estavam preenchidos na tela.
- Falha no salvamento interrompe a geração e mantém os campos; dados já salvos também são preservados se a atualização complementar falhar. Bloqueio de ações concorrentes durante a preparação.
- Mantidas as exigências reais de nome, CRM, registro e UF do médico no backend. Não finaliza a etapa nem altera autorizações/faturamento.
- Testes de interface aprovados para geração individual/unificada, prévia e falha/retentativa do salvamento. A tentativa `20261110-093334` não chegou a ativar uma release; correção publicada junto com a geração individual na release `20261110-094617` e reconferida na interface pública com APIs simuladas.

## Geração individual com anexos recebidos

- Gerar guia individual passa a usar os procedimentos cadastrados do tipo correspondente, mesmo com anexo recebido. Corrige o bloqueio causado pela tentativa automática de leitura do anexo, que não acontecia na geração unificada.
- Ler original e ajustar códigos permanece como ação explícita no anexo. Originais e versões anteriores são preservados, assim como a conferência, de/para por convênio e geração unificada.
- Aprovados: TypeScript, 166 testes de backend, padrão compartilhado de telas e regressão no navegador dos três tipos individuais (anexos PDF/imagem e nova versão), unificada, leitura explícita e geração após falha de leitura. Testes de interface usam APIs simuladas, sem modificar pacientes reais.
- Publicado na release `20261110-094617`, com 166 testes aprovados no servidor, sem migrations pendentes, asset `index-CNvnTDES.js` confirmado e API saudável. Interface pública reconferida para geração individual/unificada, leitura explícita e salvamento de médico/datas antes da geração.
- Logs técnicos: `.deployment/individual-guides-publish.log`, `.deployment/individual-guides-ui.log`, `.deployment/individual-guides-backend.log`, `.deployment/individual-guides-production-qa.log` e `/qyvia/realmed/shared/publication-20261110-094617.log`.
