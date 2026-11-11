# Códigos e de/para de procedimentos

Implementado em 19/10/2026. A clínica cadastra e aprova as alternativas; o sistema não deduz equivalência clínica, remuneração ou autorização do convênio.

## Cadastro dentro do convênio

Correção de 10/11/2026: a aba Procedimentos carrega ao montar o editor já aberto e acompanha o identificador local do convênio. Exibe carregamento e diferencia lista sem vínculos de falha na consulta; atualizar descarta seleção/dados antigos, e respostas atrasadas não substituem a consulta atual. Não associa automaticamente o catálogo geral ao convênio: a Central pode oferecer procedimentos gerais, enquanto esta aba lista somente os vínculos desse convênio, inclusive inativos.

Na mesma aba, **Vincular procedimentos do catálogo geral** abre a lista dos códigos ativos ainda não vinculados, com pesquisa e seleção múltipla. Confirmar vincula somente os itens escolhidos ao convênio aberto, reutilizando o procedimento existente e sua descrição geral. Não duplica códigos, não reativa/sobrescreve vínculos existentes e não copia nem altera regras de substituição. A descrição do vínculo pode ser ajustada depois no convênio. Ação exige visualizar Convênios e criar/visualizar Procedimentos. `POST /insurance-providers/:id/procedures/link` recebe `procedure_ids`, valida até 1000 IDs e processa em transação com lock do convênio/procedimentos; seleção inválida/inativa cancela tudo e reenvio não duplica. Não altera tratamentos, documentos ou outros convênios.

Atualizado por solicitação do usuário em 19/10/2026. A entrada principal é **Cadastros → Convênios**. A lista consulta `/integrations/stenci/insurances`, a mesma fonte do Novo Tratamento, incluindo todos os tipos retornados. Configurações locais são associadas pelo identificador externo Stenci, sem vincular convênios apenas por nome. Se a consulta externa falhar, os registros locais permanecem disponíveis e a falha é informada.

1. Selecionar o convênio e usar **Editar convênio selecionado**. A janela reúne dados do convênio, médico assinante e **Procedimentos** em abas; abrir a aba Procedimentos para administrar os códigos e substituições.
2. Adicionar código, descrição, tipo e tabela. Informar, no mesmo formulário, os códigos que esse procedimento substitui, separados por vírgula ou linha.
3. Exemplo: no convênio A, cadastrar **1567** e informar **1234** em “Códigos que este procedimento substitui”. Ao ler 1234 em uma guia desse convênio, o destino sugerido será 1567. A configuração não se aplica automaticamente ao convênio B.
4. Código e descrição do destino, vínculo com o convênio e substituições são salvos em uma transação. Descrições e situação são independentes por convênio; o catálogo técnico compartilhado mantém código, tipo e tabela para os vínculos históricos. Alterar o código de um registro exige cadastrar o novo código.
5. Não permitir substituição do próprio código nem dois destinos ativos para a mesma origem no mesmo convênio pelo cadastro simplificado. Inativar um procedimento nesse convênio desativa suas substituições e preserva a lista para reativação. Não altera outros convênios.

Procedimentos e Códigos e de/para deixam de ser entradas avulsas do menu. Os cadastros anteriores permanecem em links dentro de Convênios: **Procedimentos gerais anteriores** e **Regras avançadas e gerais**, com URLs novas sob `/cadastros/convenios/` e aliases antigos preservados. Dados existentes não são apagados. Regras específicas antigas recebem vínculo ao respectivo convênio na migration.

A permissão **Convênios** permite consultar a fonte Stenci e as configurações locais; **Procedimentos** controla ver/criar/editar procedimentos e substituições. A recuperação de credenciais de quem só acessa convênios permite apenas `listInsurances`, sem liberar consultas de pacientes, planos ou profissionais. As sessões externas continuam temporárias, com logoff após consulta.

Regras avançadas preservam prioridade, vigência e tabela. Menor prioridade numérica tem preferência; regra do convênio prevalece sobre geral, depois tabela específica, depois prioridade. Apenas regras e destinos ativos, dentro da vigência, participam. Sem regra aplicável, permanece o original. Empate entre destinos bloqueia e pede revisão. A troca é direta, sem cadeias e sem deduzir equivalência clínica.

## Replicar procedimentos entre convênios

Em Cadastros → Convênios, usar **Replicar entre convênios** e selecionar a aba **Procedimentos**. A janela permite escolher um convênio de origem e até 100 destinos, com pesquisa, seleção dos resultados e limpeza da seleção. Após escolher a origem, a lista mostra código, descrição e situação de cada procedimento, com seleção individual e **Selecionar todos os procedimentos**. Nenhum item é selecionado automaticamente; trocar a origem limpa a seleção. A origem não pode ser destino. Convênios Stenci ainda sem configuração local são vinculados pelo identificador externo antes da cópia. A aba **Assinatura médica** conserva o fluxo separado de replicação da assinatura.

