exports.config={transaction:false};
exports.up=async knex=>{
  if(!await knex.schema.hasColumn('guide_processes','treatment_root_id')) await knex.schema.alterTable('guide_processes',t=>{t.integer('treatment_root_id').unsigned().nullable().references('id').inTable('guide_processes').onDelete('RESTRICT');});
  if(!await knex.schema.hasColumn('guide_processes','continuation_of_id')) await knex.schema.alterTable('guide_processes',t=>{t.integer('continuation_of_id').unsigned().nullable().unique().references('id').inTable('guide_processes').onDelete('RESTRICT');});
  if(!await knex.schema.hasColumn('guide_processes','guide_number')) await knex.schema.alterTable('guide_processes',t=>{t.integer('guide_number').unsigned().notNullable().defaultTo(1);t.unique(['treatment_root_id','guide_number'],'uk_treatment_guide_number');});
  await knex('guide_processes').whereNull('treatment_root_id').update({treatment_root_id:knex.ref('id')});
};
// Preserve linked guides, evaluation snapshots and their provenance.
exports.down=async()=>{};
