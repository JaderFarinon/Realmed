# Implantação Realmed

## Servidores

- Gateway SSH: `gate.paas.saveincloud.net.br:3022`.
- Proxy: usuário `235529-2628`, IP privado `10.100.39.155`, IP público observado `191.243.196.16`.
- Aplicação: usuário `225881-2628`, IP privado `10.100.67.92`.
- Autenticação: chave local carregada no Pageant. Não adicionar chave ou frase-senha ao repositório.
- Domínios: `realmed.qyvia.com.br` e `realmedapi.qyvia.com.br`.
- Certbot: e-mail `jadergfarinon@gmail.com`.

Alterar apenas recursos do Realmed. Nunca executar reinício global do PM2 nem modificar blocos Nginx de outros sistemas.

## Estrutura preparada

- `/qyvia/realmed/releases/initial`: primeira versão transferida.
- `/qyvia/realmed/shared/backend.env`: configuração privada, permissão 600; segredo JWT novo. Utiliza as credenciais existentes indicadas pelo usuário. Não alterar usuários ou estrutura do banco fora de migrations sem nova necessidade autorizada.
- `/qyvia/realmed/shared/storage`: documentos persistentes, ligados à versão.
- `/qyvia/realmed/logs`: logs exclusivos.
- Backend: porta 3013 no IP privado. Frontend compilado: Nginx na porta 5185.
- PM2 proposto: `realmed-api`, uma instância por causa das sessões em memória.
- Arquivo exclusivo no proxy: `/etc/nginx/sites-available/realmed`, ligado em `sites-enabled/realmed`.
- Desafio ACME: `/var/www/realmed-acme`.

## Estado em 14/10/2026

Build e TypeScript do frontend passaram. Os 62 testes de backend passaram no servidor.
Aplicação iniciada como `realmed-api` no PM2, com inicialização automática já disponível no servidor. Frontend compilado servido por bloco exclusivo no Nginx.

Banco e DNS confirmados pelo usuário:

1. O banco `realmed` é o mesmo utilizado no desenvolvimento. As 14 migrations já estavam aplicadas; nenhuma pendente. Nenhum dado ou schema alterado durante a implantação.
2. Registros A corrigidos para `191.243.196.16`. Resolvedores públicos confirmaram a mudança, mas caches locais podem levar mais tempo.
3. Certificado emitido para os dois domínios, validade inicial até 12/01/2027. Certbot timer ativo e hook exclusivo de recarga Nginx após renovação do certificado Realmed.
4. HTTPS do frontend respondeu 200; HTTPS da API respondeu `{"status":"ok"}`, com validação TLS.
5. Publicação automatizada validada com a versão `20261014-150244`; versão anterior `initial` preservada. Backend passou novamente nos 62 testes. Banco continua com os mesmos 2 pacientes, 3 tratamentos e 1 usuário; não há documentos ou templates cadastrados.
6. Estoque e permissões publicados em `20261014-153728`. Backup anterior à migration: `/qyvia/realmed/shared/backups/realmed-2026-10-14T18-37-44-546Z.sql`. A migration `20261014000001_create_inventory.js` adicionou o módulo sem alterar pacientes, tratamentos ou usuários. Total de migrations aplicadas: 15. Permissões habilitadas e administrador existente preservado. Os 69 testes e a verificação MySQL isolada passaram; leituras das novas rotas em produção retornaram 200 e logs de erro ficaram vazios.
7. Versão atual `20261014-154125`, incluindo acabamento responsivo dos formulários. Nenhuma migration adicional pendente. Links de estoque e permissões respondem 200 no proxy correto, e a API de estoque sem token responde 401. O resolvedor local do proxy ainda guarda o IP DNS antigo; verificação HTTPS foi realizada no IP correto com SNI e validação do certificado. Resolvedor público já confirma `191.243.196.16`.

## Publicação e rollback

Grupos do menu recolhíveis publicados em `20261014-165450`: Central de Guias, Estoque, Cadastros, Configurações e Integrações, com preferência independente por grupo. Verificação de teclado/celular/persistência e QA das listagens aprovados; build/TypeScript e 74 testes do backend aprovados na publicação. Nenhuma migration nova.

Menu recolhível publicado em `20261014-164756`: botão de três pontos verticais, preferência persistida no desktop e abertura/fechamento no celular. Build/TypeScript, 74 testes de backend, verificação do menu e QA das listagens aprovados. API saudável, logs exclusivos vazios e nenhuma migration nova.

Sessões Stenci temporárias publicadas em `20261014-164115`: logoff após validação do login e após consultas, reautenticação da mesma conta solicitada na interface, sem persistir senha/token externo. 74 testes aprovados no servidor; build/TypeScript e teste visual de reautenticação aprovados. Nenhuma migration nova, API saudável e logs de erro exclusivos vazios. A confirmação do efeito no contador de licenças Stenci depende de login real pelo usuário; o HAR não incluía contexto autenticado. Regras em `docs/STENCI_SESSOES_TEMPORARIAS.md`.

Padronização das telas publicada em `20261014-162132`, conforme `docs/PADRAO_DE_TELAS.md` e referência obrigatória no `AGENTS.md`. Build e TypeScript aprovados; 69 testes de backend aprovados; QA visual das 17 listagens em quatro resoluções, seleção, paginação, modais e permissões aprovado com dados fictícios. Nenhuma migration nova. HTTPS frontend 200, API saudável e logs de erro exclusivos vazios após publicação.

Executar `deploy/publish.ps1` com a chave desbloqueada no Pageant. O script compila frontend com a URL pública da API, empacota sem arquivos `.env`, transfere uma nova versão e executa `release.sh`. No servidor: instala dependências, executa testes, verifica migrations e só aplica pendências após backup exclusivo do banco Realmed. Versões antigas e storage são preservados.

A publicação troca atomicamente o link `current` e reinicia apenas `realmed-api`. Se o health check falhar, restaura o link anterior e reinicia apenas esse processo. Rollback é do código; migrations não são revertidas automaticamente. Novas migrations devem ser compatíveis com a versão anterior.

Última versão anterior registrada em `/qyvia/realmed/shared/previous-release`. Para rollback manual, verificar esse caminho e a compatibilidade do schema, trocar atomicamente o link `current`, executar `pm2 startOrRestart /qyvia/realmed/current/deploy/ecosystem.config.cjs --only realmed-api --update-env` e verificar `/api/health`.

## Pendências funcionais preservadas

1. Edição progressiva dos dados administrativos do tratamento.
2. Integração entre avaliação, ficha gerada e checklist documental.
3. Preservação dos estados de autorização ao alterar documentação.
4. Invalidação de acesso local após logout.
5. Reabertura de avaliação concluída com histórico.
6. Salvamento de convênio sem plano quando aplicável.
7. Correção dos campos clínicos e textos longos no PDF.
8. Proteção contra versões documentais duplicadas em geração simultânea.
9. Centralização das pendências de encaminhamento no backend.
10. Validação completa do fluxo clínico e mapeamento dos documentos em `docs/`.

## Operação após ativação

Consultar logs exclusivos em `/qyvia/realmed/logs` ou `pm2 logs realmed-api --nostream --lines 50`. Reinício: `pm2 restart realmed-api`; nunca `pm2 restart all`. Reinícios invalidam sessões Stenci em memória. A chave deve estar desbloqueada no Pageant para operações SSH locais. A publicação é executada sob solicitação; nenhum monitor ou agendamento de publicação foi criado.
