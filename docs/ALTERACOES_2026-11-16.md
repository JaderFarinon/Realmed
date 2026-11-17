# Alterações — 16/11/2026

## Visão do fisioterapeuta para administradores

- Cadastros → Profissionais: botão de olho **Ver visão do fisio** na lista e botão correspondente dentro do cadastro salvo.
- Abre o mesmo app do tablet em nova aba, no contexto do profissional escolhido, sem solicitar novo login ou reconhecimento facial.
- Agenda, pacientes, produção e configurações usam os vínculos reais daquele profissional. O acesso administrativo permite abrir pacientes fora do horário da sessão, consultar avaliação concluída e testar o questionário de evolução.
- Identificação permanente no cabeçalho e aviso de visualização administrativa. A conta do administrador permanece conectada; acesso normal do fisio mantém os bloqueios de horário.
- Conexão Stenci separada por administrador/profissional, auditoria da abertura e revalidação de papel/vínculo. Nenhuma gravação clínica habilitada; permanece a dependência do contrato Stenci de reabertura completo.

## Validação

Build e TypeScript aprovados; 226 testes backend aprovados. Integração MySQL descartável verificou permissões, isolamento por agenda, expiração, criação concorrente, auditoria e consultas clínicas sem limite de horário somente na visão administrativa. Navegador validou botão/nova aba, token preservado, avaliação, questionário e layout em tablet/celular. Regressão do modo normal preservou bloqueio passado/futuro, horário do servidor, encaixes e expiração do detalhe.

## Publicação

Release final **20261116-090329** publicada, asset `index-B36LR2X_.js`. A inicial `20261116-090125` aplicou a migration `20261116000001_physio_admin_preview_audit` após backup; a final não tinha pendências. Build/TypeScript e **226 testes backend** aprovados localmente e no servidor.

Interface publicada validada com APIs sintéticas, sem dados fictícios em produção. Cadastro/vínculo e tabela de auditoria conferidos por leitura; rota administrativa sem login retorna 401, frontend/saúde HTTPS 200. Hash do serviço ativo coincide com o arquivo validado. Não houve gravação clínica nem alteração de agendas no Stenci.

Dependências preservadas em `20261109-153438/backend/node_modules`, com manifests idênticos. Rollback imediato: `20261116-090125`; versão anterior à entrega: `20261113-121311`. Auditoria permanece preservada no rollback.

## Convite da confraternização — destaque do custo do acompanhante

- Mantido exatamente o texto original: “A sua parte já está garantida por nossa conta! Caso queiram levar acompanhante, vai ser ótimo, só lembre que a parte do acompanhante fica por conta de vocês.”
- Destaque somente visual: card amarelo/dourado, borda e fonte um pouco maior, preservando a ordem e o formato original da mensagem. Removido o título alternativo sobre custo e o ícone introduzidos na primeira versão.
- Limite de um acompanhante, campos, confirmação e frase abaixo do botão preservados. Texto original restaurado e publicado na release `20261116-094955`, asset `index-Co1VXYL8.js`, sem migration. Build/TypeScript e 226 testes backend no servidor aprovados; convite publicado conferido em 320/390 px e desktop com confirmações simuladas; site/API 200. Dependências preservadas em `20261109-153438/backend/node_modules`; rollback imediato `20261116-090850`.

## Reserva de edição e reconexão da Avaliação

- Corrigida a expiração indevida causada pela comparação com o relógio do computador. Erro reproduzido com PC quatro horas adiantado; agora o prazo usa somente horários enviados pelo servidor e contagem monotônica.
- Reconexão/retorno à janela conferem a reserva; confirmação da mesma janela restaura a edição, preservando o rascunho. Novo botão **Conferir edição** para a situação ainda incerta, sem identificar incorretamente outra janela.
- Mantidos **Recuperar edição** para outra janela da mesma conta, bloqueio entre contas diferentes, etapas finalizadas e rascunhos somente em memória. Nenhuma reserva real foi removida ou transferida manualmente.
- Validação: build/TypeScript, 226 testes backend, integração MySQL descartável de reservas e interface com relógio +4h, alterações para 2040/2000, renovação, reconexão, expiração real, disputa entre janelas, permissões e rascunho preservado. Salvamento automático de 60 segundos conferido, incluindo digitação durante gravação e falha/recuperação. APIs do navegador simuladas.
- Publicado na release **20261116-112111**, asset `index-Dj6VBQ-K.js`. Os 226 testes passaram novamente no servidor, sem migrations pendentes; site/API HTTP 200. Interface publicada validada com APIs simuladas e arquivo backend ativo conferido por SHA-256. Dependências preservadas em `20261109-153438/backend/node_modules`; rollback `20261116-094955`.

## Permissões de usuários e dependências na matriz

- Corrigidos bloqueios de Tratamentos e Modelos provocados por consultas auxiliares que exigiam acesso a outros cadastros.
- Acesso negado em ação/consulta mantém a tela e o rascunho, com aviso destacado. Navegação/API continuam protegidas por módulo e ação.
- Selecionar função dependente abre confirmação com os acessos necessários; só marca após aprovação. Cancelar preserva a matriz. Retirar acesso que sustenta outras funções também pede confirmação.
- API valida dependências antes de salvar; acesso administrativo continua separado. Matriz e permissões da sessão são consultadas sem cache; checkboxes funcionam com teclado. Contas locais consultam os convênios locais sem tentativa indevida de integração.
- Validação: 226 testes backend, build/TypeScript, navegador com login real e banco local descartável (25 telas operacionais com User, persistência dos checkboxes, concessão/revogação, quatro ações, rascunho preservado, cascata com consentimento e modais responsivos), além das integrações completas de estoque e usuários/permissões. Nenhuma conta real promovida/rebaixada ou permissão real alterada.
- Publicado na release `20261116-170823`, asset `index-D6Ctopm8.js`. Build/TypeScript, padrão compartilhado de telas e 226 testes backend também no servidor aprovados, nenhuma migration pendente. Site/API saudáveis, hashes do catálogo/rotas/matriz iguais aos locais e cascata da interface publicada conferida com APIs sintéticas, sem gravações de contas reais. Dependências preservadas em `20261109-153438/backend/node_modules`; rollback `20261116-112111`.
