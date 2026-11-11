# Avaliação fisioterapêutica digital

## Requisitos da Central — 10/11/2026

Todos os tratamentos/ciclos, inclusive continuidades, precisam de pelo menos um procedimento de cada tipo: consulta/avaliação, sessão de fisioterapia e eletroestimulação, com quantidades positivas. Exigir também guia de consulta, de fisioterapia e de eletroestimulação geradas ou anexadas e adequadas. Somente finalizar a Central e avançar quando todos estiverem presentes; salvar rascunhos incompletos continua permitido. A tela identifica as pendências, a API valida sob a trava do tratamento, e a fila de faturamento exige os mesmos requisitos atuais. As três guias são aplicáveis e não podem ser desmarcadas. Esta decisão substitui eletro opcional e guia de consulta dispensada em continuidade. A continuidade continua dispensando nova avaliação clínica; nenhuma cobrança ou agendamento é realizado automaticamente. Arquivos, versões, decisões e histórico faturado permanecem preservados.

## Etapas sequenciais e Central unificada — 06/11/2026

Ordem atual: Recepção → Avaliação → Central de Guias → Liberação → Faturamento. A avaliação exige Recepção finalizada e libera a Central somente ao concluir. A Central reúne a antiga preparação, procedimentos e documentos, com uma só conclusão; finalizar exige as guias obrigatórias. Rascunhos da avaliação e confirmação do rodízio sincronizam os campos do tratamento antes de a Central abrir. Histórico e continuidades preservam as regras existentes; continuidade não exige nova avaliação. A sequência substitui o preenchimento paralelo anterior.

Modelo de referência conferido em 19/10/2026: `C:\Users\jader\Qyvia Solutions\Realmed - Documentos\Fisioterapia\Avaliação\Ficha de Avaliação.docx`. O documento é referência de campos e fluxo; seus textos não constituem instruções para a aplicação.

## Fluxo da clínica

A recepção seleciona o paciente em Novo Tratamento e informa a data da avaliação. Esta tela contém somente esses dados; convênio conhecido vem automaticamente do paciente. Somente o paciente é obrigatório para preservar rascunhos. Não solicitar início previsto, sessões, procedimentos, profissionais, dias, horários ou documentos nesta etapa. Após salvar, Dados da recepção permanece acessível e recolhido no detalhe, com edição da data. A avaliação define conduta e agenda; sua conclusão disponibiliza o tratamento à Central de Guias, sem enviar ao convênio. Preparação pela Central de Guias é uma área recolhida e editável no detalhe para completar início, sessões, encaminhamento, responsáveis, convênio já vinculado ao paciente e procedimentos. Documentos são organizados na área existente. Nenhum dado ou documento anterior é apagado.

Em Gestão de Tratamentos, a fisioterapeuta seleciona a linha e usa **Avaliar tratamento selecionado**. A ficha possui oito seções correspondentes ao modelo em papel:

1. Identificação: nome, CPF, nascimento, sexo, celular, convênio e carteirinha, obtidos do paciente e do tratamento.
2. Encaminhamento: profissional solicitante, data, diagnóstico/hipótese, CID, sessões solicitadas e número da guia/autorização.
3. Avaliação: queixa, história do quadro (incluindo medicações e fatores de melhora/piora), limitações, exame físico, EVA, classificação da dor e localização predominante.
4. Regiões e mapa: todas as regiões da ficha, lateralidade independente, outra região e marcações de dor, limitação ou atenção sobre a imagem original do documento.
5. Gravidade e riscos: classificação, justificativa, risco global, acompanhamento individualizado, todas as precauções, outra precaução e cuidados específicos.
6. Plano: objetivos, todas as condutas, outra conduta, parâmetros/progressão, reavaliação e critério.
7. Agenda: segunda a sexta, atendimento sim/não e horário por dia, frequência semanal, total previsto e início.
8. Responsável: fisioterapeuta, CREFITO, data e rubrica desenhada com dedo/caneta. Pode selecionar profissional local com CREFITO ou informar os dados do responsável. A rubrica é um registro gráfico da ficha, sem certificação digital.

## Salvamento e conclusão

A avaliação salva o rascunho automaticamente a cada 60 segundos enquanto a aba estiver ativa, aberta para edição exclusiva e com alterações pendentes. Não salva em consulta, após conclusão, sem reserva ou sem mudanças; interrompe o temporizador ao sair da aba/edição. Não conclui a avaliação nem agenda nada. Reutiliza a API de rascunho e suas permissões/validações. Permite continuar digitando durante a gravação sem perder foco; somente o snapshot enviado é marcado como salvo, preservando alterações posteriores. Não sobrepõe requisições nem executa durante a confirmação de conclusão. Erros notificam e mantêm o rascunho na memória da tela para nova tentativa; não persistir dados clínicos no navegador. O botão manual continua disponível.