São copiados apenas os procedimentos selecionados da origem, suas descrições, situação ativa/inativa e regras específicas de substituição, incluindo prioridade, tabela, vigência e observações. Regras gerais sem vínculo não são replicadas. Procedimentos já vinculados ao destino são preservados integralmente e contabilizados como já cadastrados; repetir a operação não os duplica. Outros procedimentos do destino não são removidos. Um conflito de código de origem com outro substituto ativo cancela a transação inteira em todos os destinos e identifica o convênio/código. A janela apresenta quantidades copiadas e preservadas por destino. Alterações futuras na origem não se propagam automaticamente.

Backend exige acesso a Convênios, consulta e criação de Procedimentos. Endpoint `POST /insurance-providers/replicate-procedures`, corpo `source_id`, `destination_ids` e `procedure_ids`, com IDs locais e IDs do catálogo de procedimentos. A seleção é obrigatória e validada no servidor; todos os procedimentos devem pertencer à origem. Cópia usa transação e bloqueio dos convênios em ordem; nenhum PDF, tratamento ou documento original é alterado. Sem migration nova.

## Geração

Os modelos SADT e os modelos PDF personalizados usam a resolução de códigos no backend. Atualização de 10/11/2026: Gerar guia usa os procedimentos do tratamento, filtrados pelo tipo, mesmo quando há originais anexados. A unificada reúne somente os tipos selecionados. A conferência mostra origem, destino sugerido, regra e quantidade. OCR é exclusivo da ação **Ler original e ajustar códigos**, no documento recebido escolhido; a página lida pode ser alterada nessa conferência. Falha na leitura de um anexo não bloqueia a geração normal pelos procedimentos do tratamento. A prévia permite conferir o PDF; a geração exige confirmação explícita. O servidor recalcula as alternativas e rejeita alterações relevantes ocorridas depois da conferência.

O documento recebe arquivo e versão próprios. O histórico registra documento original e página quando aplicáveis, códigos de origem/destino, descrição e tabela utilizadas, regra e quantidades. Não substitui o original nem altera silenciosamente os procedimentos cadastrados no tratamento. Documentos antigos mantêm o PDF já produzido mesmo após mudanças no cadastro.

## Guia digitalizada

No documento recebido, clicar em **Ler original e ajustar códigos**. Escolher a página, conferir original/texto lido, selecionar procedimentos, informar quantidades e confirmar antes de gerar. A leitura funciona com PDF, JPG e PNG, até 10 MB. Processa uma página por vez; seleção de páginas de 1 a 20. PDFs protegidos ou corrompidos precisam ser reenviados sem proteção/corrigidos.

O OCR usa Tesseract em português/inglês no próprio servidor. PDFs também têm extração de texto nativo e rasterização com Poppler. Não há envio para serviços externos. A correspondência usa código cadastrado ou descrição/expressão de origem explicitamente cadastrada (mínimo de 12 caracteres normalizados); não há aproximação clínica. Descrições e códigos não reconhecidos ficam para conferência/inclusão manual. Números em caixas, manuscritos, baixa resolução, rotação e rasuras podem falhar; o OCR não garante leitura integral. Quantidades não são presumidas da imagem.

A conferência expira em 15 minutos e pertence ao usuário e tratamento. Exclusão/substituição do original, alteração do arquivo, convênio ou regras exige nova leitura. O texto completo não é persistido nem registrado no histórico/log. Temporários têm acesso restrito e são removidos ao terminar. Limites: duas leituras simultâneas, um thread por OCR, 1 GiB por processo Linux, tempos máximos de 5 s para texto, 15 s para rasterização e 30 s para OCR. A revisão não sobrevive ao reinício da API.

## Operação e validação

Migrations `20261019000001_create_procedure_code_rules.js` e `20261019000004_insurance_procedures.js`; preservam os cadastros existentes. A tabela `insurance_procedures` guarda descrição, situação e vínculos por convênio; as substituições usam o motor `procedure_code_rules` existente. Mudança de catálogo ou regra invalida a conferência de OCR anterior. Instalação privada do OCR com `sh deploy/setup-ocr.sh`: usa pacotes Ubuntu extraídos em `/qyvia/realmed/shared/ocr`, sem instalação global, atualizações ou reinícios de outros serviços. Poppler e `prlimit` já existem no servidor. `REALMED_TESSERACT`, `REALMED_PDFTOPPM` e `REALMED_PDFTOTEXT` permitem caminhos alternativos em desenvolvimento; no Linux o wrapper privado é detectado automaticamente.

Referência técnica do motor: [Tesseract — comandos](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html).

Verificar `npm test --prefix backend`, build frontend, `frontend/scripts/verify-screen-pattern.cjs`, `frontend/scripts/verify-procedure-codes.cjs` e `frontend/scripts/verify-sadt-generation.cjs`. QA usa dados fictícios e intercepta chamadas de escrita. A leitura real também deve ser testada no servidor com PDF fictício contendo somente imagem, além de códigos nativos e descrição cadastrada.

Teste específico: `deploy/test-insurance-procedures.cjs` em MySQL isolado e `frontend/scripts/verify-insurance-procedures.cjs` no navegador, além dos testes de geração e padrão de telas. Não cadastrar códigos fictícios em produção.
