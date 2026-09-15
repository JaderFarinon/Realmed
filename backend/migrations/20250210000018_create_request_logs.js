exports.up = function(knex) {
  return knex.schema.hasTable('request_logs').then(exists => {
    if (exists) {
      return undefined;
    }

    return knex.schema.createTable('request_logs', table => {
      table.engine('InnoDB');
      table.increments('id').primary();
      table.integer('user_id').unsigned().nullable()
        .references('id').inTable('users')
        .onDelete('SET NULL').onUpdate('CASCADE');
      table.string('method', 10).notNullable();
      table.string('endpoint', 255).notNullable();
      table.integer('status_code').notNullable();
      table.text('request_body');
      table.text('response_body');
      table.string('ip_address', 45);
      table.decimal('response_time_ms', 10, 2);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('user_id', 'idx_request_logs_user_id');
      table.index('created_at', 'idx_request_logs_created_at');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('request_logs');
};
