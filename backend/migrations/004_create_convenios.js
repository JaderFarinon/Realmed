exports.up = function(knex) {
  return knex.schema.hasTable('convenios').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('convenios', table => {
      table.increments('id').primary();
      table.string('nome', 255).notNullable();
      table.string('registro_ans', 30);
      table.string('telefone', 30);
      table.string('email', 100);
      table.engine('InnoDB');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('convenios');
};
