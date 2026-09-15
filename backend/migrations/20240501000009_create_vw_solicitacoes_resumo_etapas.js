exports.up = function(knex) {
  return knex.schema
    .raw('DROP VIEW IF EXISTS vw_solicitacoes_resumo_etapas')
    .then(() => knex.schema.raw(`
      CREATE VIEW vw_solicitacoes_resumo_etapas AS
      SELECT
        sc.id AS solicitacao_id,
        sc.paciente_id,
        sc.medico_id,
        sc.convenio_id,
        sc.data_solicitacao,
        sc.data_ultima_consulta,
        sc.status AS status_solicitacao,
        MAX(CASE WHEN se.etapa = 'CARDIO' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS cardio_concluido,
        MAX(CASE WHEN se.etapa = 'APA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS apa_concluido,
        MAX(CASE WHEN se.etapa = 'LIBERACAO_GUIA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_guia_concluida,
        MAX(CASE WHEN se.etapa = 'LIBERACAO_OPME' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_opme_concluida,
      SUM(CASE WHEN se.status IN ('PENDENTE', 'ATRIBUIDO') THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ('EM_ANDAMENTO', 'PARADO', 'ATRASADO') THEN 1 ELSE 0 END) AS etapas_em_andamento,
        SUM(CASE WHEN se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS etapas_concluidas
      FROM solicitacoes_cirurgia sc
      LEFT JOIN esteira_procedimento_etapas se ON se.solicitacao_id = sc.id
      GROUP BY
        sc.id,
        sc.paciente_id,
        sc.medico_id,
        sc.convenio_id,
        sc.data_solicitacao,
        sc.data_ultima_consulta,
        sc.status;
    `));
};

exports.down = function(knex) {
  return knex.schema.raw('DROP VIEW IF EXISTS vw_solicitacoes_resumo_etapas');
};
