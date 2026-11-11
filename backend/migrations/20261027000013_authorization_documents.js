exports.up = async knex => {
  if (await knex.schema.hasTable('guide_authorization_documents')) return;
  await knex.schema.createTable('guide_authorization_documents', t => {
    t.increments('id').primary();
    t.integer('guide_process_id').unsigned().notNullable().references('id').inTable('guide_processes').onDelete('RESTRICT');
    t.string('file_path',255).notNullable();
    t.string('original_name',255).notNullable();
    t.string('mime_type',100).notNullable().defaultTo('application/pdf');
    t.bigInteger('file_size').unsigned().notNullable();
    t.integer('uploaded_by').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['guide_process_id','id'],'idx_guide_auth_docs_process');
  });
};
// Retain attachments and their audit references on rollback.
exports.down = async () => {};
