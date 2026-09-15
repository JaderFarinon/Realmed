const { addUserReferenceColumn, shouldUseUnsignedUserId } = require('./_helpers/usuario');

exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('medicos');
  if (!exists) return;

  const hasConselho = await knex.schema.hasColumn('medicos', 'conselho');
  const hasCorpoClinico = await knex.schema.hasColumn('medicos', 'corpo_clinico');
  const hasCrmNumeroCorrecao = await knex.schema.hasColumn('medicos', 'crm_numero_correcao');
  const hasUserCreate = await knex.schema.hasColumn('medicos', 'user_create');
  const hasUsersTable = await knex.schema.hasTable('users');
  const useUnsignedUserId = (!hasUserCreate && hasUsersTable)
    ? await shouldUseUnsignedUserId(knex)
    : false;

  await knex.schema.alterTable('medicos', (table) => {
    if (!hasConselho) {
      table.string('conselho', 80).defaultTo('CRM');
    }
    if (!hasCorpoClinico) {
      table.string('corpo_clinico', 120);
    }
    if (!hasCrmNumeroCorrecao) {
      table.string('crm_numero_correcao', 20);
    }
    if (!hasUserCreate) {
      if (hasUsersTable) {
        addUserReferenceColumn(table, 'user_create', useUnsignedUserId);
      } else {
        table.integer('user_create');
      }
    }
  });
};

exports.down = async function (knex) {
  const exists = await knex.schema.hasTable('medicos');
  if (!exists) return;

  const hasConselho = await knex.schema.hasColumn('medicos', 'conselho');
  const hasCorpoClinico = await knex.schema.hasColumn('medicos', 'corpo_clinico');
  const hasCrmNumeroCorrecao = await knex.schema.hasColumn('medicos', 'crm_numero_correcao');
  const hasUserCreate = await knex.schema.hasColumn('medicos', 'user_create');

  await knex.schema.alterTable('medicos', (table) => {
    if (hasConselho) {
      table.dropColumn('conselho');
    }
    if (hasCorpoClinico) {
      table.dropColumn('corpo_clinico');
    }
    if (hasCrmNumeroCorrecao) {
      table.dropColumn('crm_numero_correcao');
    }
    if (hasUserCreate) {
      table.dropColumn('user_create');
    }
  });
};
