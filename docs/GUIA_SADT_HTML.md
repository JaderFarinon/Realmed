# Reprodução da guia SP/SADT em HTML

## Geração individual sem leitura automática de anexos — 10/11/2026

Gerar uma guia individual usa os procedimentos cadastrados no tratamento, filtrados pelo tipo do card, assim como a geração unificada usa os tipos selecionados. A existência de um anexo recebido não inicia OCR nem impede a geração se esse arquivo não puder ser lido. A ação explícita **Ler original e ajustar códigos** continua abrindo a leitura/conferência do documento escolhido. Preservar originais, versões, resolução de códigos por convênio no servidor e confirmação de códigos/quantidades. Esta regra substitui a escolha automática de original recebido ao gerar uma guia.

## Dados atuais antes da geração — 10/11/2026

Gerar guia individual/unificada e pré-visualizar salvam antes o rascunho pendente da Central, com a permissão/reserva existentes, e recarregam dados/modelos antes de abrir a conferência. Assim médico, datas e convênio preenchidos na tela chegam ao gerador persistidos. Não concluir a etapa nem exigir todos os documentos para salvar/gerar parcialmente. Durante essa preparação, impedir ações concorrentes e alteração dos campos; falha interrompe a geração preservando o rascunho/valores já gravados e informa o erro. Manter validações reais do médico, CRM, registro e UF no backend; não inventar dados profissionais nem deixar passar cadastro incompleto.

## Geração separada e unificada — 06/11/2026

Esta decisão substitui a regra histórica de incluir/exigir eletroestimulação na guia de fisioterapia. Cada card gera apenas os procedimentos do seu tipo, inclusive em modelos personalizados e na conferência de originais. Fisioterapia não exige eletroestimulação.

Os cards de consulta, fisioterapia e eletroestimulação têm seleção por checkbox. Selecionar dois ou três exibe **Gerar guia unificada** abaixo dos cards. A ação usa o SADT padrão, abre a conferência dos procedimentos cadastrados no tratamento e aplica o de/para por convênio no servidor. Exige procedimentos de todos os tipos marcados e confirmação de códigos/quantidades. Limite de cinco linhas, sem truncar excedentes. Carteirinha e outros anexos não são selecionáveis.

A guia unificada é um único PDF associado a cada tipo selecionado por registros de documento com versões próprias, em uma transação sob lock do tratamento. O histórico registra tipos, IDs associados e procedimentos. Remover um vínculo de card é exclusão lógica e não apaga o arquivo dos demais. Originais, PDFs anteriores, autorização e faturamento são preservados; gerar não libera nem fatura o tratamento.

Modelo criado e integrado em 19/10/2026 a partir de `docs/Guia de SADT.pdf`, igual ao arquivo fornecido pelo usuário. A referência contém 12 páginas: formulário na primeira, legenda e regras de preenchimento nas outras 11. A reprodução contempla a página do formulário, com os 68 campos e seus espaços originais.

## Arquivos

- `backend/templates/sadt/guia-sadt.html`: documento HTML autossuficiente, sem chamadas externas, com fontes WOFF incorporadas, texto real e linhas/caixas em CSS. Não utiliza captura de tela, imagem de fundo, iframe ou PDF embutido.
- `backend/templates/sadt/guia-sadt.fields.json`: rótulos dos 68 campos, centros das células para números/datas e área reservada ao logo, em pontos do PDF.
- `backend/templates/sadt/guia-sadt-base.pdf`: formulário compilado do HTML e distribuído junto ao backend. O hash do HTML fica no assunto do PDF e é verificado nos testes para impedir distribuição de um fundo desatualizado.
- `backend/services/sadtTemplateService.js`: modelos padrão e mapas de preenchimento para consulta, fisioterapia e eletroestimulação.
- `output/pdf/guia-sadt-reproduzida.pdf`: prévia de conferência gerada a partir do HTML, com uma página de 841,92 × 595,32 pt, correspondente ao A4 horizontal da referência.
- `backend/scripts/build-sadt-html.py`: reconstrói o HTML e o mapa a partir da referência.
- `backend/scripts/render-sadt-html.cjs`: gera a prévia PDF com Chromium/Playwright e normaliza o tamanho da página com o `pdf-lib` existente.

## Fidelidade e escolhas

Caixas, faixas cinzas, rótulos, subdivisões de caracteres, cinco linhas de procedimentos solicitados, cinco de execução, quatro de profissionais executantes e dez registros de sessões preservam o desenho do formulário. As fontes incorporadas da referência são reaproveitadas para os rótulos, com cmap Unicode reconstruído para uso pelo navegador.

O desenho interno usa escala 16:1 e é reduzido por transformação CSS para o tamanho físico original. Isso evita que o arredondamento do Chromium a pixels CSS engrosse os traços pequenos. Os textos mantêm as posições de cada caractere e as linhas de base do PDF. Não alterar a escala ou os estilos de impressão sem comparar novamente a renderização.

