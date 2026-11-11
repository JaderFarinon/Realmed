# Estoque no Realmed

09/11/2026: contas somente de estoque entram na primeira tela autorizada, sem exigir acesso a Tratamentos. A validação de faturamento por guia foi limitada aos próprios endpoints para não interceptar a API do estoque. A matriz tem atalhos por módulo, incluindo Sem excluir; excluir/inativar continuam ações independentes. Criar requisições/retiradas exige setor ativo, validado no servidor. Nenhuma permissão é concedida automaticamente.

## Decisão atual — Consumo e compras separados (19/10/2026)

Esta decisão substitui o uso de Pedidos como retirada/atendimento no fluxo abaixo. **Requisições para Consumo** registra os produtos que o usuário logado está retirando. O solicitante e a data/hora são definidos pelo servidor. Confirmar registra todos os itens, baixa o saldo do setor e grava movimentos CONSUMPTION na mesma transação; saldo insuficiente, produto inativo ou item inválido cancela toda a retirada. Não admite produto repetido, quantidade negativa/fracionada ou setor sem acesso. Chave por operação/usuário impede dupla baixa em reenvios, inclusive simultâneos. Registros confirmados são somente leitura; correções de saldo continuam pela função administrativa de ajustes, com justificativa.

**Pedidos de Compra** mantém a URL `/estoque/pedidos` e passa a conter pedidos de compra em rascunho. O botão **Gerar pedido automático pelo estoque mínimo** considera todos os produtos ativos com saldo do setor igual ou menor que o mínimo, incluindo saldo inexistente (zero) e mínimo zero. Não considera produtos inativos. Sugere `max(1, mínimo - saldo)` unidades; valores de saldo/mínimo ficam registrados como referência da geração. O botão somente cria o rascunho e o abre para revisão. O comprador pode alterar quantidades, adicionar/remover produtos e editar observações. Edições têm revisão para rejeitar sobrescrita de alterações concorrentes. Não efetua compras, envia mensagens ou altera estoque; o recebimento continua por nota fiscal. Repetir a mesma tentativa de geração com a mesma chave recupera o pedido; uma nova geração deliberada cria outro rascunho com a posição atual, sem descontar pedidos abertos do saldo físico.

Os pedidos e atendimentos antigos permanecem intactos em **Requisições Anteriores**, `/estoque/requisicoes-anteriores`, com os endpoints anteriores. Não converter históricos de consumo em compras nem baixar novamente itens importados. Resumo e relatórios incluem as novas retiradas e identificam os pedidos antigos separadamente.

Permissões distintas: `inventory_consumptions` (visualizar/criar retiradas), `inventory_purchase_orders` (visualizar/criar/editar compras) e `inventory_requests` (histórico/fluxo anterior). Administradores/masteradmin acessam; os demais precisam de liberação em Configurações → Permissões. Nenhuma nova permissão é concedida automaticamente. Retiradas usam o próprio usuário; comum só acessa suas retiradas no setor, coordenador vê seu setor, administrador pode operar todos. Compras respeitam o setor; coordenador/gestor com permissão pode acessar os setores do seu contexto ampliado. Menu continua visível e acesso negado não encerra a sessão.

Migration aditiva `20261019000005_consumption_and_purchase_orders.js`: cabeçalhos/itens de retiradas e compras, vínculo de movimento à retirada, chaves de reenvio e revisão dos pedidos. Não altera saldos ou registros anteriores. Validação: `deploy/test-inventory.cjs`, `frontend/scripts/verify-stock-operations.cjs` e padrão de telas.

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

## Importação autorizada em 19/10/2026
A decisão atual substitui a orientação anterior de não copiar dados antigos. O estoque PHP foi descontinuado e seus dados e fotos foram incorporados com procedência e conciliação. Consulte [Importação do estoque anterior](IMPORTACAO_ESTOQUE_REALMED.md). Nenhuma conta ou permissão antiga é importada.

Seleção de materiais em Requisições para Consumo e Pedidos de Compra usa `SearchableSelect`: digitar nome ou código filtra as sugestões, que exibem saldo e mínimo. Selecionar não registra retirada; é necessário adicionar à lista e confirmar a operação.
