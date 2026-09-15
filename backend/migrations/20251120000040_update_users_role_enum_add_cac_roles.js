const NEW_ROLES = [
  'masteradmin',
  'admin',
  'cac_coord',
  'cac',
  'secretaria',
  'user',
  'doctor',
  'nurse',
  'pharmacist',
  'patient',
];

const PREVIOUS_ROLES = [
  'masteradmin',
  'admin',
  'user',
  'doctor',
  'nurse',
  'pharmacist',
  'patient',
];

const buildAlterRoleSql = (roles) => {
  const enumValues = roles.map((role) => `\'${role}\'`).join(', ');
  return `ALTER TABLE users MODIFY COLUMN role ENUM(${enumValues}) NOT NULL DEFAULT 'user'`;
};

exports.up = async function up(knex) {
  await knex.schema.raw(buildAlterRoleSql(NEW_ROLES));
};

exports.down = async function down(knex) {
  await knex.schema.raw(buildAlterRoleSql(PREVIOUS_ROLES));
};