Foram excluídos elementos de exemplo/editoriais: número de página 417, sequência ilustrativa de 20 dígitos no número da guia e uma marca isolada no campo de indicação clínica. “Logo da Empresa” foi removido. No lugar há uma área de 160 × 32 pt, X=40 e Y=10 a partir do topo, para o logo do convênio do paciente. O HTML identifica essa área por `insurance-logo-slot`; o PDF usa `INSURANCE_LOGO` com ajuste proporcional, sem distorção.

## Uso no sistema

Correção de 19/10/2026: datas retornadas pelo MySQL como objetos `Date` são formatadas antes da conversão genérica para texto. Isso preserva o formato DD/MM/AAAA e as oito casas numéricas da data do encaminhamento/validade, sem aumentar células ou truncar o valor. Prévia e geração compartilham o mesmo motor; regressão compara os comandos de preenchimento entre datas ISO e objetos Date para os três tipos padrão.

A seleção de códigos agora segue o cadastro por convênio e a conferência de geração, incluindo leitura local de originais digitalizados. Ver [Códigos e de/para](CODIGOS_E_DE_PARA.md). Códigos formatados com pontos, espaços, barras ou hífens perdem somente esses separadores nas células do SADT; o histórico preserva o valor cadastrado.

Na Gestão de Tratamentos, selecionar a linha e clicar na ação superior **Gerar guias do tratamento selecionado**. No detalhe, a seção Documentos para liberação oferece **Pré-visualizar**, **Gerar guia faltante**, **Gerar guia ajustada** ou **Gerar nova versão**, conforme os documentos presentes. A SADT padrão está disponível mesmo sem cadastrar um template manual. Modelos específicos do convênio e modelos personalizados existentes continuam disponíveis e têm preferência na seleção automática.

As opções vêm de `GET /api/guide-processes/:id/document-generation-options`, com permissão de tratamento. Geração e prévia usam as rotas existentes e exigem edição do tratamento. IDs padrão têm formato `sadt-v1:CONSULTATION_GUIDE`, `sadt-v1:PHYSIOTHERAPY_GUIDE` e `sadt-v1:ELECTROSTIMULATION`; o cliente não escolhe caminhos de arquivo.

O HTML é compilado no desenvolvimento. Em produção, o motor existente `pdf-lib` carrega o fundo aprovado e preenche paciente, carteirinha/validade, ANS, solicitante, registro/UF/CBO, data de solicitação, indicação clínica/CID e procedimentos/quantidades. A consulta inclui procedimentos CONSULTATION; fisioterapia inclui PHYSIOTHERAPY e ELECTROSTIMULATION; a guia isolada de eletroestimulação inclui ELECTROSTIMULATION. Há limite de cinco linhas. Textos são ajustados/quebrados dentro da área; excesso retorna erro explícito e não é truncado silenciosamente. Datas e números usam as células do desenho original.

