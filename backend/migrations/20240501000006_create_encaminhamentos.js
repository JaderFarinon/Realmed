exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('encaminhamentos');
  if (exists) {
    return;
  }

  await knex.schema.createTable('encaminhamentos', table => {
    table.increments('id').primary();
    table.integer('encaminhador_id').unsigned().notNullable()
      .references('id').inTable('encaminhadores');
    table.integer('medico_id').unsigned().notNullable()
      .references('id').inTable('medicos');
    table.integer('paciente_id').unsigned().notNullable()
      .references('id').inTable('pacientes');
    table.integer('parceiro_id').unsigned().notNullable()
      .references('id').inTable('parceiros');
    table.integer('convenio_id').unsigned().notNullable()
      .references('id').inTable('convenios');
    table.text('observacoes');
    table.integer('status').notNullable().defaultTo(1);
    table.text('motivo_cancelamento');
    table.boolean('ie_status').notNullable().defaultTo(1);
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('encaminhamentos');
};
