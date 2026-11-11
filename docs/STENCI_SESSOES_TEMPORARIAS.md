# Stenci: autenticação e consultas temporárias

## Contas locais Realmed — 06/11/2026

O cadastro administrativo também permite contas autenticadas exclusivamente pelo Realmed. Seu `password_hash` usa bcrypt; senha em texto puro nunca é armazenada. Para uma conta `auth_provider=LOCAL`, o login emite JWT Realmed sem `sid` Stenci, sem autenticar no fornecedor e sem criar envelope de credenciais. Rotas de consulta/atualização Stenci devem rejeitar essa conta com `STENCI_NOT_AVAILABLE_FOR_LOCAL_ACCOUNT`; não tentar fallback nem solicitar credenciais Stenci. Essas contas não participam do vínculo facial/profissional nem do modo fisioterapeuta. O fluxo abaixo aplica-se a `auth_provider=STENCI`.

Decisão de 14/10/2026, atualizada por solicitação do usuário em 19/10/2026: encerrar a sessão externa após validação/consulta para evitar ocupar uma licença durante todo o uso do Realmed. Agora as credenciais são guardadas criptografadas apenas na memória do servidor durante a sessão Realmed, permitindo novo login/logoff automático sem solicitar a senha a cada consulta. Isso substitui a decisão inicial de pedir credenciais a cada atualização.

## Login Realmed

1. Credenciais recebidas exclusivamente pelo login.
2. Device ID novo; auth → branch Realmed → me, preservando prefixo `JWT` e token pós-branch.
3. Sincronização do usuário local.
4. `POST https://api-x.stenci.pro/v1/logout`, sem corpo, usando o contexto autenticado vigente; aceitar resposta 204 sem tentar ler JSON.
5. Somente após logoff concluído, emitir JWT Realmed e guardar contexto independente: identificador externo, device/branch e cache vazio. Guardar usuário/senha criptografados em um envelope separado do contexto público, exclusivamente em memória. Não guardar cookie ou token externo.

O wrapper `withTransientStenci` encerra o contexto em `finally`, inclusive em erro de branch, identidade, sincronização ou consulta. Falha de logoff é tentada novamente uma vez; se continuar, responder `STENCI_LOGOUT_FAILED`, sem afirmar sucesso. 401/403 no próprio logoff são tratados como contexto já inválido. Uma falha de rede pode impedir o encerramento remoto: não prometer liberação da licença nessa condição.

## Consultas durante o uso

- APIs de pacientes, convênios, planos e profissionais consultam cache exclusivo do `sid` Realmed, com validade de 10 minutos e limite de 100 consultas. Nenhuma chamada externa ocorre ao reutilizar cache.
- Cache ausente/expirado inicia autenticação temporária automaticamente no backend usando as credenciais da sessão. Consultas simultâneas são agrupadas por `sid` (até oito operações) e serializadas, inclusive entre abas. Não há logins simultâneos dentro da mesma sessão Realmed.
- `POST /api/integrations/stenci/refresh` aceita apenas operações permitidas e no máximo oito por requisição. Aceita credenciais explícitas para recuperação ou reutiliza o envelope da sessão. Valida novamente a identidade estável, exige a mesma conta do login e respeita as permissões operacionais. Credenciais explícitas só atualizam o envelope após consulta e logoff bem-sucedidos.
- Dados são consultados enquanto a sessão externa está aberta. O servidor faz logoff antes de publicar os resultados no cache e devolver sucesso. Consultas de pacientes seguem os parâmetros solicitados, sem baixar todos os pacientes nem presumir endpoints adicionais.
- `428 STENCI_REFRESH_REQUIRED` e janela de credenciais ocorrem apenas quando o envelope está ausente, inválido ou a senha deixou de autenticar. Nesse caso o frontend agrupa as pendências na janela existente e repete a consulta uma vez. Cancelamento e credenciais externas inválidas mantêm a sessão Realmed e os campos do formulário. Senha é apagada do campo ao enviar e ao fechar a janela.
- Outro termo/página ou cache expirado usa autenticação automática. Falha de rede ou de logoff não remove uma credencial válida nem publica cache novo. Uma resposta 401/403 da API operacional durante consulta temporária não encerra a sessão Realmed. Senha inválida ou identidade diferente elimina o envelope, sem consultar dados da conta divergente.
- Teste de conexão também é temporário; a tela exibe “Validado — sessão encerrada”.
- O cliente aguarda até 90 segundos para consultas automáticas/filas. Cada lote externo tem orçamento de 35 segundos para autenticação e consultas, com limite de 10 segundos por chamada. O logoff permanece permitido após esgotar esse orçamento e reserva até duas tentativas de 10 segundos; falhas não publicam novos resultados.

Cache, sessão Realmed e envelope ficam em memória e são apagados no logout/expiração ou reinício. O prazo do envelope não ultrapassa a expiração do JWT Realmed. Logout durante consulta impede republicar cache/credenciais; o logoff remoto continua obrigatório. Não persistir dados de autenticação externa no JWT, frontend, banco, arquivos, logs ou documentos. Não criar conta técnica fixa.