O conselho usa os códigos da [Tabela 26 oficial da ANS](https://fhir-hm.ans.gov.br/CodeSystem-tuss-26.html), por exemplo CRM=06 e CREFITO=05. Não presumir códigos de tabela de procedimentos, prestador, CNES, autorização, execução ou valores financeiros sem dados/configuração correspondentes; esses espaços permanecem em branco.

Logo e assinatura não são obrigatórios nesta fase. Se houver assets ativos nos cadastros existentes, usa-se o logo do convênio vinculado ao tratamento e a assinatura do médico solicitante no campo 20. Não foi criado um mecanismo de varredura de pastas nem uma assinatura fictícia. A definição futura de pastas e das demais assinaturas fica para a próxima etapa.

Os documentos são salvos no armazenamento e nas tabelas existentes, sem migration. Novos registros têm origem e papel GENERATED, versão crescente, referência ao modelo padrão nos metadados do histórico e arquivo UUID. Originais recebidos coexistem. Um bloqueio do tratamento serializa gerações para impedir versões concorrentes iguais; documentos excluídos também contam para o próximo número de versão. Prévia não cria um documento salvo. Criar a guia não encaminha ao convênio nem reinicia autorizações em andamento/liberadas.

Salvar tratamento continua exigindo somente paciente. A geração exige os dados administrativos mínimos que já eram validados pelo serviço, não documentação COMPLETE: paciente, convênio, carteirinha, médico e seus dados de registro, data, procedimentos compatíveis e fisioterapeuta quando aplicável. Pendências são retornadas ao usuário. O botão permanece visível para permitir tentar gerar depois de completar esses dados.

Na guia padrão de fisioterapia, os procedimentos de fisioterapia e eletroestimulação precisam estar associados ao tratamento, conforme o fluxo definido pela clínica. A ausência de qualquer um aparece como pendência; o sistema não inventa códigos nem inclui automaticamente um procedimento que não foi selecionado.

## Gerar novamente

Ferramentas de desenvolvimento: Python com `pdfplumber`, `pypdf` e `fonttools`; Node com acesso a Playwright/Chromium. Não foi adicionada dependência ao backend de produção. Se usar pacotes Python locais, configurar `PYTHONPATH` para a pasta correspondente.

```powershell
python backend/scripts/build-sadt-html.py
# Opcional: caminho absoluto da instalação de Playwright disponível no computador
$env:REALMED_PLAYWRIGHT_ROOT = 'C:/caminho/node_modules/playwright'
node backend/scripts/render-sadt-html.cjs backend/templates/sadt/guia-sadt.html backend/templates/sadt/guia-sadt-base.pdf
```

O HTML pode ser aberto diretamente no navegador. Para imprimir manualmente: A4 horizontal, escala 100%, margens zero, cabeçalhos e rodapés desligados e gráficos de fundo ativados. A prévia pelo script aplica essas opções de forma determinística e ajusta a MediaBox ao tamanho exato da referência.

## Conferência realizada

PDF-base de uma página, dimensões idênticas à referência, todos os 68 rótulos mapeados, texto extraível e nenhuma imagem raster no fundo. Comparação visual do PDF preenchido com dados fictícios em PNG a 150 dpi. `backend/test/sadt-generation.test.js` cobre modelo, células, integridade HTML/PDF, dados faltantes, filtros de procedimentos, preenchimento, limites, logo opcional e preservação de autorização. `frontend/scripts/verify-sadt-generation.cjs` cobre seleção do tratamento, avisos, geração, prevenção de cliques repetidos, versões, original recebido, prévia e celular. Não exige Playwright no servidor de aplicação.

## Próxima etapa

Definir os dados adicionais do prestador, os arquivos/pastas de logo e assinatura e quem assina os campos 66, 67 e 68. Evoluir as configurações específicas de cada convênio sem substituir os originais ou alterar arquivos/versões já emitidos. Valores são desenhados com fonte completa padrão do motor; os subconjuntos incorporados do HTML permanecem destinados aos rótulos do formulário.

## Médico assinante por convênio — cadastro de 21/10/2026

Cadastros → Convênios: selecionar a linha e usar **Médico assinante do convênio**. Cadastrar nome (até 150 caracteres) e PNG (até 5 MB), com prévia e substituição. Reutiliza o vínculo local por external_id Stenci. Permissões de visualizar/editar Convênios são verificadas no backend; a imagem é servida autenticada. Arquivo tem nome aleatório em storage/assets/signatures e validação de conteúdo PNG. Migration `20261021000008_insurance_signers.js` mantém versões em `insurance_provider_signatures`, com autor e data; substituir inativa a versão anterior e preserva seu arquivo.

Esta etapa cadastra o assinante para configuração futura das guias. Não altera automaticamente o médico solicitante, seu CRM, a assinatura por profissional ou documentos já gerados. A vinculação ao campo de assinatura de cada modelo será definida ao evoluir a geração. Nome e imagem não são enviados ao Stenci.

## Posição visual da assinatura — 21/10/2026

No mesmo cadastro do médico assinante, ativar **Aplicar assinatura nas guias SADT padrão deste convênio**. A prévia usa imagem renderizada do PDF-base real. Arrastar move a área; o canto redimensiona proporcionalmente; setas movem em 1 ponto (Shift: 10). Coordenadas são pontos do PDF original, X da esquerda e Y do topo; não dependem da resolução ou zoom. PNG usa `contain`, preservando proporção e transparência tanto na prévia quanto na geração.

Migration `20261021000009_insurance_signer_placement.js` adiciona `placement` à versão da assinatura. Salvar cria uma versão com imagem, médico, modelo e posição; versões anteriores e documentos emitidos permanecem intactos. Desmarcar a aplicação mantém o cadastro da imagem, com posição nula e sem aplicação automática. Nome/CRM do médico solicitante não são substituídos.

A posição vale apenas para `SADT_STANDARD_V1`, página 1, nas guias padrão de consulta, fisioterapia e eletroestimulação. Modelos personalizados continuam com seus campos e assinatura de profissional; não reutilizar coordenadas do SADT em outro modelo. Backend valida modelo, página, números finitos e limites antes de salvar e ao gerar. A assinatura configurada substitui o desenho da assinatura de profissional no SADT, evitando duplicidade. Prévia do tratamento e PDF definitivo usam o mesmo motor. O histórico do novo documento registra versão da assinatura por convênio e posição. Nenhum documento anterior é reescrito.


## Replicar médico assinante entre convênios — 27/10/2026

Cadastros → Convênios possui ação **Replicar assinatura do médico entre convênios**, independente dos procedimentos. A janela permite origem, prévia do médico/PNG, busca e seleção de até 100 destinos, seleção dos resultados e limpeza. Copia nome, imagem, posição e configuração de aplicação SADT, inclusive posição nula (sem aplicação automática). Exige visualizar e editar Convênios; usa a mesma resolução local por external_id Stenci do cadastro e da replicação de procedimentos.

Assinaturas existentes nos destinos são preservadas por padrão. A opção explícita de substituição cria nova versão e inativa somente a anterior; arquivos e guias emitidos permanecem preservados. Cada destino recebe seu próprio PNG e versão com autor/data; alterações posteriores não afetam origem ou outros destinos. A origem precisa ter assinatura ativa e permanecer na versão exibida. Falhas cancelam todas as alterações e removem apenas arquivos novos dessa tentativa. Locks nos convênios em ordem de ID serializam cópias e substituições. Não requer migration. Rota POST `/api/insurance-providers/replicate-signer`.
