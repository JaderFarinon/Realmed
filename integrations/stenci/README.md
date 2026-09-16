# Integração Stenci: pacientes

Integração de leitura usada pela Central de Guias para localizar pacientes e importá-los para o Realmed. O backend é a única camada que conversa com o Stenci; credenciais nunca são enviadas ao frontend.

## Contrato confirmado pelo HAR

O Stenci usa duas origens distintas:

- API X (`https://api-x.stenci.pro`): `POST /v1/auth`, `POST /v1/me/branch` e `GET /v1/me`;
- API principal (`https://api.stenci.pro`): `GET /v1/patients/search`.

O login envia `username`, `password` e `deviceId`. A seleção da empresa envia `branchId` e o mesmo `deviceId` persistente. Como o HAR não demonstrou token, cookie ou cabeçalho adicional, o cliente não presume nem cria nenhum deles.

No login de funcionário, `POST /api/auth/login` recebe as credenciais individuais, executa autenticação, seleção automática da branch e `GET /v1/me`. O backend guarda um `StenciSession` em um `StenciSessionStore` com TTL e inclui no JWT Realmed somente o identificador aleatório `sid`. A senha é descartada ao fim da requisição; não existem credenciais Stenci fixas nem fallback técnico.

Consultas posteriores resolvem o `sid` exclusivamente no backend e criam um cliente contextualizado para aquela sessão. Elas não repetem `/v1/auth` ou `/v1/me/branch`. Como o HAR não mostrou `Authorization`, cookie ou token Stenci, o contexto representa somente o estado comprovado (device, branch e autenticação concluída), sem inventar cabeçalhos. Respostas 401/403 invalidam o contexto e retornam `STENCI_SESSION_EXPIRED`, exigindo novo login interativo.

A busca envia `limit` (30 por padrão), `offset` (0 por padrão), `notFilterBranch=true` e `search`. O parâmetro `notFilterBranch=true` é preservado porque foi observado explicitamente no HAR. A resposta esperada contém `items` e `hasMore`; cada item possui os dados da pessoa em nível superior e o convênio atual em `patient.insurance`.

## Configuração

```dotenv
STENCI_ENABLED=false
STENCI_API_X_BASE_URL=https://api-x.stenci.pro
STENCI_API_BASE_URL=https://api.stenci.pro
STENCI_DEVICE_ID=
STENCI_BRANCH_ID=
STENCI_TIMEOUT_MS=10000
```

As URLs, o identificador persistente da instalação e a branch devem existir somente no `.env` do backend. A integração retorna um erro de configuração claro se `STENCI_DEVICE_ID` ou `STENCI_BRANCH_ID` estiver ausente. Senhas de funcionários nunca são configuradas no ambiente.

## Mapeamento e sincronização

`id`, `name`, identidade do tipo `cpf`, `birthDate`, `cellphone`/`phone` e `email` são mapeados para o paciente local. `identityId`, gênero, nome social, primeiro endereço e CNS ficam disponíveis como metadata da resposta, sem persistência obrigatória.

O convênio de `patient.insurance` mapeia `id`, `name`, `plan.name`, `record` e `validity`. Pacientes e operadoras são conciliados por `external_source=STENCI` mais `external_id`; a relação em `patient_insurances` é criada ou atualizada. Nenhum tratamento é criado durante essa sincronização.

Os únicos endpoints internos de paciente desta integração são:

- `GET /api/integrations/stenci/patients/search`;
- `POST /api/integrations/stenci/patients/:externalId/sync`.

Ambos exigem autenticação e permissão de criação em `guide_processes`, sem conceder acesso à tela administrativa de Integrações. Avaliações, agenda, sessões, tratamentos concluídos, relatórios e escrita no Stenci permanecem fora do escopo.
