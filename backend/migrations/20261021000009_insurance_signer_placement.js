exports.up = knex => knex.schema.alterTable('insurance_provider_signatures', t => t.json('placement').nullable());
exports.down = knex => knex.schema.alterTable('insurance_provider_signatures', t => t.dropColumn('placement'));
