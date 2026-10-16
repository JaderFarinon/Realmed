# REALMED — CONTEXTO MESTRE DO SISTEMA

## DECISÃO ATUALIZADA — SESSÕES STENCI TEMPORÁRIAS (14/10/2026)

Por solicitação do usuário, não manter uma sessão Stenci aberta durante o uso do Realmed. Ler [docs/STENCI_SESSOES_TEMPORARIAS.md](docs/STENCI_SESSOES_TEMPORARIAS.md) antes de alterar autenticação ou integração. Login valida auth → branch → me, sincroniza usuário e chama `POST /v1/logout` antes de emitir o JWT Realmed. Consultas novas solicitam novamente as credenciais da mesma conta em janela própria, carregam os dados e fazem logoff em `finally`, inclusive em falhas. A senha nunca é persistida; tokens/cookies Stenci só existem durante a requisição. O store guarda sessão Realmed independente e cache de consultas por usuário, sem token Stenci. Cache ausente/expirado retorna `428 STENCI_REFRESH_REQUIRED`, sem deslogar do Realmed. Esta decisão substitui as instruções históricas abaixo sobre manter token Stenci no store e dispensar logout remoto.

## PADRÃO OBRIGATÓRIO DE TELAS — 14/10/2026

Antes de criar ou alterar qualquer tela, ler [docs/PADRAO_DE_TELAS.md](docs/PADRAO_DE_TELAS.md). O usuário definiu o padrão das listagens do ConectaMed como referência: filtros no card superior; barra de ações por ícones, tabela selecionável e paginação no card inferior. Reutilizar `PageShell`, `DataList`, `ListTableFrame`, `TableActionToolbar`, `TablePagination` e `ListDetailDialog` existentes. Selecionar a linha não abre edição; editar pelo lápis. Ações dependem da seleção e das permissões. Medir capacidade no desktop e permitir rolagem em celular, formulários e detalhes extensos. Não recriar botões por linha nem cortar campos. Validar com `frontend/scripts/verify-screen-pattern.cjs` e atualizar o documento ao evoluir o padrão.

## DECISÃO ATUALIZADA — ESTOQUE E PERMISSÕES (14/10/2026)

Por solicitação explícita do usuário, o módulo de estoque do Estoqy foi incorporado à arquitetura Vue/Express/Knex do Realmed. As permissões operacionais passam a ser habilitadas. Esta decisão substitui as instruções históricas abaixo que diziam para manter permissões desabilitadas.

- Administradores e masteradmin gerenciam permissões em Configurações → Permissões.
- Menu permanece visível para todos; acesso negado abre "Usuário sem permissão a essa função", sem encerrar a sessão.
- Backend valida permissões e o perfil atual no banco, inclusive para chamadas diretas à API.
- Estoque usa saldos por produto e setor, notas fiscais, pedidos com atendimento parcial e estado Aguardando compra.
- Login continua exclusivamente via Stenci; a tarefa anterior de criar dois acessos locais foi cancelada.
- Regras e diferenças em relação ao PHP estão documentadas em `docs/ESTOQUE.md`.

## 1. OBJETIVO DESTE DOCUMENTO

Este arquivo fornece contexto técnico, funcional e operacional completo sobre o sistema **Realmed**.

Ele deve ser utilizado por agentes de desenvolvimento, especialmente ChatGPT/Codex CLI, antes de:

- alterar código;
- criar migrations;
- alterar integrações;
- modificar autenticação;
- alterar fluxos da Central de Guias;
- criar documentos;
- modificar status;
- alterar telas;
- implementar novos módulos.

IMPORTANTE:

**Realmed é o nome do SISTEMA.**

"Central de Guias" é apenas o primeiro grande módulo operacional implementado.

O sistema deverá receber outros módulos futuramente.

Não tratar Realmed como sinônimo de Central de Guias.

---

# 2. PRINCÍPIO GERAL

O sistema Realmed centraliza processos internos da clínica e integra dados do sistema Stenci.

O objetivo inicial é organizar principalmente:

- criação de tratamentos;
- pacientes;
- convênios;
- planos;
- profissionais;
- documentação;
- avaliação fisioterapêutica;
- autorização junto ao convênio;
- acompanhamento do tratamento;
- geração de documentos;
- fila operacional do faturamento.

O Stenci é uma fonte importante de dados externos.

O Realmed possui banco próprio para controlar:

- tratamentos;
- estados internos;
- documentos;
- versões;
- histórico;
- avaliações;
- configurações;
- relacionamentos;
- dados adicionais que não pertencem ao Stenci.

---

# 3. STACK ATUAL

## Frontend

- Vue 3
- TypeScript
- SPA
- Axios
- Vue Router

## Backend

- Node.js
- Express
- JavaScript
- Knex

## Banco

- MySQL local
- estrutura compatível com MySQL/MariaDB quando necessário

## PDFs

Motor já existente baseado em:

- pdf-lib

Não substituir por PDFKit para documentos baseados em template.

O sistema já possui conceito de:

- template PDF;
- coordenadas;
- assets;
- documentos gerados;
- histórico/versionamento.

## Portas observadas em desenvolvimento

Backend:

`3005`

Frontend:

normalmente Vite em:

`5177`

Esses valores podem variar por configuração.

---

# 4. IDENTIDADE DO SISTEMA

Branding principal:

**REALMED**

Não exibir "Central de Guias" como se fosse nome do sistema.

Exemplo correto:

REALMED

Menu:
- Dashboard
- Central de Guias
- Pacientes
- Cadastros
- Integrações
- Configurações

---

# 5. ESTRUTURA DE MENU DESEJADA

## Dashboard

Visão geral operacional.

## Central de Guias

Subitens:

- Novo Tratamento
- Gestão de Tratamentos

