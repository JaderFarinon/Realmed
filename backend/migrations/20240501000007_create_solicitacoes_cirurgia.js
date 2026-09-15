exports.up = function(knex) {
  return knex.schema.hasTable('solicitacoes_cirurgia').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('solicitacoes_cirurgia', table => {
      table.increments('id').primary();
      table.integer('paciente_id').unsigned().notNullable().references('id').inTable('pacientes').onUpdate('CASCADE');
      table.integer('medico_id').unsigned().notNullable().references('id').inTable('medicos').onUpdate('CASCADE');
      table.integer('convenio_id').unsigned().references('id').inTable('convenios').onDelete('SET NULL').onUpdate('CASCADE');
      table.date('data_solicitacao').notNullable();
      table.date('data_ultima_consulta');
      table.text('observacoes');
      table
        .enu('status', ['PENDENTE', 'EM_ANDAMENTO', 'AGENDADA', 'CANCELADA', 'CONCLUIDO'])
        .notNullable()
        .defaultTo('PENDENTE');
      table.timestamps(true, true);
      table.index('paciente_id', 'fk_solic_paciente');
      table.index('data_solicitacao', 'idx_solic_data');
      table.index('status', 'idx_solic_status');
      table.index('medico_id', 'idx_solic_medico');
      table.index('convenio_id', 'idx_solic_convenio');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('solicitacoes_cirurgia');
};
