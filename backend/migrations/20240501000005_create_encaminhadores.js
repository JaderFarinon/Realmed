exports.up = function(knex) {
  return knex.schema.hasTable('encaminhadores').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('encaminhadores', table => {
      table.increments('id').primary();
      table.string('nome', 255).notNullable();
      table.string('cnpj', 20).notNullable();
      table.string('telefone', 30).notNullable();
      table.string('email', 100).notNullable();
      table.string('endereco', 255).notNullable();
      table.string('numero', 10).notNullable();
      table.string('bairro', 100).notNullable();
      table.string('cidade', 100).notNullable();
      table.string('estado', 100).notNullable();
      table.string('responsavel_tecnico', 100);
      table.string('tipo', 50);
      table.string('contato', 100);
      table.string('banco', 100);
      table.string('agencia', 30);
      table.string('conta', 30);
      table.string('pix', 120);
      table.text('obs');
      table.string('cep', 20).notNullable();
      table.string('uf', 2).notNullable();
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('encaminhadores');
};