## Pacientes

Consulta e gestão de pacientes.

## Cadastros

- Convênios
- Profissionais
- Procedimentos
- Modelos de Documentos

## Integrações

- Stenci

## Configurações

- Usuários
- Permissões

IMPORTANTE:

Permissões estão temporariamente desabilitadas no fluxo operacional.

A infraestrutura pode continuar no projeto para uso futuro.

---

# 6. CONCEITO PRINCIPAL: TRATAMENTO

O objeto central do fluxo é o:

**Tratamento**

Não utilizar apenas o conceito antigo de "processo de guia".

Um tratamento reúne:

- paciente;
- convênio;
- plano;
- carteirinha;
- validade;
- fisioterapeuta;
- médico solicitante;
- datas;
- sessões;
- dias de atendimento;
- horários;
- documentos;
- avaliação;
- autorização;
- status;
- acompanhamento.

---

# 7. FLUXO OPERACIONAL REAL DA CLÍNICA

O sistema deve refletir o processo real.

## Etapa física inicial

O paciente chega trazendo os documentos que possui.

A recepção:

1. recebe documentos;
2. adiciona checklist interno;
3. prepara ficha de avaliação;
4. coloca documentação em pasta/saco identificado;
5. encaminha paciente e documentos ao fisioterapeuta.

## Fisioterapeuta

O fisioterapeuta:

1. avalia o paciente;
2. preenche a avaliação;
3. define conduta;
4. define tratamento;
5. define dias;
6. define horários;
7. devolve o processo para a recepção.

## Central de Guias / recepção

A pessoa responsável:

1. localiza paciente;
2. confirma dados;
3. confirma convênio;
4. confirma plano;
5. informa fisioterapeuta;
6. informa médico solicitante;
7. informa data da avaliação;
8. informa início previsto;
9. informa sessões;
10. informa dias/horários;
11. anexa documentos recebidos;
12. gera documentos faltantes ou corrigidos;
13. acompanha checklist;
14. salva o tratamento.

## Faturamento

Depois:

1. acessa Gestão de Tratamentos;
2. verifica documentação;
3. envia ao convênio;
4. registra pendências;
5. registra autorização ou negativa;
6. acompanha tratamento.

---

# 8. REGRA FUNDAMENTAL: SALVAR != ENCAMINHAR AO CONVÊNIO

Uma das regras mais importantes do sistema:

**Salvar tratamento não significa tratamento completo.**

O sistema DEVE permitir criar um tratamento incompleto.

O requisito mínimo para criação é:

- paciente.

Exemplo:

Paciente selecionado
→ Salvar tratamento

Mesmo que ainda estejam faltando:

- convênio;
- plano;
- médico;
- fisioterapeuta;
- sessões;
- datas;
- documentos;
- avaliação.

O sistema salva.

As pendências permanecem visíveis.

---

# 9. TRATAMENTO INCOMPLETO

Tratamento incompleto deve poder:

- ser salvo;
- ser aberto;
- ser editado;
- receber documentos;
- receber dados posteriormente;
- receber avaliação;
- gerar documentos possíveis.

Não deve:

- desaparecer;
- ser rejeitado;
- exigir documentação completa no POST;
- ser automaticamente enviado ao convênio.

---

# 10. ENCAMINHAR AO CONVÊNIO

A validação rigorosa deve acontecer aqui.

Ação:

**Encaminhar ao Convênio**

Somente habilitar quando os requisitos definidos estiverem completos.

Exemplos:

- paciente;
- convênio;
- plano quando aplicável;
- fisioterapeuta;
- médico solicitante;
- sessões;
- documentação obrigatória;
- avaliação concluída/gerada;
- demais dados obrigatórios.

Se houver pendências:

botão fica desabilitado.

Mostrar ao usuário a lista das pendências.

---

# 11. STATUS OPERACIONAIS

Labels visuais desejados:

- Faltando Documentação
- Pendente
- Encaminhado ao Convênio
- Não Liberado
- Liberado

Pode existir alerta secundário:

- Pendência do convênio

Não expor enums técnicos na interface.

---

# 12. ENUMS INTERNOS EXISTENTES

## Documento

- INCOMPLETE
- COMPLETE

## Autorização

- NOT_READY
- READY
- IN_PROGRESS
- PENDING
- AUTHORIZED
- DENIED
- SESSION_TOKEN
- NOT_REQUIRED

## Tratamento

- WAITING
- IN_PROGRESS
- COMPLETED

## Faturamento

- NOT_READY
- READY
- DELIVERED
- BILLED

---

# 13. MAPEAMENTO VISUAL

Exemplo de regra:

`document INCOMPLETE`
→ Faltando Documentação

`document COMPLETE + authorization READY`
→ Pendente

`authorization IN_PROGRESS`
→ Encaminhado ao Convênio

`authorization PENDING`
→ Encaminhado ao Convênio
+ alerta "Pendência do convênio"

`authorization DENIED`
→ Não Liberado

`authorization AUTHORIZED`
→ Liberado

`authorization SESSION_TOKEN`
→ Liberado

`authorization NOT_REQUIRED`
→ Liberado

---

# 14. GESTÃO DE TRATAMENTOS

Tela:

**Central de Guias → Gestão de Tratamentos**

É a fila operacional, principalmente do faturamento.

Abas desejadas:

- Pendentes
- Encaminhados ao Convênio
- Não Liberados
- Liberados
- Faltando Documentação
- Todos

IMPORTANTE:

Tratamento novo incompleto normalmente fica:

`authorization_status = NOT_READY`

Portanto deve aparecer em:

**Faltando Documentação**

e também:

**Todos**

Não necessariamente em:

Pendentes

que pode corresponder a `READY`.

---

