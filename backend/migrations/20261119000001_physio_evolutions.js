exports.config = { transaction: false };

exports.up = async db => {
  if (await db.schema.hasTable('physio_evolutions')) return;
  await db.schema.createTable('physio_evolutions', table => {
    table.bigIncrements('id').primary();
    table.string('branch_id', 100).notNullable();
    table.string('appointment_external_id', 100).notNullable();
    table.string('patient_external_id', 100).notNullable();
    table.string('schedule_external_id', 100).notNullable();
    table.integer('professional_id').unsigned().notNullable().references('id').inTable('professionals');
    table.integer('created_by').unsigned().notNullable().references('id').inTable('users');
    table.string('stenci_record_id', 100).nullable();
    table.string('stenci_template_id', 100).nullable();
    table.string('state', 24).notNullable().defaultTo('CREATING');
    table.string('content_hash', 64).notNullable();
    table.text('snapshot_envelope', 'longtext').nullable();
    table.date('service_date').notNullable();
    table.timestamp('finalized_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(db.fn.now());
    table.unique(['branch_id', 'appointment_external_id'], 'physio_evolution_appointment_uq');
    table.index(['branch_id', 'patient_external_id', 'state'], 'physio_evolution_patient_idx');
    table.unique(['branch_id', 'stenci_record_id'], 'physio_evolution_record_uq');
  });
};

// Finalized clinical snapshots and their Stenci bindings must survive code rollback.
exports.down = async () => {};
