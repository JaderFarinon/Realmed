# Central de Guias

Base técnica para a Central de Guias e Autorizações, composta por frontend Vue 3, API Node.js/Express e MySQL. Nesta etapa estão disponíveis apenas autenticação, layout, dashboard e administração de usuários/permissões.

## Configuração

1. Copie `backend/.env.example` para `backend/.env` e configure o MySQL e uma chave JWT forte.
2. Instale as dependências em `backend/` e `frontend/` com `npm ci`.
3. No backend, execute `npx knex migrate:latest` e `npx knex seed:run` quando estiver preparando um banco novo.
4. Inicie a API com `npm start` em `backend/` e o frontend com `npm run dev` em `frontend/`.

A API usa a porta 3005 por padrão. Defina `VITE_API_URL` no ambiente do frontend se a API estiver em outra origem.

## Segurança e armazenamento

O conteúdo de `storage/` é privado e não é servido estaticamente. Não armazene documentos ou credenciais em `frontend/public`. O arquivo `.env` é ignorado pelo Git; somente o modelo sem segredos `.env.example` deve ser versionado.

A pasta `integrations/stenci/` é apenas uma reserva arquitetural. A integração ainda não foi implementada.
