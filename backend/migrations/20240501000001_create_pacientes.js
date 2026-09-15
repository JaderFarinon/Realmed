exports.up = function(knex) {
  return knex.schema.hasTable('pacientes').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('pacientes', table => {
      table.increments('id').primary();
      table.string('nome_completo', 180);
      table.date('data_nascimento');
      table.enum('sexo', ['M','F','O']);
      table.string('genero', 50);
      table.string('cpf', 14);
      table.string('rg', 20);
      table.string('cartao_sus', 20);
      table.string('estado_civil', 30);
      table.string('nacionalidade', 60);
      table.string('naturalidade', 60);
      table.string('telefone_principal', 20);
      table.string('telefone_secundario', 20);
      table.string('email', 160);
      table.string('endereco_logradouro', 160);
      table.string('endereco_numero', 20);
      table.string('endereco_comp', 60);
      table.string('endereco_bairro', 80);
      table.string('endereco_cidade', 80);
      table.char('endereco_uf', 2);
      table.string('endereco_cep', 9);
      table.string('nome_mae', 180);
      table.string('nome_pai', 180);
      table.string('profissao', 120);
      table.text('alergias');
      table.text('condicoes_previas');
      table.text('obs_gerais');
      table.boolean('ie_status').notNullable().defaultTo(1);
      table.timestamps(true, true);
      table.unique('cpf', 'uk_pacientes_cpf');
      table.unique('cartao_sus', 'uk_pacientes_cartao_sus');
      table.unique('email', 'uk_pacientes_email');
      table.index('nome_completo', 'idx_pacientes_nome');
      table.index(['endereco_cidade', 'endereco_uf'], 'idx_pacientes_cidade');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pacientes');
};
