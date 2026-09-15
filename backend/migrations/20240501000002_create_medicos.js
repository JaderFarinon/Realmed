exports.up = function(knex) {
  return knex.schema.hasTable('medicos').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('medicos', table => {
      table.increments('id').primary();
      table.string('nome_completo',180).notNullable();
      table.date('data_nascimento');
      table.string('cpf',14);
      table.string('rg',20);
      table.string('crm_numero',20).notNullable();
      table.string('crm_numero_correcao',20);
      table.char('crm_uf',2).notNullable();
      table.string('conselho',80).notNullable().defaultTo('CRM');
      table.string('corpo_clinico',120);
      table.string('rqe',20);
      table.string('especialidade',120);
      table.string('subespecialidade',120);
      table.string('telefone_principal',20);
      table.string('email',160);
      table.string('endereco_logradouro',160);
      table.string('endereco_numero',20);
      table.string('endereco_comp',60);
      table.string('endereco_bairro',80);
      table.string('endereco_cidade',80);
      table.char('endereco_uf',2);
      table.string('endereco_cep',9);
      table.string('banco_nome',80);
      table.string('banco_agencia',20);
      table.string('banco_conta',30);
      table.enu('banco_tipo',['corrente','poupanca']);
      table.string('chave_pix',120);
      table.boolean('ie_status').notNullable().defaultTo(1);
      table.timestamps(true,true);
      table.integer('user_create').unsigned()
        .references('id').inTable('users')
        .onDelete('SET NULL')
        .onUpdate('CASCADE');
      table.unique(['crm_numero','crm_uf'],'uk_medicos_crm');
      table.unique('cpf','uk_medicos_cpf');
      table.unique('email','uk_medicos_email');
      table.index('nome_completo','idx_medicos_nome');
      table.index(['endereco_cidade','endereco_uf'],'idx_medicos_cidade');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('medicos');
};
