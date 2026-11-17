exports.config = { transaction: false };
exports.up = async db => {
  if (!(await db.schema.hasTable('patient_portal_access'))) await db.schema.createTable('patient_portal_access', t => {
    t.integer('patient_id').unsigned().primary().references('id').inTable('patients');
    t.string('token_hash', 64).notNullable().unique();
    t.text('token_envelope').notNullable();
    t.integer('created_by').unsigned().notNullable();
    t.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    t.timestamp('revoked_at').nullable();
  });
};
exports.down = async () => {}; // Preserve already issued patient links on application rollback.
