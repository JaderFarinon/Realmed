# Integração Stenci (somente leitura)

Esta integração está **desabilitada por padrão** e não conhece rotas, autenticação ou payloads externos. Ela não altera o Stenci, não agenda, não envia autorizações e não executa sincronização automaticamente.

## Componentes

- `config.js`: lê configuração e mantém `endpoints` deliberadamente vazio até a análise do HAR.
- `StenciClient.js`: fronteira de HTTP, timeout e tradução de falhas. Não envia credenciais enquanto a autenticação não for conhecida.
- `StenciService.js`: operações conceituais de pacientes, avaliações, agendamentos, tratamentos e sessões.
- `StenciMapper.js`: único ponto de tradução de campos externos.
- `StenciPatientSyncService.js`: upsert local explícito por `STENCI + external_id`; por padrão só completa campos locais vazios.
- `StenciReconciliationService.js`: contratos de conciliação ainda não implementados.

## Variáveis

`STENCI_ENABLED`, `STENCI_BASE_URL`, `STENCI_USERNAME`, `STENCI_PASSWORD` e `STENCI_TOKEN`. Usuário/senha e token são alternativas possíveis, não requisitos simultâneos. A estratégia somente será escolhida após o HAR. Secrets nunca compõem a resposta de status ou metadata de logs.

## Checklist para o HAR

Antes de preencher `config.endpoints` e implementar autenticação/paginação, precisamos confirmar:

1. URL base e ambiente;
2. fluxo de login e renovação de sessão;
3. esquema de autenticação, cookies e tokens;
4. endpoints e payloads de pacientes, avaliações, agendamentos, tratamentos e sessões;
5. paginação, limites e ordenação;
6. nomes/formato/fuso dos filtros de data;
7. IDs estáveis do paciente, atendimento, tratamento e ciclo;
8. representação de profissionais e convênios;
9. campos que distinguem sessões previstas, realizadas e canceladas;
10. códigos e corpos de erro relevantes.

Não preencher `guide_processes.external_reference` até confirmar qual ID representa corretamente o tratamento/atendimento.