# 15. ORDENAÇÃO E FILTROS

Filtros previstos:

- paciente;
- convênio;
- fisioterapeuta;
- médico solicitante;
- autorização;
- documentação;
- tratamento;
- faturamento;
- prioridade;
- data da avaliação;
- data prevista de início.

Ordenações:

- início mais próximo;
- início mais distante;
- avaliação mais recente;
- avaliação mais antiga;
- prioridade;
- criação mais antiga;
- criação mais recente.

Para fila de faturamento:

preferir:

data prevista de início mais próxima
→ prioridade
→ processo mais antigo.

---

# 16. NOVO TRATAMENTO

Tela:

**Central de Guias → Novo Tratamento**

Objetivo:

permitir preparação operacional do tratamento.

---

# 17. BUSCA DE PACIENTE

Fonte principal:

**Stenci**

Endpoint confirmado:

`GET https://api.stenci.pro/v1/patients/search`

Query confirmada:

- `limit=30`
- `offset=0`
- `notFilterBranch=true`
- `search=<texto>`

Exemplo:

`/v1/patients/search?limit=30&offset=0&notFilterBranch=true&search=teste`

Autorização:

`Authorization: JWT <token da sessão>`

---

# 18. AUTOCOMPLETE DO PACIENTE

Não renderizar todos os pacientes diretamente na página.

Usar:

- autocomplete;
- searchable select;
- combobox.

Dropdown:

- position absolute;
- largura igual ao input;
- max-height ~260px;
- overflow-y auto;
- não altera layout;
- não empurra campos;
- fecha após seleção.

Mostrar por opção:

Nome

segunda linha:

CPF
Nascimento
Telefone

terceira opcional:

Convênio
Plano
Carteirinha.

---

# 19. RETORNO REAL DA BUSCA DE PACIENTES

Estrutura observada:

```json
{
  "items": [
    {
      "id": "...",
      "identityId": "...",
      "type": "person",
      "name": "...",
      "identity": {
        "type": "cpf",
        "value": "..."
      },
      "cellphone": "...",
      "phone": "...",
      "email": "...",
      "birthDate": "YYYY-MM-DD",
      "gender": "...",
      "addresses": [],
      "patient": {
        "active": true,
        "cns": null,
        "insurance": {
          "id": "...",
          "name": "...",
          "planId": "...",
          "plan": {
            "id": "...",
            "name": "..."
          },
          "record": "...",
          "validity": "YYYY-MM-DD"
        }
      }
    }
  ],
  "hasMore": false
}
```

Campos podem ser:

- null;
- string vazia;
- ausentes.

Não assumir:

- CPF obrigatório;
- email obrigatório;
- convênio obrigatório.

---

# 20. CONVÊNIOS STENCI

Endpoint confirmado:

`GET https://api.stenci.pro/v1/insurances?limit=0&active=true`

Autorização:

`Authorization: JWT <token atual>`

Resposta:

```json
{
  "hasMore": false,
  "items": [
    {
      "id": "...",
      "name": "...",
      "type": "insurance",
      "imageUrl": "..."
    }
  ]
}
```

Tipos observados:

- insurance
- referral
- particular

Não filtrar somente insurance.

---

# 21. PLANOS STENCI

Endpoint confirmado:

`GET https://api.stenci.pro/v1/insurance-plans?limit=0&offset=0&active=true`

Autorização:

`Authorization: JWT <token atual>`

A resposta associa convênio e plano.

Estrutura:

```json
{
  "id": "<insurance id>",
  "name": "<insurance name>",
  "imageUrl": "...",
  "plan": {
    "id": "<plan id>",
    "name": "<plan name>",
    "type": "...",
    "record": "...",
    "identity": {},
    "table": {}
  },
  "customName": "..."
}
```

IMPORTANTE:

`item.id`
= ID do convênio

`item.plan.id`
= ID do plano

Nunca confundir.

---

# 22. PREENCHIMENTO AUTOMÁTICO DO CONVÊNIO

Ao selecionar paciente:

se existir:

`patient.insurance`

preencher automaticamente:

- Convênio
- Plano
- Carteirinha
- Validade

Mas permitir edição manual.

---

# 23. PROFISSIONAIS STENCI

Endpoint confirmado:

`GET https://api.stenci.pro/v1/professionals?limit=100&offset=0&active=true`

Autorização:

`Authorization: JWT <token atual>`

Estrutura contém:

- id
- identityId
- name
- identity
- cellphone
- phone
- email
- birthDate
- gender

e:

```json
"professional": {
  "active": true,
  "councils": [
    {
      "name": "CREFITO",
      "state": "PR",
      "record": "..."
    }
  ],
  "specialties": [],
  "title": "",
  "signature": "",
  "signatureImageUrl": null
}
```

---

# 24. IDENTIFICAÇÃO DOS PROFISSIONAIS

## Fisioterapeuta

Critério principal:

conselho:

`CREFITO`

Não depender exclusivamente da especialidade.

## Médico solicitante

Critério principal:

conselho:

`CRM`

Isso é importante porque pode haver cadastro inconsistente de especialidade.

Conselho é mais confiável.

---

# 25. DADOS DO TRATAMENTO — LAYOUT

Grid desejado em desktop:

Linha 1:

Convênio — 4/12

Plano — 4/12

Carteirinha — 2/12

Validade — 2/12

Linha 2:

Fisioterapeuta — 6/12

Médico solicitante — 6/12

Linha 3:

Data avaliação — 4/12

Data início — 4/12

Quantidade sessões — 4/12

Linha 4:

Observações — 12/12

---

# 26. SEARCHABLE SELECT

Todos os selects pesquisáveis devem seguir padrão:

wrapper:

```css
position: relative;
width: 100%;
min-width: 0;
```

dropdown:

