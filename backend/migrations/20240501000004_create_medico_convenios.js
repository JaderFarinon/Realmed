exports.up = function(knex) {
  return knex.schema.hasTable('medico_convenios').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('medico_convenios', table => {
      table.increments('id').primary();
      table.integer('medico_id').unsigned().notNullable().references('id').inTable('medicos').onDelete('CASCADE').onUpdate('CASCADE');
      table.integer('convenio_id').unsigned().notNullable().references('id').inTable('convenios').onUpdate('CASCADE');
      table.string('cod_credenciado',40);
      table.boolean('ie_status').notNullable().defaultTo(1);
      table.timestamps(true,true);
      table.unique(['medico_id','convenio_id'],'uk_mconv_unique');
      table.index('convenio_id','fk_mconv_convenio');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('medico_convenios');
};
