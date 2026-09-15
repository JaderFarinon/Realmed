Instale dependências se ainda não fez:

npm install express mysql2 bcryptjs jsonwebtoken cors dotenv mssql
npm install swagger-ui-express swagger-jsdoc
npm install helmet express-rate-limit

Crie um arquivo `.env` na pasta `backend` com as credenciais de banco de dados necessárias (você pode usar o arquivo `.env.example` como ponto de partida com `cp .env.example .env`). Exemplos de variáveis utilizadas pelo projeto:

```
DB_HOST=
DB_USER=
DB_PASS=
DB_NAME=

SQLSERVER_DEFAULT_UNIT=ARTRO
SQLSERVER_HOST=sql
# A porta é opcional; utilize se a instância não estiver na 1433
SQLSERVER_PORT=1433
SQLSERVER_USER=AcessoBI
SQLSERVER_PASSWORD="WeKnow@artro#456"
SQLSERVER_DB=Cadastros

# Caso deseje configurar múltiplas unidades utilize as variáveis abaixo.
# Os nomes das unidades devem ser separados por vírgula e cada um deles
# deve possuir suas próprias credenciais.
# Exemplo: SQLSERVER_ADDITIONAL_UNITS=NOVO_MUNDO,OUTRA_UNIDADE
SQLSERVER_ADDITIONAL_UNITS=NOVO_MUNDO
SQLSERVER_NOVO_MUNDO_HOST=sql
SQLSERVER_NOVO_MUNDO_PORT=1433
SQLSERVER_NOVO_MUNDO_USER=AcessoBI
SQLSERVER_NOVO_MUNDO_PASSWORD="WeKnow@novomundo#456"
SQLSERVER_NOVO_MUNDO_DB=Cadastros
```

> **Importante:** se a senha do SQL Server contiver caracteres especiais como `#`, envolva o valor entre aspas (`"senha#com#caracteres"`) ou escape o caractere (`senha\#com\#caracteres`).

Todas as variáveis acima são obrigatórias para que as conexões com MySQL e SQL Server funcionem corretamente. As
variáveis com `<NOME_DA_UNIDADE>` devem ser substituídas pelo nome da unidade (apenas letras, números e `_`), por
exemplo `SQLSERVER_NOVO_MUNDO_HOST`.

Rode o servidor:

node app.js

URLs

API http://localhost:3001/api-docs/
JSON http://localhost:3001/api-docs-json

DOC https://documenter.getpostman.com/view/4934061/2sB2qfBKeU

