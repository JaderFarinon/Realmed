const expandedRoles = [
  'admin',
  'masteradmin',
  'user',
  'doctor',
  'nurse',
  'pharmacist',
  'patient'
];

const originalRoles = ['admin', 'doctor', 'nurse', 'pharmacist', 'patient'];

const buildRoleAlterSql = (roles) => {
  const enumList = roles.map((role) => `'${role}'`).join(',');
  return `ALTER TABLE \`users\` MODIFY \`role\` ENUM(${enumList}) DEFAULT 'patient'`;
};

exports.up = function up(knex) {
  return knex.raw(buildRoleAlterSql(expandedRoles));
};

exports.down = function down(knex) {
  return knex.raw(buildRoleAlterSql(originalRoles));
};
