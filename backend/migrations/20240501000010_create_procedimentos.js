exports.up = function(knex) {
  return knex.schema.hasTable('procedimentos').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('procedimentos', table => {
      table.increments('id').primary();
      table.string('nome', 100).notNullable();
      table.text('descricao');
      table.text('orientacoes');
      table.string('codigo_tuss', 20);
      table.enu('tipo', ['Consulta', 'Exame', 'Cirurgia', 'Outros']).defaultTo('Outros');
      table.string('grupo', 50);
      table.integer('tempo_estimado');
      table.boolean('ativo').defaultTo(true);
      table.timestamp('criado_em').defaultTo(knex.fn.now());
      table
        .timestamp('atualizado_em')
        .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('procedimentos');
};