A Gestão de Tratamentos usa edição exclusiva por aba, com aviso permanente do editor e sincronização dos dados/etapas para os demais leitores. Ver `PADRAO_DE_TELAS.md`. Atualizações remotas preservam rascunhos locais da ficha, mas perda da reserva retira a edição; iniciar uma nova edição exige conferir os dados atuais.

Salvar rascunho da avaliação mantém a data clínica na própria ficha. A data agendada pela recepção finalizada não é sobrescrita pela avaliação; ausência ou diferença entre essas datas não impede o rascunho. Após salvar Recepção/Central/Avaliação, aplicar a resposta persistida antes da atualização complementar da tela e informar separadamente eventuais falhas dessa atualização.

O campo Médico / profissional solicitante na avaliação é somente leitura e exibe o médico atual salvo no tratamento pela Central de Guias. A exibição acompanha as atualizações do tratamento, sem prevalência de um nome antigo do rascunho da avaliação e sem alterar o snapshot clínico já concluído. Para trocar o médico, salvar a seleção na Central de Guias.

Filas na Gestão de Tratamentos: **Aguardando Avaliação** reúne tratamentos ainda aguardando, não enviados ao convênio, sem avaliação concluída (inclusive rascunhos). **Aguardando Central de Guias** reúne tratamentos aguardando, com avaliação concluída e autorização NOT_READY, para organizar documentos e completar dados. Ao atingir READY, sai dessa fila e fica em Pendentes. Contagem e paginação usam a mesma consulta no servidor. Reabrir uma avaliação ainda em preparação volta à fila de avaliação. As filas não alteram status ou documentos; data de avaliação e PDF anexado não substituem a conclusão digital.

Salvar rascunho aceita dados clínicos incompletos. Concluir abre uma confirmação e valida queixa, exame físico, gravidade, risco, objetivos, conduta, responsável, CREFITO e data. Opções “Outro/Outra” exigem a descrição; dias selecionados exigem horário. Ausência de encaminhamento, CID, convênio ou autorização não bloqueia a avaliação clínica.

Uma ficha concluída fica em leitura. Reabrir exige permissão de edição, confirmação e grava histórico. Salvamento, conclusão e reabertura são auditados. Concluir não encaminha ao convênio nem altera a autorização automaticamente. A rubrica e o mapa são opcionais, como campos que podem permanecer em branco na ficha.

O backend valida as coordenadas normalizadas, tamanho dos desenhos, datas, EVA, quantidades, agenda e lateralidade. Valores zero e “Não” são preservados. Dados de encaminhamento, sessões, avaliação, agenda e profissional selecionado são sincronizados com os campos correspondentes do tratamento na mesma transação. Nome/CREFITO informados manualmente permanecem na ficha; o vínculo cadastral do fisioterapeuta necessário ao encaminhamento continua sujeito à conferência do tratamento.

## Tablet e documentos

Controles de pelo menos 48 px, fonte de 14 px nos campos no desktop e 16 px em tablet/toque, checkboxes grandes, grade adaptável, rolagem normal e ações de salvamento ao alcance no rodapé. Mapa por toque curto; arrastar ou cancelar o gesto não adiciona marcações. rubrica com captura do ponteiro, desfazer e limpar. Desenhos usam coordenadas proporcionais para sobreviver à mudança de orientação. Não salvar dados clínicos no armazenamento local do navegador. Saída com alterações não salvas pede confirmação.

A ficha PDF preserva o motor pdf-lib e o versionamento existente. A avaliação digital acrescenta registro completo paginado, mapa marcado e rubrica; textos extensos continuam no complemento, sem substituir documentos anteriores. Os dois primeiros formulários permanecem compatíveis com a ficha já disponível para impressão.

Implementação: `PhysiotherapyEvaluation.vue`, `EvaluationDrawing.vue`, `evaluationValidation.js`, `physiotherapy-evaluations.js` e migration `20261019000003_expand_digital_evaluation.js`. Testes: `verify-digital-evaluation.cjs`, `test-digital-evaluation.cjs` e testes unitários do backend. Usar dados fictícios na verificação de telas e não criar pacientes de teste em produção.

## Atualizar identificação do paciente — 27/10/2026