```css
position: absolute;
top: calc(100% + 4px);
left: 0;
width: 100%;
max-width: 100%;
max-height: 260px;
overflow-y: auto;
overflow-x: hidden;
z-index: 1000;
```

O dropdown nunca deve:

- alterar o grid;
- aumentar a altura da página;
- atravessar várias colunas;
- definir sua própria largura.

**O grid define a largura.**

---

# 27. MÁSCARAS

Interface:

CPF:

`000.000.000-00`

Telefone:

`(00) 0000-0000`

ou:

`(00) 00000-0000`

Datas:

`dd/mm/aaaa`

Horário:

`HH:mm`

Quantidade de sessões:

inteiro positivo.

Carteirinha:

sem máscara rígida.

---

# 28. DIAS E HORÁRIOS

Tratamento pode conter:

- segunda;
- terça;
- quarta;
- quinta;
- sexta.

Cada dia:

- ativo;
- horário.

Exemplo:

Segunda
☑
08:00

Terça
☐

Quarta
☑
08:00

Esses dados alimentam:

- tratamento;
- avaliação;
- ficha PDF.

---

# 29. STENCI — AUTENTICAÇÃO

Uma decisão central do projeto:

**O login do Realmed usa autenticação do Stenci.**

Não existe necessidade de senha local para usuário normal.

---

# 30. FLUXO DE LOGIN

Fluxo confirmado:

Realmed login
→ username + password

Backend Realmed:

`POST https://api-x.stenci.pro/v1/auth`

body:

```json
{
  "username": "...",
  "password": "...",
  "deviceId": "..."
}
```

Resposta:

```json
{
  "user": {},
  "token": "...",
  "licenseExceeded": false
}
```

---

# 31. DEVICE ID

O `deviceId`:

- é criado antes do auth;
- não vem da resposta;
- é reutilizado no branch;
- possui formato de 32 caracteres hexadecimais.

Estratégia usada:

`crypto.randomUUID().replace(/-/g, '')`

Não precisa existir:

`STENCI_DEVICE_ID`

fixo no `.env`.

---

# 32. SELEÇÃO DA BRANCH

Depois do auth:

`POST https://api-x.stenci.pro/v1/me/branch`

body:

```json
{
  "branchId": "...",
  "deviceId": "mesmo deviceId"
}
```

Header correto:

`Authorization: JWT <token>`

IMPORTANTE:

Não usar:

`Bearer`

O Stenci usa prefixo:

`JWT`

---

# 33. BRANCH REALMED

Branch identificada:

Realmed

ID conhecido:

`5ef4aeba8b64ba627e46a8b9`

Essa branch é fixa para o sistema Realmed.

Pode ser configurada em:

`STENCI_BRANCH_ID`

---

# 34. TOKEN PRÉ-BRANCH / PÓS-BRANCH

Fluxo conceitual:

`/auth`
→ token A

`/me/branch`
→ usa `Authorization: JWT token A`

Se branch retornar novo token:

token B substitui token A.

Chamadas posteriores usam o token atual da sessão.

---

# 35. /ME

Depois da branch:

`GET https://api-x.stenci.pro/v1/me`

usando token vigente.

Serve para validar identidade/contexto.

---

# 36. SESSÃO REALMED / STENCI

Depois de autenticação:

Realmed cria seu próprio JWT.

Não colocar token Stenci dentro do JWT do frontend.

JWT Realmed deve conter algo como:

- userId
- sid

Backend mantém:

`sid`
→ StenciSession

server-side.

---

# 37. STENCI SESSION

Pode conter:

- deviceId;
- branchId;
- token atual;
- authenticatedAt;
- contexto necessário.

Nunca conter:

- senha.

---

# 38. STENCI SESSION STORE

Foi definido conceito de:

`StenciSessionStore`

Inicialmente pode usar:

Map em memória.

Deve permitir futura migração para Redis.

Cada usuário/sessão deve ter contexto separado.

Não usar sessão global única.

---

# 39. LOGOUT

Logout Realmed deve:

- invalidar sessão Realmed;
- remover StenciSession correspondente.

Não é necessário logout remoto do Stenci por enquanto.

---

# 40. EXPIRAÇÃO

Quando Stenci responder 401/403 por sessão inválida:

retornar:

`STENCI_SESSION_EXPIRED`

Não tentar reutilizar senha.

Redirecionar usuário ao login.

---

# 41. CREDENCIAIS FIXAS STENCI

Não usar:

`STENCI_USERNAME`

`STENCI_PASSWORD`

para operações interativas.

O usuário fornece credenciais no login.

Conta técnica somente seria usada futuramente em processos automáticos, se necessário.

---

# 42. HEADERS STENCI

Headers relevantes usados pelo cliente:

```text
Accept: application/json, text/plain, */*
Content-Type: application/json
Origin: https://stenci.app
Referer: https://stenci.app/
Accept-Language: pt-BR,...
User-Agent: ...
Authorization: JWT <token>
```

Não reproduzir manualmente headers de navegador como:

- sec-ch-ua;
- sec-fetch-*;
- priority;
- :authority;
- :path;
- :scheme.

---

# 43. BASE URLS STENCI

## Auth

`https://api-x.stenci.pro`

Utilizada para:

- /v1/auth
- /v1/me/branch
- /v1/me

## API operacional

`https://api.stenci.pro`

Utilizada para:

- patients/search
- insurances
- insurance-plans
- professionals
- demais endpoints operacionais.

---

# 44. CONFIGURAÇÃO .ENV STENCI

Estrutura conceitual:

