const NEW_ROLES = [
  'masteradmin',
  'admin',
  'user',
  'doctor',
  'nurse',
  'pharmacist',
  'patient',
];

const OLD_ROLES = ['admin', 'doctor', 'nurse', 'pharmacist', 'patient'];

exports.up = async function up(knex) {
  const rolesList = NEW_ROLES.map((role) => `\'${role}\'`).join(', ');
  await knex.schema.raw(
    `ALTER TABLE users MODIFY COLUMN role ENUM(${rolesList}) NOT NULL DEFAULT 'user'`
  );
};

exports.down = async function down(knex) {
  const rolesList = OLD_ROLES.map((role) => `\'${role}\'`).join(', ');
  await knex.schema.raw(
    `ALTER TABLE users MODIFY COLUMN role ENUM(${rolesList}) NOT NULL DEFAULT 'patient'`
  );
};
