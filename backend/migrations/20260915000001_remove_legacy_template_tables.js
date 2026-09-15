const LEGACY_VIEWS = ['vw_solicitacoes_resumo_etapas']
const LEGACY_TABLES = [
  'sorteio_participantes','sorteios','support_request_messages','support_requests',
  'unit_sqlserver_databases','user_units','units','marketing_campanhas','internal_chat_messages',
  'ia_messages','ia_chats','ia_settings','request_logs','not_incidentes_planos_acao',
  'not_incidentes','motivos_pendencia','esteira_notificacoes','esteira_procedimento_chat_cirurgia',
  'esteira_procedimento_chat','esteira_procedimento_etapa_anexos','esteira_responsavel_historico',
  'esteira_procedimento_secretarias','esteira_procedimento_cac_users','esteira_procedimento_pendencia',
  'esteira_procedimento_motivo_canc','esteira_procedimento_etapas','parametros_esteira_procedimento',
  'esteira_perfil_permissoes','esteira_perfis','solicitacao_etapas','solicitacoes_procedimentos',
  'solicitacoes_cirurgia','encaminhamentos','encaminhadores','parceiro_convenio_procedimento',
  'procedimentos','procedimento_etapas','esteira_categorias','procedimento_tipos','medico_convenios',
  'paciente_convenios','medicos','pacientes','parceiro_convenio','parceiros','convenios',
  'contrato_alertas','contrato_templates','contrato_negociacoes','contrato_aditivos','contratos',
]
exports.up = async (knex) => {
  if (!(await knex.schema.hasColumn('people', 'avatar_url'))) {
    await knex.schema.alterTable('people', (table) => table.string('avatar_url', 500))
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const view of LEGACY_VIEWS) await knex.raw('DROP VIEW IF EXISTS ??', [view])
    for (const table of LEGACY_TABLES) await knex.schema.dropTableIfExists(table)
  } finally { await knex.raw('SET FOREIGN_KEY_CHECKS = 1') }
}
exports.down = () => Promise.resolve()