```env
STENCI_ENABLED=true

STENCI_API_X_BASE_URL=https://api-x.stenci.pro
STENCI_API_BASE_URL=https://api.stenci.pro

STENCI_BRANCH_ID=<branch Realmed>

STENCI_TIMEOUT_MS=10000

STENCI_ORIGIN=https://stenci.app
STENCI_REFERER=https://stenci.app/
STENCI_USER_AGENT=
```

Não exigir:

```env
STENCI_DEVICE_ID=
STENCI_USERNAME=
STENCI_PASSWORD=
```

para login interativo.

---

# 45. USUÁRIO LOCAL REALMED

Mesmo autenticando pelo Stenci, Realmed pode precisar de usuário local para:

- created_by;
- updated_by;
- histórico;
- auditoria;
- relacionamentos.

Após login Stenci:

criar ou atualizar usuário local.

---

# 46. IDENTIDADE DO USUÁRIO

Identificador principal:

`stenci_user_id`

baseado em:

`user.id`

retornado pelo Stenci.

Não usar nome como identidade.

---

# 47. RECONCILIAÇÃO

Se usuário já existe localmente:

preferir localizar por:

1. stenci_user_id;
2. email;
3. username/CPF;
4. outras chaves seguras.

Não criar duplicata.

---

# 48. ERRO MYSQL DE LOCK

Foi identificado anteriormente erro:

`errno 4163`

relacionado a nome excessivamente longo em:

`GET_LOCK(...)`

A solução definida:

usar chave curta determinística via hash.

Exemplo:

```js
crypto
  .createHash('sha256')
  .update(String(stenciUserId))
  .digest('hex')
  .slice(0, 32)
```

e prefixo curto.

Não remover lock de concorrência.

---

# 49. PERMISSÕES

Infraestrutura antiga possui:

- user_permissions;
- modulePermission();
- permissionMiddleware();

Por decisão atual:

**permissões operacionais estão desabilitadas temporariamente.**

---

# 50. PERMISSIONS_ENABLED

Usar configuração:

```env
PERMISSIONS_ENABLED=false
```

Quando false:

usuário autenticado pode usar funções operacionais.

Quando true:

volta a validar permissões.

Não remover infraestrutura definitivamente.

---

# 51. IMPORTANTE: FRONTEND TAMBÉM DEVE RESPEITAR ISSO

Não adianta backend liberar se frontend ainda esconder:

- Gerar;
- Anexar;
- Editar;
- Avaliar;
- Autorizar.

Evitar `canEdit` baseado em `user_permissions` quando:

`PERMISSIONS_ENABLED=false`.

---

# 52. DOCUMENTOS

O tratamento possui documentação necessária à liberação.

Tipos principais:

- Guia de consulta
- Guia de fisioterapia
- Avaliação fisioterapêutica
- Carteirinha
- Outros
- Eletroestimulação quando aplicável

---

# 53. REGRA DE DOCUMENTOS RECEBIDOS E GERADOS

Original recebido nunca pode ser perdido.

Exemplo:

Guia de fisioterapia

Documento recebido:
arquivo_original.pdf

Documento gerado:
guia_ajustada_v2.pdf

Ambos coexistem.

---

# 54. SOURCE DOS DOCUMENTOS

Existem conceitos como:

- UPLOADED
- GENERATED
- IMPORTED

Um tipo pode possuir:

- versão recebida;
- versão gerada.

Gerar uma nova versão não substitui o original.

---

# 55. DOCUMENTO USÁVEL

Documento recebido pode ser marcado:

- Adequado
- Necessita ajuste

Checklist deve considerar válido:

- documento recebido adequado;
ou
- documento gerado com sucesso.

---

# 56. GUIA DE FISIOTERAPIA

Regra operacional importante:

Sessões de fisioterapia utilizam uma guia que deve conter:

- procedimento correto de fisioterapia;
- eletroestimulação.

Se guia recebida estiver errada:

manter original.

Gerar:

**Guia Ajustada**

---

# 57. GUIA DE CONSULTA

Avaliação/consulta pode possuir guia separada.

Se estiver ausente:

sistema deve permitir:

**Gerar Guia**

---

# 58. GERAÇÃO DE DOCUMENTOS

Cards devem oferecer, quando aplicável:

- Anexar documento
- Gerar documento
- Pré-visualizar
- Visualizar
- Gerar nova versão

Não esconder botão Gerar por documentação incompleta.

Gerar um documento é justamente uma forma de resolver pendência.

---

# 59. TIPOS GERÁVEIS OBSERVADOS

Código já trabalhado com:

- CONSULTATION_GUIDE
- PHYSIOTHERAPY_GUIDE
- ELECTROSTIMULATION

Manter conforme templates realmente existentes.

---

# 60. TEMPLATE PDF

Documentos oficiais devem preferencialmente usar PDF real como base.

Não recriar formulários oficiais visualmente do zero quando existe PDF original.

Fluxo:

PDF template
→ pdf-lib
→ overlay de campos
→ PDF gerado.

---

# 61. COORDENADAS

Editor/template pode utilizar:

X medido da esquerda.

Y configurado visualmente a partir do topo.

Motor converte internamente para coordenadas do PDF.

Preview e geração final devem usar o mesmo motor.

---

# 62. ASSETS

Estrutura já utilizada:

- logos;
- assinaturas;
- templates;
- documentos gerados.

Pastas observadas historicamente:

`storage/documents`

`storage/templates`

`storage/generated`

`storage/assets/logos`

`storage/assets/signatures`

Preservar arquitetura equivalente.

---

# 63. LOGO DE CONVÊNIO

Cadastro local de convênio pode possuir logo.

Mesmo com Stenci como fonte operacional, banco local ainda é útil para:

- logo;
- configurações;
- documentos;
- regras internas.

Logo pode ser usada na geração de PDF.

---

# 64. FICHA DE AVALIAÇÃO FISIOTERAPÊUTICA

