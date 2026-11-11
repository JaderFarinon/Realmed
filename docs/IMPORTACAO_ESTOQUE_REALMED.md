# Importação do estoque anterior — 19/10/2026

O usuário confirmou que o PHP não está mais em uso e autorizou trazer o banco `estoque_realmed` para o estoque do Realmed. A origem permanece preservada. A importação usa uma captura consistente, sem senhas, com fingerprint SHA-256 `7004caf65550914387d09fff26d06fb35eb4efb72a7d47c0c817f3902d546659`.

## Conferência

| Conteúdo | Quantidade |
| --- | ---: |
| Produtos originais | 76 |
| Produtos excluídos recuperados como inativos | 4 |
| Notas fiscais / itens | 8 / 72 |
| Pedidos originais / recuperados | 14 / 5 |
| Itens de pedidos | 89 |
| Saldos por produto e setor | 100 |
| Unidades em estoque | 315 |
| Fotos vinculadas / ausentes | 76 / 0 |
| Registros de origem / registros sintéticos de recuperação | 381 / 13 |

Saldos por setor: Geral 38, Recepção 195 e Apoio 82. As notas e os pedidos são históricos: não são reaplicados como entradas ou saídas. Cada saldo recebe uma movimentação de abertura `LEGACY_OPENING`, evitando duplicação de estoque.

## Dados antigos que exigem revisão

- Produtos excluídos 102, 170, 172 e 173 foram recuperados com identificação explícita e inativos. O produto 102 possui três unidades, que continuam visíveis nos saldos. Não liberar atendimento sem identificar corretamente o produto.
- O fornecedor excluído 27 foi recuperado como cadastro inativo, preservando sua nota.
- Pedidos 3813 a 3817 tinham itens, mas não cabeçalho. São exibidos como “Revisar importação”, sem inventar data ou solicitante. Edite o pedido para confirmar esses dados; a API e a interface bloqueiam operações dos itens até essa confirmação.
- Nos demais pedidos, o setor foi obtido do cadastro antigo do solicitante, com a procedência registrada. Notas sem setor foram associadas ao Geral com observação explícita.
- Usuários e perfis antigos são preservados somente como metadados de procedência. Nenhuma senha, conta de acesso ou permissão é importada. Login continua exclusivamente pelo Stenci.

O administrador consulta a conferência em **Estoque → Resumo**. Os detalhes originais ficam em `inventory_import_records`, ligados à execução em `inventory_import_runs`.

## Arquivos e segurança de repetição

As 76 fotos foram identificadas pelas referências do banco no ZIP enviado pelo usuário. Os arquivos originais JPEG/PNG são validados e copiados com nomes SHA-256 para `storage/assets/products`. Dois arquivos sem referência permanecem no ZIP de backup.

Backups privados no servidor: `/qyvia/realmed/shared/backups/legacy-inventory`. A aplicação da migration também executa o backup de produção pelo fluxo de publicação. O importador salva uma cópia das tabelas de estoque antes de aplicar os dados.

`backend/scripts/import-legacy-inventory.cjs` faz apenas prévia sem `--apply`. A aplicação exige backup e administrador ativo, usa transação e reconcilia quantidades e contagens. Recusa uma primeira importação sobre estoque já movimentado. Repetir a mesma captura não duplica registros nem restaura saldos antigos; outra captura exige conciliação explícita.

Validação: testes unitários, importação em MySQL isolado com a captura real, rollback, repetição após alteração de saldo, bloqueio e correção de pedidos recuperados, e regressão do fluxo de estoque existente.
