# Estoque no Realmed

Referência analisada: `C:\Users\jader\Desktop\Dev\Estoqy`, principalmente models `mestoque`, `mpedido`, `mitempedido`, `mproduto`, `mnotafiscal`, `mitemnota`, `mdashboard`, controllers e atualizações SQL 007–012.

## Fluxo preservado

1. Cadastrar setores, categorias, apresentações, fornecedores e produtos. Códigos numéricos são normalizados com seis dígitos; código em branco na criação é gerado automaticamente. Categorias, apresentações e fornecedores podem ser inativados e reativados por edição.
2. Vincular o usuário Realmed a um setor e perfil de estoque em Configurações → Permissões.
3. Criar nota fiscal, adicionar produtos e quantidades. Cada item movimenta imediatamente o saldo; alteração aplica a diferença e exclusão estorna a entrada. Fechar a nota bloqueia alterações.
4. Criar pedido com solicitante e data. O setor do solicitante é capturado no pedido e não acompanha mudanças futuras de cadastro. Adicionar produtos e quantidades solicitadas.
5. Atender quantidade total ou parcial usando exclusivamente o saldo daquele setor. Falta de saldo marca o item como Aguardando compra sem alterar quantidade atendida ou saldo. O estado do pedido agrega os estados dos itens na mesma precedência do PHP.
6. Conferir saldos consolidados ou por setor, quantidade mínima, itens zerados, resumo, consumo, compras e histórico. Listas permitem pesquisa, exportação CSV/Excel, cópia e impressão/PDF pelo navegador.

Perfis: administradores Realmed acessam todos os setores e solicitantes; coordenadores visualizam saldos de todos os setores e solicitam para usuários do próprio setor; gestores visualizam saldos de todos os setores e solicitam para si; usuário comum visualiza seu setor e solicita para si. Pedidos de usuários comuns podem aparecer na lista do setor, mas detalhes/alterações são restritos ao próprio solicitante, coordenador do setor e administradores, como no modelo PHP.

## Permissões

Usa `user_permissions` existente, com visualizar, criar, editar/operar e excluir/inativar por função. Atendimento de pedidos possui permissão separada. Administradores acessam todas as funções e gerenciam usuários autenticados pelo Stenci. Novos usuários comuns precisam receber permissões; ausência de permissão não equivale a liberação. Mudanças são registradas em `permission_audit`.

Menus nunca são ocultados por falta de permissão. Rotas e API negam acesso com a mensagem "Usuário sem permissão a essa função". Negativa de autorização não apaga o token de login. A API verifica o papel atual no banco para não confiar em um JWT com perfil administrativo antigo.

## Correções deliberadas em relação ao legado

- Transações, índice único produto/setor e bloqueio das linhas impedem dupla baixa e saldo negativo em operações simultâneas.
- Alteração de quantidade de nota usa `nova - antiga`; mudança de produto estorna o anterior e recebe o novo. O trigger legado tinha uma diferença de quantidade invertida.
- Não permite excluir ou alterar itens já parcialmente atendidos, nem mudar setor/solicitante de pedido com atendimento. Isso preserva o histórico das baixas.
- Cadastros são inativados, preservando referências históricas.
- Nota com itens não muda de setor; uma redução/estorno que exceda o saldo disponível é rejeitada integralmente.
- Fotos por arquivo ou URL pública são convertidas na interface para miniaturas de até 120 × 120, com upload máximo de 2 MB. URLs não podem acessar redes privadas; redirects são revalidados.
- Compras e relatórios respeitam o contexto de setor; não reproduz a exposição global de algumas consultas antigas.
- Não copia autenticação PHP, senhas, triggers antigos nem dados do banco Estoqy. O login Stenci e as tabelas do Realmed permanecem como base.

## Validação

Testes de regras em `backend/test/inventory-workflow.test.js`, permissões em `backend/test/module-permissions.test.js` e verificação MySQL isolada em `deploy/test-inventory.cjs`. Esta última cria e remove somente um banco temporário com prefixo `realmed_verify_`, sem alterar dados do Realmed.