Foi definido novo modelo de 2 páginas.

Objetivo:

gerar automaticamente o máximo possível de informações.

---

# 65. PRINCÍPIO DA FICHA

A ficha pode ser gerada mesmo quando o tratamento está incompleto.

Quanto mais dados existirem:

mais preenchida ela sai.

Campos desconhecidos:

ficam em branco.

---

# 66. PÁGINA 1 DA FICHA

## Identificação

- Nome
- CPF
- Data nascimento
- Sexo
- Celular
- Telefone residencial
- Convênio
- Carteirinha

## Encaminhamento

- Médico solicitante
- Data do encaminhamento
- Diagnóstico
- CID
- Sessões solicitadas
- Guia/autorização

## Avaliação

- Queixa principal
- História do quadro
- Limitações funcionais
- Exame físico
- Dor EVA
- classificação da dor
- localização

---

# 67. PÁGINA 2 DA FICHA

## Região/membro

- cervical/cabeça;
- ombro;
- braço;
- cotovelo;
- antebraço;
- punho/mão;
- torácica;
- lombar;
- quadril;
- coxa;
- joelho;
- perna;
- tornozelo/pé;
- outro.

Lateralidade:

- direita;
- esquerda;
- bilateral.

Mapa corporal visual deve permanecer no PDF.

---

# 68. GRAVIDADE

- Leve
- Moderada
- Grave

Com justificativa.

---

# 69. RISCO ASSISTENCIAL

- Baixo
- Moderado
- Alto

Acompanhamento individualizado:

- Sim
- Não

---

# 70. PRECAUÇÕES

Opções:

- risco de queda;
- alteração de sensibilidade;
- pós-operatório;
- doença cardiovascular;
- déficit neurológico;
- lesão de pele;
- marcapasso/implante eletrônico;
- gestação;
- trombose/risco vascular;
- dor intensa;
- outro.

---

# 71. CONDUTA

Opções:

- Cinesioterapia
- Alongamento
- Fortalecimento
- Treino funcional
- Terapia manual
- Eletroterapia
- Termoterapia
- Crioterapia
- Propriocepção/equilíbrio
- Treino de marcha
- Orientações domiciliares
- Outra

Campos adicionais:

- objetivos;
- descrição;
- progressão;
- reavaliação.

---

# 72. AVALIAÇÃO DIGITAL

Foi decidido criar avaliação fisioterapêutica dentro do sistema.

Ação na Gestão de Tratamentos:

- Avaliar paciente
- Continuar avaliação
- Ver avaliação
- Editar avaliação

---

# 73. STATUS DA AVALIAÇÃO

- Não iniciada
- Em preenchimento
- Concluída

Fisioterapeuta pode:

- salvar rascunho;
- concluir avaliação.

---

# 74. DADOS DA AVALIAÇÃO DIGITAL

Estrutura prevista:

- chief complaint;
- history;
- limitations;
- physical exam;
- pain score;
- pain classification;
- pain location;
- regions;
- severity;
- justification;
- risk;
- precautions;
- conduct;
- therapeutic goals;
- reevaluation;
- notes.

---

# 75. BANCO DA AVALIAÇÃO

Estrutura sugerida:

`physiotherapy_evaluations`

Campos possíveis:

- id
- treatment_id
- status
- chief_complaint
- current_history
- functional_limitations
- physical_exam
- pain_score
- pain_classification
- pain_location
- severity
- severity_justification
- care_risk
- individual_monitoring
- precautions JSON
- specific_care_notes
- therapeutic_goals
- conducts JSON
- conduct_description
- reevaluation_date
- reevaluation_notes
- regions JSON
- physiotherapist_id
- evaluation_date
- created_at
- updated_at

Adaptar aos padrões reais do projeto antes de criar migration.

---

# 76. RELAÇÃO AVALIAÇÃO → PDF

Ficha gerada combina:

dados administrativos do tratamento
+
dados clínicos da avaliação.

Exemplo:

tratamento contém paciente/convênio/médico.

avaliação contém dor/gravidade/conduta.

PDF contém ambos.

---

# 77. CHECKBOXES NO PDF

Não escrever:

true
false

Renderizar:

☒ selecionado

☐ não selecionado

---

# 78. FICHA NA GESTÃO DE TRATAMENTOS

No detalhe do tratamento:

**Ficha de Avaliação Fisioterapêutica**

Mostrar:

- Não gerada;
- Gerada;
- data da última geração;
- avaliação não iniciada;
- avaliação em preenchimento;
- avaliação concluída.

Ações:

- Preencher avaliação
- Gerar ficha
- Visualizar última
- Gerar nova versão
- Baixar
- Imprimir

---

# 79. VERSIONAMENTO DA FICHA

Não sobrescrever.

Exemplo:

v1

v2

v3

A mais recente pode ser marcada:

Atual.

---

# 80. NOVO TRATAMENTO — SALVAMENTO E UPLOADS

Problema já identificado:

Frontend realizava:

1. criar tratamento;
2. fazer uploads;
3. redirecionar;

tudo dentro do mesmo try.

Se upload falhava:

parecia que tratamento não salvou.

Regra correta:

FASE 1:
criar tratamento.

Se retornou 201:

já está salvo.

FASE 2:
tentar uploads.

Se upload falhar:

tratamento continua salvo.

FASE 3:
ir ao detalhe.

Mensagem:

"Tratamento salvo com pendências."

---

# 81. NÃO DUPLICAR TRATAMENTO APÓS ERRO DE UPLOAD

Depois de POST 201:

não permitir nova submissão cega que crie tratamento duplicado.

O tratamento já existe.

---

# 82. CHECKLIST DE DOCUMENTAÇÃO

Pode mostrar:

0/3

1/3

2/3

3/3

e pendências.