## Criptografia da credencial temporária

`StenciSessionStore` usa AES-256-GCM com chave aleatória privada por instância do store, IV aleatório de 12 bytes, tag de 16 bytes e AAD com `sid` e identidade externa. A chave não usa o JWT secret e não é salva em configuração. O envelope tem apenas IV, ciphertext e tag; usuário e senha estão ambos cifrados. Outra sessão/store não pode reutilizá-lo; adulteração elimina o envelope. Referência: [Node.js — Crypto](https://nodejs.org/api/crypto.html).

Buffers temporários de texto são zerados após cifrar/decifrar; buffers do envelope são zerados ao descartá-lo. A credencial decifrada só permanece referenciada durante a operação, sendo liberada no `finally`. Strings JavaScript não permitem garantia de zeragem física da memória; a proteção não cobre comprometimento do processo em execução. O browser envia senha somente no login ou recuperação explícita; consultas normais não a reenviam. Sessões antigas não têm senha recuperável: após atualizar a versão, entrar novamente no Realmed.

## Evidência e limites

O HAR fornecido mostrou `POST /v1/logout` com resposta 204, sem corpo, token ou cookie capturado. Ele comprova a forma da chamada, mas não demonstra a liberação de licença de uma sessão autenticada. A implementação envia o contexto autenticado do usuário, não um POST anônimo. A liberação efetiva no contador Stenci precisa ser confirmada com um login real e observação das licenças; testes simulados não comprovam essa regra do fornecedor.

Sessões abertas pela versão antiga não podem ser recuperadas da memória após reinício para fazer logoff. Se ainda aparecerem no Stenci, encerrá-las pelo próprio Stenci; a versão nova não mantém novos tokens externos.

## Verificação

`npm test --prefix backend`: login e buscas HTTP sem senha adicional, envelope cifrado/adulterado/entre sessões, descarte por expiração do JWT/logout/reinício, lotes simultâneos serializados, autenticado/bodyless/204, token pós-branch, encerramento em falhas, orçamento de tempo sem bloquear logoff, repetição de logoff, bloqueio de sucesso sem encerramento, identidade diferente, credenciais inválidas e cache.

`npm run build --prefix frontend` e, com Vite local em 5186, `node frontend/scripts/verify-stenci-refresh.cjs`: abertura de Novo Tratamento e busca sem janela de senha, ausência de credencial nas requisições normais/storage, agrupamento da recuperação de catálogos, erro/correção da senha, retomada da busca, cancelamento e celular. Testes usam dados fictícios, sem contas Stenci reais.

## Exceção autorizada — conta exclusiva do coletor (20/10/2026)

O usuário autorizou explicitamente persistir uma credencial de conta Stenci exclusiva para coleta diária mesmo sem usuários conectados. A exceção não muda sessões interativas. Somente billingCollectorCredentials lê/grava a credencial técnica AES-256-GCM, chave separada e arquivos protegidos 0600 em diretório 0700 fora do release/banco/frontend. Janela local envia por stdin SSH, sem senha em argumentos/logs/arquivo temporário de texto. Identidade/branch são fixadas na validação e conferidas em cada sessão do coletor. Cada lote auth → branch → me → consultas → logout em finally; nenhum snapshot é publicado antes de confirmar o encerramento. Não usar a conta exclusiva no login de usuários, não compartilhar tokens com sessões e não prolongar licenças para manter rotina. Ver docs/FATURAMENTO_ANALITICO.md.

A atualização explícita do paciente em tratamento existente usa `/api/integrations/stenci/treatments/:id/refresh-patient` e ignora cache para a leitura de origem. A operação só sincroniza o cadastro após a consulta e o logoff confirmados. Exige editar tratamentos, sem exigir criar tratamentos. Recuperação de credencial via 428 utiliza a janela existente e repete a operação uma vez, mantendo a sessão Realmed e o rascunho clínico.


## Rodízio de fisioterapia — 28/10/2026

Ver [RODIZIO_FISIOTERAPIA.md](RODIZIO_FISIOTERAPIA.md). A seção 7 da avaliação integra indicação de profissional por agendas ativas da Realmed Matriz, sem avaliação, com tolerância de 25 minutos e verificação de todas as sessões. Configuração explícita de agendas por administrador; indicação não agenda no Stenci.

## Exceção autorizada — conta Stenci compartilhada da fisioterapia (29/10/2026)

O modo tablet `/modo-fisio/entrar` identifica individualmente o profissional no Realmed, mas consulta o Stenci com a conta compartilhada configurada por `STENCI_FISIO_USERNAME` e `STENCI_FISIO_PASSWORD` nos secrets do servidor. Essa exceção foi autorizada pelo usuário para habilitar login facial de um toque. As credenciais não são persistidas no banco, filesystem, navegador ou JWT: após auth/branch/me/logoff confirmados, a sessão recebe o envelope AES-256-GCM em memória associado ao `sid`, com remoção em logout, expiração ou reinício. A associação de agenda e identidade permanece individual no Realmed. Isso não altera o login Stenci dos demais usuários nem as regras específicas do coletor.
