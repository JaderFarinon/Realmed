exports.up = function(knex) {
  return knex.schema.hasTable('parceiros').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('parceiros', table => {
      table.increments('id').primary();
      table.string('nome', 255).notNullable();
      table.string('cnpj', 20);
      table.string('telefone', 30);
      table.string('email', 100);
      table.string('endereco', 255);
      table.string('numero', 10);
      table.string('bairro', 100);
      table.string('cidade', 100);
      table.string('estado', 2);
      table.string('responsavel_tecnico', 100);
      table.string('tipo', 50);
      table.string('contato', 100);
      table.string('banco', 100);
      table.string('agencia', 30);
      table.string('conta', 30);
      table.string('pix', 120);
      table.text('obs');
      table.string('cep', 20);
      table.string('uf', 2);
      table.engine('InnoDB');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('parceiros');
};