Não bloquear salvamento.

---

# 83. GERAÇÃO COM DOCUMENTAÇÃO INCOMPLETA

Documentos geráveis devem poder ser produzidos quando o processo está:

`INCOMPLETE`

ou:

`NOT_READY`

desde que campos necessários ao template existam.

Não exigir COMPLETE antes da geração.

Isso seria circular.

---

# 84. CAMPOS FALTANTES NA GERAÇÃO

Se PDF requer campos ainda ausentes:

backend deve responder quais faltam.

Frontend mostra:

"Não foi possível gerar. Faltam: ..."

Não esconder o botão.

---

# 85. CADASTROS LOCAIS

Mesmo utilizando Stenci, não remover tabelas locais de:

- patients;
- insurance_providers;
- professionals.

Elas ainda podem ser necessárias para:

- relacionamentos;
- histórico;
- configurações;
- documentos;
- assets;
- regras internas.

---

# 86. EXTERNAL SOURCE

Sincronizações devem preferir:

`external_source = STENCI`

`external_id = <id Stenci>`

Evitar duplicatas.

---

# 87. PACIENTE LOCAL

Ao selecionar paciente Stenci:

localizar por:

`external_source + external_id`

Se existe:

atualizar dados sincronizáveis.

Se não:

criar.

Não identificar exclusivamente por nome.

---

# 88. CONVÊNIO LOCAL

Mesmo princípio:

external_source = STENCI

external_id = insurance.id

Pode existir registro local mínimo para relacionamentos/configuração.

---

# 89. PROFISSIONAL LOCAL

Mesmo princípio:

external_source = STENCI

external_id = professional.id

Preservar:

- conselho;
- UF;
- registro;
- assinatura quando aplicável.

---

# 90. PROBLEMAS DE NAVEGADOR QUE DEVEM SER IGNORADOS

Logs como:

`MaxListenersExceededWarning`

`ObjectMultiplex`

`background-liveness`

`app-init-liveness`

`content.js Feature is disabled`

normalmente vêm de extensão do navegador.

Não alterar Realmed por causa deles.

---

# 91. MIGRATIONS — CUIDADOS

Local:

MySQL.

Produção pode variar.

Problema histórico:

optional timestamp com default inválido.

Para timestamps opcionais:

preferir:

```js
t.dateTime('resolved_at').nullable()
```

ao invés de timestamp com default inadequado.

---

# 92. NÃO EDITAR MIGRATION JÁ EXECUTADA EM PRODUÇÃO

Quando sistema já tem ambiente compartilhado:

criar nova migration.

Em desenvolvimento fresco:

pode ser necessário limpar migration parcial se MySQL aplicou parte do DDL antes do erro.

---

# 93. DESIGN DO SISTEMA

Interface:

- limpa;
- compacta;
- operacional;
- sem cards gigantes desnecessários;
- sem dropdown empurrando página;
- labels em português;
- enums internos escondidos.

---

# 94. PRINCÍPIO DE UX

Recepção não deve precisar entender:

`NOT_READY`

`IN_PROGRESS`

`AUTHORIZED`

etc.

Interface deve falar:

- Faltando Documentação
- Pendente
- Encaminhado ao Convênio
- Não Liberado
- Liberado

---

# 95. NÃO IMPLEMENTAR PERMISSÕES AGORA

Até nova decisão:

foco é funcionalidade.

Não bloquear fluxo porque `user_permissions` está vazio.

Autenticação continua obrigatória.

Autorização fina fica para etapa futura.

---

# 96. SEGURANÇA

Nunca persistir:

- senha Stenci;
- token Stenci no frontend;
- token Stenci em JWT Realmed;
- credenciais em logs;
- secrets em README.

Tokens Stenci permanecem somente backend/server-side.

---

# 97. LOGS

Logs técnicos podem mostrar:

- stage;
- status;
- tokenPresent true/false;
- deviceIdPresent true/false;
- count;
- error code.

Nunca mostrar:

- senha;
- token completo;
- CPF completo desnecessariamente.

---

# 98. TRATAMENTO — REGRA DE EDIÇÃO

Tratamento pode ser aberto e completado progressivamente.

Não exigir preenchimento único em um wizard rígido.

O usuário pode:

criar
→ salvar
→ retornar
→ completar.

---

# 99. FLUXO FINAL ESPERADO

## Recepção

Login Realmed via Stenci.

Novo Tratamento.

Busca paciente.

Seleciona paciente.

Dados são importados.

Salva mesmo incompleto.

Tratamento aparece na Gestão.

## Fisioterapeuta

Abre tratamento.

Realiza avaliação digital.

Salva rascunho.

Conclui avaliação.

## Recepção/Central de Guias

Completa:

- convênio;
- plano;
- carteirinha;
- validade;
- médico;
- fisioterapeuta;
- dias;
- horários;
- documentos.

Gera guias faltantes/corrigidas.

Gera ficha de avaliação.

## Faturamento

Confere pendências.

Quando completo:

Encaminhar ao Convênio.

Depois:

- pendência;
- negativa;
- autorização.

---

# 100. FLUXO STENCI COMPLETO

```text
Usuário
   ↓
Realmed Login
   ↓
POST /api/auth/login
   ↓
gera deviceId
   ↓
POST api-x.stenci.pro/v1/auth
   ↓
token A
   ↓
POST api-x.stenci.pro/v1/me/branch
Authorization: JWT token A
   ↓
token atual / token B
   ↓
GET api-x.stenci.pro/v1/me
   ↓
sincroniza usuário local
   ↓
cria sid Realmed
   ↓
JWT Realmed
   ↓
StenciSessionStore
   ↓
token atual Stenci
   ↓
APIs operacionais
```

---

