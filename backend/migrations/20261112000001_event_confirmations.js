exports.up = async db => {
  await db.schema.createTable('event_confirmations', t => {
    t.increments('id');
    t.string('event_slug', 80).notNullable();
    t.string('submission_key', 36).notNullable();
    t.string('payload_hash', 64).notNullable();
    t.string('participant_name', 120).notNullable();
    t.json('companion_names').notNullable();
    t.integer('companion_count').unsigned().notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    t.unique(['event_slug', 'submission_key']);
    t.index(['event_slug', 'created_at']);
  });
};
exports.down = async () => {}; // Preserve submitted confirmations on application rollback.