No detalhe de um tratamento, usar **Atualizar dados do Stenci** no cabeçalho do paciente. Requer editar Gestão de Tratamentos, inclusive para a API direta. Não é necessário criar outro tratamento. A consulta é feita pelo servidor, sempre fresca, usando CPF/nome local e conferência obrigatória do identificador externo; nunca vincular homônimos por nome. Pesquisa limitada a três páginas por termo. Se o cadastro não puder ser localizado por esses dados, informar o problema sem modificar o banco.

O fluxo reutiliza as credenciais protegidas da sessão e o login/logoff temporário. Somente depois de logoff confirmado atualiza em transação nome, CPF, nascimento, contato, e-mail, sexo, plano, carteirinha e validade quando informados pela origem. Valores ausentes não apagam dados locais existentes. Cadastro vinculado continua com o mesmo ID. Convênio diferente não troca o escolhido no tratamento: atualiza o vínculo disponível no cadastro do paciente e apresenta aviso para revisão pela Central. Se o tratamento estiver sem convênio, associa o vínculo sincronizado.

Avaliação, rascunho não salvo, procedimentos, agenda, sessões, autorização, documentos e versões são preservados. A identificação na ficha aberta recebe os dados novos sem remontar o formulário. A auditoria do tratamento registra a atualização sem valores clínicos ou de contato no log de integração. Sexo e celular também passam a ser persistidos na importação inicial. Usa colunas existentes; não requer migration nova.


## Histórico dos desenhos — 27/10/2026