# 101. APIs OPERACIONAIS STENCI CONFIRMADAS

Pacientes:

`GET /v1/patients/search`

Convênios:

`GET /v1/insurances`

Planos:

`GET /v1/insurance-plans`

Profissionais:

`GET /v1/professionals`

Todas em:

`https://api.stenci.pro`

Header:

`Authorization: JWT <token>`

---

# 102. PRINCÍPIO DE DESENVOLVIMENTO

Antes de qualquer alteração:

1. revisar código atual;
2. verificar o que já existe;
3. não duplicar funcionalidades;
4. não recriar arquitetura paralela;
5. reutilizar serviços/componentes/middlewares existentes;
6. criar migrations somente quando necessário;
7. preservar compatibilidade.

---

# 103. NÃO ALTERAR AUTENTICAÇÃO SEM MOTIVO

A autenticação Stenci foi investigada em detalhe.

O formato correto está confirmado.

Não trocar:

`JWT`

por:

`Bearer`.

Não voltar a usar credencial fixa no `.env`.

Não transformar deviceId em configuração fixa.

---

# 104. NÃO APAGAR INFRAESTRUTURA ÚTIL

Mesmo que algo esteja temporariamente desativado:

não apagar sem necessidade:

- permissions;
- templates;
- document engine;
- local entities;
- history;
- integrations.

Desabilitar de forma controlada quando apropriado.

---

# 105. ESTADO ATUAL DO PROJETO

Funcionalidades que já chegaram a funcionar durante desenvolvimento:

- login Realmed autenticando no Stenci;
- deviceId dinâmico;
- branch Realmed;
- Authorization `JWT`;
- sessão Realmed;
- busca de pacientes Stenci;
- listagem de pacientes no Novo Tratamento;
- integração de convênios;
- integração de planos;
- integração de profissionais;
- seleção de fisioterapeutas por CREFITO;
- seleção de médicos por CRM;
- estrutura de Gestão de Tratamentos;
- cards de documentação;
- infraestrutura de geração de PDF;
- ficha de avaliação em evolução;
- permissões operacionais temporariamente desabilitadas.

---

# 106. PONTOS QUE AINDA EXIGEM REVISÃO/FINALIZAÇÃO

## Novo Tratamento

- concluir layout responsivo;
- garantir selects compactos;
- máscaras;
- salvar incompleto sem erro visual;
- uploads independentes do POST inicial;
- dias/horários.

## Gestão

- garantir tratamento incompleto em Faltando Documentação;
- detalhe funcional;
- ações operacionais visíveis.

## Documentos

- garantir botão Gerar;
- configurar templates reais;
- mapear guia oficial em PDF;
- histórico/versionamento.

## Avaliação

- finalizar formulário digital;
- persistência;
- conclusão;
- integração completa com PDF.

## Workflow

- validar exatamente requisitos para "Encaminhar ao Convênio".

---

# 107. GUIAS OFICIAIS — PRÓXIMA ETAPA

O usuário deverá fornecer novamente os PDFs reais das guias.

Quando recebidos:

1. usar PDF real como template;
2. mapear campos;
3. definir coordenadas;
4. mapear dados do tratamento;
5. definir obrigatoriedade;
6. gerar via pdf-lib;
7. preservar original;
8. criar versão gerada.

Não reconstruir visualmente guia oficial sem necessidade.

---

# 108. NOMENCLATURA

Preferir no código novo:

Treatment / Tratamento

quando se tratar do conceito de tratamento.

Código legado pode ainda usar:

`guide_process`
`guide_processes`

Não renomear tudo de uma vez sem avaliar impacto.

Pode evoluir progressivamente.

---

# 109. REGRA PARA AGENTES

Se encontrar diferença entre este documento e o código:

1. inspecionar código;
2. identificar se comportamento implementado é legado ou alteração recente;
3. preservar decisões funcionais deste documento;
4. não inventar solução silenciosamente;
5. documentar conflito quando relevante.

---

# 110. PRIORIDADE ATUAL

Prioridade de curto prazo:

1. estabilizar Novo Tratamento;
2. garantir salvamento parcial;
3. estabilizar Gestão;
4. completar documentos;
5. implementar/estabilizar avaliação digital;
6. mapear PDFs oficiais;
7. validar fluxo completo até envio ao convênio;
8. somente depois aprofundar permissões e módulos adicionais.

---

# 111. REGRA FINAL

O sistema deve se adaptar ao fluxo da clínica.

O usuário não deve precisar completar dados artificialmente apenas para satisfazer o software.

Tratamentos são construídos progressivamente.

Pendência é um estado normal e visível.

Pendência não é erro.

Ações irreversíveis ou operacionais relevantes — especialmente envio ao convênio — é que devem possuir validações mais rígidas.

---

# 112. DOCUMENTOS DE REFERÊNCIA DO PROJETO

Documentos fornecidos pelo usuário, disponíveis em `docs/` na raiz:

- [Guia de SADT](docs/Guia%20de%20SADT.pdf): referência para o template da guia oficial. Preservar o PDF original e utilizar o motor existente com pdf-lib ao mapear os campos.
- [Ficha de Avaliação](docs/Ficha%20de%20Avalia%C3%A7%C3%A3o.docx): referência para conteúdo e apresentação da ficha de avaliação fisioterapêutica.

Os arquivos foram registrados como referências; seu conteúdo e layout ainda precisam ser avaliados. Retomar essa avaliação após o usuário fornecer os dados dos servidores, junto ao planejamento da implantação e configuração. Não considerar os documentos já mapeados ou integrados ao sistema.

O estado da implantação, limites de acesso aos servidores e tarefas pendentes estão registrados em [deploy/README.md](deploy/README.md). Consultar esse documento antes de operações de produção e atualizar o estado após cada implantação.
