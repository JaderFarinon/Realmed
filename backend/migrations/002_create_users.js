exports.up = function(knex) {
  return knex.schema.hasTable('users').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('users', table => {
      table.increments('id').primary();
      table.string('username', 100).notNullable().unique();
      table.string('password', 255).notNullable();
      table.integer('person_id').unsigned().notNullable()
        .references('id').inTable('people').onDelete('CASCADE').onUpdate('CASCADE');
      table.enu('status', ['active', 'inactive', 'blocked']).defaultTo('active');
      table.enu('role', ['admin', 'masteradmin', 'user', 'doctor', 'nurse', 'pharmacist', 'patient']).defaultTo('patient');
      table.timestamps(true, true);
      table.datetime('last_login');
      table.index('person_id', 'idx_users_person');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