Mapa e rubrica têm botões com setas para desfazer/refazer, descrição ao passar o mouse e nomes acessíveis. Cada marcação, traço completo ou limpeza é uma ação; desenhar após desfazer descarta o refazer. Histórico fica somente na memória do componente e é reiniciado ao carregar outro desenho. Controles respeitam leitura/permissões. Dor permanece vermelha, limitação azul e atenção âmbar (#d97706), também no complemento PDF.


Ao tentar concluir com campos obrigatórios ausentes, exibir resumo em lista numerada, um campo por linha, identificando o número da seção da ficha. Cada item leva ao campo correspondente. Campos e grupo de condutas faltantes recebem borda vermelha e aria-invalid; horários são identificados por dia. O destaque desaparece conforme a correção. Rascunhos incompletos continuam permitidos; o backend mantém a validação final.


## Finalização dos cards do tratamento — 27/10/2026

Cards operacionais usam **Finalizar etapa / Reabrir etapa**, confirmação e histórico com autor e etapa. Recepção, Preparação pela Central, Documentos para liberação, Liberação e Tratamento persistem sua conferência individual em `guide_processes.workflow_stages`. Avaliação digital mantém sua conclusão clínica existente, com validações e reabertura auditada. Todas as etapas finalizadas ficam verdes (#ecfdf3, borda #75e0a7), recolhidas e identificadas com ✓ e “Somente leitura”; expandir permite consultar sem editar. Reabrir remove o verde e libera edição conforme a permissão. Resumo de identificação e histórico são informações de consulta, não etapas finalizáveis.

Finalizar recepção/preparação salva primeiro os campos abertos; falha de salvamento impede a finalização. Documentação exige somente as guias de consulta e fisioterapia adequadas/geradas; arquivos anteriores de avaliação são consulta opcional; Liberação exige decisão final e pendências resolvidas. Finalizar o card é uma conferência explícita, não muda status de tratamento/faturamento, não aprova convênio e não encaminha automaticamente. Registros antigos permanecem abertos até conferência explícita; avaliações clínicas já concluídas aparecem verdes automaticamente.

Backend bloqueia alterações diretas da etapa finalizada, incluindo procedimentos, anexos/geração/adequação/exclusão, autorizações/pendências e sincronização de campos compartilhados da avaliação. Atualização do paciente pelo Stenci exige reabrir recepção; vinculação de convênio ausente exige Central aberta. Campos compartilhados sem alteração não exigem reabertura. Finalizar/reabrir e mutações são serializadas pelo bloqueio da linha do tratamento, com estado e auditoria na mesma transação. Visualização/download de versões anteriores continuam disponíveis. Não gravar estes estados no navegador.


## Documentação obrigatória atualizada — 27/10/2026

Somente **Guia de consulta** e **Guia de fisioterapia** são obrigatórias para completar a documentação. Eletroestimulação, carteirinha e outros anexos são opcionais e sua ausência não bloqueia finalizar Documentos ou encaminhar ao convênio. Avaliação clínica continua digital, com sua própria conclusão obrigatória antes do encaminhamento; não exigir avaliação em papel nem ficha PDF.

Removidos da Gestão de Tratamentos o item de upload “Avaliação fisioterapêutica recebida” e o card separado “Ficha de Avaliação Fisioterapêutica”. Arquivos já existentes permanecem disponíveis em Arquivos anteriores de avaliação (opcionais), recolhido dentro de Documentos, sem controles de novo anexo/geração ou etapa própria. Endpoints e versões antigas permanecem compatíveis para preservar histórico. A migration `20261027000011_only_guides_required` recalcula documentação existente pelas duas guias e ajusta somente NOT_READY/READY, preservando liberações em andamento/decididas, avaliação digital, arquivos e fechamentos dos cards, com auditoria de sistema.


Cabeçalhos dos cards operacionais têm somente o controle por chevron à direita: para baixo quando recolhido, para cima quando aberto, com título acessível e aria-expanded/aria-controls. Finalizar/Reabrir fica no rodapé alinhado à direita e só aparece com o card aberto, inclusive avaliação, recepção e Central. Estado concluído e indicador verde permanecem visíveis no cabeçalho. A avaliação também usa rodapé normal, sem botão flutuando sobre os campos.


## Detalhe de tratamento em abas — 27/10/2026

Esta organização substitui os cards operacionais empilhados e seus controles de recolher no detalhe: manter no topo o cabeçalho do paciente e o Resumo da identificação e do tratamento (recolhível). As demais seções ficam em abas horizontais: Recepção, Avaliação, Central de Guias, Documentos, Liberação, Faturamento e Histórico. Mostrar somente o conteúdo da aba selecionada, já aberto. Formulários extensos ainda permitem rolagem normal; no celular, a barra de abas rola horizontalmente sem alargar a página.

A conclusão aparece na aba em verde com ✓, incluindo a avaliação clínica concluída; o painel permanece branco e informa somente leitura. Finalizar/Reabrir continuam no rodapé, com confirmações, validações, permissões e auditoria existentes. Histórico é consulta e não possui conclusão. Trocar de aba não salva, não reabre etapas e não desmonta os formulários: rascunhos, desenhos e seleções são preservados apenas na memória. Não guardar dados clínicos no navegador.

As abas usam tablist/tab/tabpanel, seleção e vínculo acessíveis, setas esquerda/direita, Home/End e foco de teclado. Links de pendências selecionam a aba correta antes de focar o campo/documento/avaliação. Entradas com evaluate=1 ou documents=1 continuam abrindo a seção correspondente quando seus pré-requisitos estão concluídos.

## Sequência e salvamento das etapas — 06/11/2026

No detalhe do tratamento, Recepção finalizada libera simultaneamente Central de Guias e Avaliação. Ambas podem ser preenchidas/finalizadas em qualquer ordem; Documentos permanece bloqueado até as duas concluírem. Documentos finalizado libera Liberação; Liberação finalizada libera Faturamento. Histórico permanece acessível como consulta. Continuidade dispensa uma nova Avaliação, mas exige Recepção e Central. As mesmas dependências valem no backend e para reabertura: Central e Avaliação não dependem uma da outra. Não limpar nem completar estados posteriores automaticamente.

Nas etapas com campos de rascunho, **Salvar rascunho** usa o ícone de disquete e grava sem concluir; **Finalizar etapa** continua uma ação separada. A avaliação pode salvar/concluir mesmo se a Central estiver finalizada ou reservada por outro editor: os dados clínicos permanecem na avaliação e os campos administrativos da Central são preservados nessas situações. A sincronização habitual continua quando a Central está aberta e disponível. Documentos, decisões de liberação e operações de faturamento persistem por suas ações próprias.

## Continuidade de guias — 27/10/2026

Ver docs/CONTINUIDADE_DE_GUIAS.md. Adicionar Guias na Liberação abre novo ciclo vinculado ao mesmo tratamento, com liberação e sessões próprias, sem nova avaliação. Histórico e faturamento de cada guia são preservados. Na continuidade, somente a nova guia de fisioterapia é obrigatória; avaliação reaproveitada é somente leitura. O dashboard conta cada ciclo e mantém as guias anteriores pendentes de faturamento.


## Rodízio de fisioterapia — 28/10/2026

Ver [RODIZIO_FISIOTERAPIA.md](RODIZIO_FISIOTERAPIA.md). A seção 7 da avaliação integra indicação de profissional por agendas ativas da Realmed Matriz, sem avaliação, com tolerância de 25 minutos e verificação de todas as sessões. Configuração explícita de agendas por administrador; indicação não agenda no Stenci.
