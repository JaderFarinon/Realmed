# Relatório diário de faltas consecutivas

Identificação da listagem — 10/11/2026: a tabela externa identifica o relatório por Faltas Recorrentes e data/hora de emissão (São Paulo), com data de referência, início do histórico e total de pacientes. Não usar um paciente como identificação do relatório. Selecionar a linha e Abrir relatório mostra a tabela dos pacientes em ListDetailDialog, preservando pesquisa, histórico individual, paginação e impressão completa. A consulta continua representando o relatório atual da API; não criar arquivo/histórico persistido de emissões. Critérios de inclusão, dados e impressão permanecem inalterados.

Faturamento → Relatórios (`/faturamento/relatorios`), permissão independente `billing_reports`, sem concessão automática. Menu visível mesmo sem acesso.

Por decisão do usuário de 20/10/2026, incluir pacientes com falta na data selecionada e pelo menos **três faltas consecutivas incluindo a do dia**. Ordenar os agendamentos cronologicamente por identidade Stenci; deduplicar IDs. Comparecimentos interrompem a sequência. Status pendentes ou desconhecidos também interrompem, conservadoramente. Cancelamentos, remarcações e horários livres são ignorados. A contagem é por agendamento, não por dia; não há identificação segura de séries de tratamento distintas.

Consultar todos os status do histórico é necessário para identificar comparecimentos entre faltas. Apenas a sequência final de faltas aparece nos totais e detalhes. Histórico incompleto é sinalizado em tela e na impressão; confirmar antes do contato.

Filtro de data, início do histórico e pesquisa de paciente. Impressão A4 paisagem contém todas as linhas filtradas, independente da paginação, e espaço para registrar retorno da Telefonia no papel. Não imprime nem telefona automaticamente. Telefone vem somente do cadastro local com identidade e fonte Stenci correspondentes; ausente exige consultar Stenci. Não persiste resultados clínicos ou contatos no navegador.

Reutiliza snapshots da coleta diária e permite solicitar atualização da data. Não exige migration nova. API protegida por autenticação e permissão atual do banco.
