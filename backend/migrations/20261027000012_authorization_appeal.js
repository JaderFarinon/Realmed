const values = ['NOT_READY','READY','IN_PROGRESS','PENDING','AUTHORIZED','DENIED','SESSION_TOKEN','NOT_REQUIRED','IN_APPEAL'];
exports.config = {transaction:false};
exports.up = async knex => {
  for (const [table,column,defaultValue] of [['guide_processes','authorization_status','NOT_READY'],['guide_authorizations','status',null]]) {
    await knex.raw(`ALTER TABLE ?? MODIFY COLUMN ?? ENUM(${values.map(() => '?').join(',')}) NOT NULL${defaultValue ? ' DEFAULT ?' : ''}`, [table,column,...values,...(defaultValue ? [defaultValue] : [])]);
  }
};
// Keep the enum value on rollback so recorded appeals and their history are preserved.
exports.down = async () => {};
