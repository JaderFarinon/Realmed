exports.up = function(knex) {
  return knex.schema.hasTable('people').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('people', table => {
      table.increments('id').primary();
      table.string('cpf', 14).notNullable();
      table.string('full_name', 150).notNullable();
      table.string('email', 150).notNullable();
      table.date('birth_date');
      table.string('phone', 20);
      table.string('avatar_url', 500);
      table.string('blood_type', 5);
      table.string('zip_code', 10);
      table.string('street', 100);
      table.string('number', 10);
      table.string('neighborhood', 60);
      table.string('city', 60);
      table.string('state', 2);
      table.string('gender', 20);
      table.string('marital_status', 30);
      table.string('nationality', 60);
      table.string('birthplace', 60);
      table.timestamps(true, true);
      table.unique('cpf', 'uk_people_cpf');
      table.unique('email', 'uk_people_email');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('people');
};
