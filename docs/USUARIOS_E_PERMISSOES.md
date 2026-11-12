# Usuários e permissões

## Eventos — 12/11/2026

Permissão independente `events` (Eventos — Confirmações), agrupada em Eventos na matriz. Visualizar permite abrir Eventos → Confraternização 2026 e consultar confirmações, acompanhantes e totais. API exige autenticação e `events/view`, revalidando perfil/status/permissão no banco. Administradores seguem o acesso integral existente; não conceder permissões automaticamente. Conta somente de Eventos pode iniciar nessa tela. Não há ações administrativas de criação/edição/exclusão de confirmações neste módulo. O formulário público continua sem login e sem exposição da lista. A revisão geral das permissões foi explicitamente adiada pelo usuário; a integração deste módulo é validada isoladamente.

## Fisioterapeutas locais e sino administrativo — 11/11/2026

Conta LOCAL pode receber vínculo de fisioterapeuta e cadastro facial. Exige usuário ativo, perfil User, profissional ativo PHYSIOTHERAPIST/CREFITO e unicidade do vínculo. Substitui a restrição histórica de contas locais no modo fisioterapeuta. Entrada facial ou por senha abre a área própria; consultas usam exclusivamente a conta compartilhada configurada no servidor, limitadas às agendas vinculadas. Outros módulos e integrações permanecem sujeitos à matriz individual; sem concessão automática. Tipo de autenticação continua imutável.

Login por senha bem-sucedido de fisioterapeuta vinculado cria aviso persistente para admin/masteradmin, com nome do usuário, profissional e horário. Sino ao lado do menu do usuário mostra novas notificações, com leitura individual e paginação. API revalida perfil/status no banco; usuário comum não lê nem marca avisos administrativos. Facial, senha incorreta e renovação de conexão não geram aviso. Migration `20261111000001_system_notifications.js` preserva histórico no rollback. Testes em `deploy/test-physio-shared-access.cjs`.

## Acesso por módulo e edição da matriz — 09/11/2026

A entrada pelo login, raiz ou logo escolhe a primeira tela com Visualizar concedido; contas somente de estoque não são encaminhadas ao dashboard de tratamentos. Sem módulos, abrir Meu Perfil. Links diretos sem autorização continuam exibindo Sem Permissão, preservando a sessão. Não conceder permissões automaticamente.

A matriz individual agrupa funções por módulo, permite pesquisar/filtrar e oferece Habilitar tudo, Sem excluir, Só visualizar e Limpar para as funções exibidas. Cada função também tem Todas. Criar, editar e excluir exigem Visualizar; retirar Visualizar limpa as outras ações. Administradores mantêm acesso total e a matriz fica em consulta. Salvar permanece no rodapé do modal.

Permitir criar requisições/retiradas exige setor ativo, validado também na transação da API. Sem excluir concede visualizar/criar/editar e mantém excluir/inativar negados. As rotas de faturamento por guia exigem permissões de tratamentos somente nos próprios endpoints: esse middleware não pode bloquear outras rotas montadas em /api, como Estoque. Teste isolado deploy/test-inventory.cjs verifica conta somente de estoque, ações permitidas, exclusão negada, isolamento de tratamentos e revogação imediata.

## Meu Perfil — 09/11/2026

Qualquer conta ativa pode editar o próprio nome, e-mail e telefone em Meu Perfil. PUT /api/auth/me usa somente o ID do JWT e rejeita campos adicionais: não altera login, CPF, tipo de autenticação, perfil administrativo, permissões ou situação. Alterações são locais ao Realmed; não enviam atualizações ao Stenci. Contas locais podem trocar a senha em POST /api/auth/me/password, com senha atual, nova senha e confirmação; manter mínimo de 12 caracteres e máximo de 72 bytes do bcrypt. Provider e situação são revalidados no banco sob lock, independentemente do JWT. Tentativas de senha são limitadas por usuário. Cadastro e auditoria são transacionais; troca usa hash bcrypt e registra somente o evento, nunca senha/hash na auditoria ou resposta. Header atualiza os dados pessoais salvos sem modificar as permissões em memória. Não há migration nova. Teste isolado: deploy/test-self-profile.cjs.


## Tipos de conta de autenticação — 06/11/2026

No cadastro administrativo, escolha uma conta vinculada ao Stenci ou uma conta local do Realmed. A conta local recebe login e senha próprios, armazenados somente como hash bcrypt; a senha não é enviada ao Stenci, não é salva em texto puro e não pode ser recuperada. A senha local precisa ter pelo menos 12 caracteres e no máximo 72 bytes. Login local tem limite de tentativas e emite a sessão Realmed sem criar sessão Stenci. Contas locais não usam integração Stenci genérica; a exceção é a área do fisioterapeuta com vínculo explícito e conexão compartilhada, descrita acima. O tipo de autenticação é imutável após a criação. Contas Stenci continuam usando a senha do próprio Stenci e o fluxo de integração já existente. Permissões seguem a matriz individual e nenhuma é concedida automaticamente a usuários novos.

