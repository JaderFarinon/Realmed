exports.up = async db => {
  if (!await db.schema.hasTable('physio_admin_preview_audit')) await db.schema.createTable('physio_admin_preview_audit', t => {
    t.increments('id');
    t.integer('actor_id').unsigned().notNullable().references('id').inTable('users');
    t.integer('professional_id').unsigned().notNullable().references('id').inTable('professionals');
    t.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    t.index(['actor_id', 'created_at']);
  });
};
exports.down = db => db.schema.dropTableIfExists('physio_admin_preview_audit');
