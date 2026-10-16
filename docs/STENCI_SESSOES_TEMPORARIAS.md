# Stenci: autenticação e consultas temporárias

Decisão de 14/10/2026: encerrar a sessão externa após validação/consulta para evitar ocupar uma licença durante todo o uso do Realmed. O usuário escolheu solicitar novamente o login Stenci quando forem necessários dados novos.

## Login Realmed

1. Credenciais recebidas exclusivamente pelo login.
2. Device ID novo; auth → branch Realmed → me, preservando prefixo `JWT` e token pós-branch.
3. Sincronização do usuário local.
4. `POST https://api-x.stenci.pro/v1/logout`, sem corpo, usando o contexto autenticado vigente; aceitar resposta 204 sem tentar ler JSON.
5. Somente após logoff concluído, emitir JWT Realmed e guardar contexto independente: identificador externo, device/branch e cache vazio. Não guardar senha, cookie ou token externo.

O wrapper `withTransientStenci` encerra o contexto em `finally`, inclusive em erro de branch, identidade, sincronização ou consulta. Falha de logoff é tentada novamente uma vez; se continuar, responder `STENCI_LOGOUT_FAILED`, sem afirmar sucesso. 401/403 no próprio logoff são tratados como contexto já inválido. Uma falha de rede pode impedir o encerramento remoto: não prometer liberação da licença nessa condição.

## Consultas durante o uso

- APIs de pacientes, convênios, planos e profissionais consultam cache exclusivo do `sid` Realmed, com validade de 10 minutos e limite de 100 consultas. Nenhuma chamada externa ocorre ao reutilizar cache.
- Cache ausente/expirado responde `428 STENCI_REFRESH_REQUIRED`. O frontend agrupa consultas simultâneas em uma janela de credenciais, usando `ListDetailDialog`.
- `POST /api/integrations/stenci/refresh` aceita apenas operações permitidas e no máximo oito por requisição. Valida novamente a identidade estável, exige a mesma conta do login e respeita as permissões operacionais.
- Dados são consultados enquanto a sessão externa está aberta. O servidor faz logoff antes de publicar os resultados no cache e devolver sucesso. Consultas de pacientes seguem os parâmetros solicitados, sem baixar todos os pacientes nem presumir endpoints adicionais.
- Frontend repete somente a consulta que solicitou os dados, uma vez. Cancelamento e credenciais externas inválidas mantêm a sessão Realmed e os campos do formulário. Senha é apagada do campo ao enviar e ao fechar a janela.
- Consulta de outro termo/página ou cache expirado pode exigir novo login Stenci. Senhas não são guardadas para reautenticação automática.
- Teste de conexão também é temporário; a tela exibe “Validado — sessão encerrada”.

Cache e sessão Realmed ficam em memória e são apagados no logout/expiração ou reinício. Não persistir dados de autenticação externa no JWT, frontend, banco, logs ou documentos. Não criar conta técnica fixa.

## Evidência e limites

O HAR fornecido mostrou `POST /v1/logout` com resposta 204, sem corpo, token ou cookie capturado. Ele comprova a forma da chamada, mas não demonstra a liberação de licença de uma sessão autenticada. A implementação envia o contexto autenticado do usuário, não um POST anônimo. A liberação efetiva no contador Stenci precisa ser confirmada com um login real e observação das licenças; testes simulados não comprovam essa regra do fornecedor.

Sessões abertas pela versão antiga não podem ser recuperadas da memória após reinício para fazer logoff. Se ainda aparecerem no Stenci, encerrá-las pelo próprio Stenci; a versão nova não mantém novos tokens externos.

## Verificação

`npm test --prefix backend`: autenticado/bodyless/204, token pós-branch, encerramento em falhas, repetição de logoff, bloqueio de sucesso sem encerramento, identidade diferente, credenciais inválidas e cache.

`npm run build --prefix frontend` e, com Vite local em 5186, `node frontend/scripts/verify-stenci-refresh.cjs`: agrupamento de catálogos, erro/correção da senha, retomada da busca, cancelamento, celular e ausência de senha no storage. Testes usam dados fictícios, sem contas Stenci reais.