Revisão de 20/10/2026. Naquele momento, o login era exclusivamente pelo Stenci. Desde 06/11/2026, o administrador também pode escolher uma conta local independente, conforme a regra acima; contas do tipo Stenci continuam sem senha local.

## Cadastro da equipe

1. Um administrador abre Configurações → Usuários e escolhe o tipo de conta. Para Stenci, informa o mesmo login do Stenci e o cadastro aguarda o primeiro acesso para vinculação pelo identificador externo. Para Realmed, define login e senha locais. E-mail, telefone e CPF são opcionais; CPF informado como login é normalizado preservando zeros iniciais.
2. Usuários Stenci já autenticados anteriormente também aparecem na lista. Contas novas, locais ou vinculadas, não recebem permissões operacionais automaticamente nem acesso administrativo.
3. Selecionar a linha e usar Gerenciar permissões. Marcar Visualizar e as ações necessárias em cada função. Salvar registra auditoria e as novas permissões são consultadas pela API e pela navegação.
4. Usar o perfil Usuário para acessos limitados. Administrador e Administrador principal têm acesso integral e gerenciam permissões. Perfis antigos de Médico, Enfermagem, Farmacêutico e Paciente continuam preservados, mas também dependem da matriz individual.

Configurações → Permissões permite administrar a matriz diretamente, além de setor e perfil do estoque. Visualizar é obrigatório para criar, editar ou excluir. Permissões de consumo e compras são independentes e não são atribuídas automaticamente.

## Menu e proteção

Todas as opções do menu permanecem visíveis. Clicar em uma tela não autorizada, inclusive por URL direta, abre **Sem Permissão**, com a mensagem “Usuário sem permissão a essa função”. Uma negativa de permissão não encerra a sessão. Grupos recolhidos podem ser expandidos normalmente.

O backend revalida perfil e situação do usuário no banco, sem confiar no perfil antigo do JWT. A API também bloqueia chamadas diretas e exige a ação correspondente. A configuração de produção deve manter `PERMISSIONS_ENABLED=true`.

## Bloqueio e identidade

Bloquear preserva usuário, pessoa, permissões e relacionamentos históricos; a rota DELETE existente passa a bloquear, sem exclusão física. Um novo login Stenci não reativa contas bloqueadas ou inativas. Um administrador pode restabelecer o status na edição. Ninguém pode bloquear o próprio acesso ou alterar seu próprio perfil administrativo. Administradores comuns não gerenciam o Administrador principal.

Login e CPF de uma conta já vinculada devem ser alterados no Stenci. A sincronização mantém o vínculo externo e não substitui permissões por permissões do Stenci. Alterações de cadastro, bloqueio e matriz são registradas em `permission_audit`, sem senhas.

## Limites atuais

A matriz é individual por módulo e ação, sem modelos reutilizáveis de cargo. “Editar / operar” em Gestão de Tratamentos ainda reúne operações da avaliação e da Central de Guias. Separar esses papéis exige uma evolução explícita das permissões das operações clínicas; o rótulo de perfil profissional não faz essa separação. O dashboard operacional também usa o acesso de Gestão de Tratamentos, enquanto Faturamento tem permissão própria.

## Verificação

`deploy/test-user-permissions.cjs` usa banco local descartável para testar cadastro sem senha, vínculo, CPF com zero, auditoria, bloqueio, proteção do próprio administrador, concessão/revogação e rejeição de JWT com perfil desatualizado. Testes de autenticação verificam rejeição de contas bloqueadas/inativas e logoff remoto mesmo ao negar o login. `frontend/scripts/verify-screen-pattern.cjs` verifica o menu visível e a página de acesso negado.

As correções desta revisão não exigem migration própria. Publicadas em 20/10/2026, com release ativo `20261020-160159`, após liberação do armazenamento MySQL. Cadastro e permissões autenticados responderam HTTP 200 em produção; testes locais cobriram concessão/revogação e bloqueio sem criar usuários fictícios em produção.

## Perfis operacionais — decisão de 20/10/2026

Oferecer somente **Admin** e **User** nos cadastros novos. Admin gerencia equipe e permissões e pode atribuir Admin a outros; User acessa somente módulos/ações explicitamente liberados. Novos logins Stenci criam usuário local User e atualizam último acesso, sem sobrescrever perfil/permissões existentes. O usuário administrador indicado pelo responsável foi confirmado ativo e vinculado em produção; não existe promoção automática por CPF no login. Não importar todos os colaboradores Stenci: a lista contém contas que já entraram no Realmed ou foram pré-cadastradas. A tabela mostra o último acesso. Compatibilidade técnica com registros legados é preservada; nenhum novo perfil legado é aceito pelo cadastro.


## Faturamento por guia — 28/10/2026

Ver [FATURAMENTO_POR_GUIA.md](FATURAMENTO_POR_GUIA.md). Consulta pode ir a Faturar após avaliação, simultaneamente à liberação. Cobrar a consulta não fatura fisioterapia/eletro; estas retornam a Faturar ao concluir sessões. O dashboard permite sobreposição da fila Faturar e conta total distinto. Permissão própria guide_billing, sem concessão automática.
