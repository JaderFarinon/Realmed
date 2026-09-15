exports.up = function(knex) {
  return knex.schema.hasTable('paciente_convenios').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('paciente_convenios', table => {
      table.increments('id').primary();
      table.integer('paciente_id').unsigned().notNullable().references('id').inTable('pacientes').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('convenio_id').unsigned().notNullable().references('id').inTable('convenios').onUpdate('CASCADE');
      table.string('numero_carteirinha',60);
      table.date('validade_plano');
      table.boolean('ie_status').notNullable().defaultTo(1);
      table.timestamps(true,true);
      table.unique(['paciente_id','convenio_id','numero_carteirinha'],'uk_pconv_unique');
      table.index('convenio_id','fk_pconv_convenio');
      table.index('validade_plano','idx_pconv_validade');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('paciente_convenios');
};
