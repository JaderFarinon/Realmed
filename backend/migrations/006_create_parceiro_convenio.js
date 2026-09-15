exports.up = function(knex) {
  return knex.schema.hasTable('parceiro_convenio').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('parceiro_convenio', table => {
      table.increments('id').primary();
      table.integer('id_parceiro').unsigned().notNullable()
        .references('id').inTable('parceiros').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('id_convenio').unsigned().notNullable()
        .references('id').inTable('convenios').onDelete('CASCADE').onUpdate('CASCADE');
      table.datetime('dt_vinculo').defaultTo(knex.fn.now());
      table.string('usr_vinculo', 100);
      table.unique(['id_parceiro', 'id_convenio'], 'uq_parceiro_convenio');
      table.engine('InnoDB');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('parceiro_convenio');
};
