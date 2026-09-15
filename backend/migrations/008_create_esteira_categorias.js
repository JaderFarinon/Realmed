exports.up = function(knex) {
  return knex.schema.hasTable('esteira_categorias').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('esteira_categorias', table => {
      table.increments('id').primary();
      table.string('nome', 255).notNullable();
      table.integer('convenio_id').unsigned().notNullable()
        .references('id').inTable('convenios').onDelete('CASCADE').onUpdate('CASCADE');
      table.string('unidade', 255).notNullable();
      table.timestamps(true, true);
      table.unique(['convenio_id', 'unidade', 'nome'], 'uq_esteira_categoria');
      table.engine('InnoDB');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('esteira_categorias');
};
