exports.config = { transaction: false };
exports.up = async db => {
  if (!(await db.schema.hasTable('evaluation_booking_config'))) {
    await db.schema.createTable('evaluation_booking_config', t => {
      t.integer('id').primary();
      t.json('settings').notNullable();
      t.integer('revision').notNullable().defaultTo(0);
      t.integer('updated_by').unsigned().nullable();
      t.timestamp('updated_at').defaultTo(db.fn.now());
    });
    await db('evaluation_booking_config').insert({ id: 1, settings: JSON.stringify(require('../services/evaluationBooking').DEFAULT_CONFIG) });
  }
  if (!(await db.schema.hasTable('evaluation_booking_audit'))) await db.schema.createTable('evaluation_booking_audit', t => {
    t.increments('id'); t.integer('actor_id').unsigned().notNullable(); t.integer('revision').notNullable(); t.json('settings').notNullable(); t.timestamp('created_at').defaultTo(db.fn.now());
  });
};
exports.down = async () => {}; // Preserve configuration/audit when rolling back code.
