exports.up = function(knex) {
  return knex.schema.hasTable('parceiro_convenio_procedimento').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('parceiro_convenio_procedimento', table => {
      table.increments('id').primary();
      table.integer('id_parceiro_convenio').unsigned().notNullable()
        .references('id').inTable('parceiro_convenio').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('id_procedimento').unsigned().notNullable()
        .references('id').inTable('procedimentos').onDelete('CASCADE').onUpdate('CASCADE');
      table.decimal('preco', 10, 2).notNullable();
      table.unique(['id_parceiro_convenio', 'id_procedimento'], 'uq_parceiro_conv_proc');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('parceiro_convenio_procedimento');
};
