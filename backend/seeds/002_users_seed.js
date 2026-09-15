exports.seed = async function(knex) {
  await knex('users').del();

  await knex('users').insert([
    {
      id: 1,
      username: 'jader.farinon',
      password: '$2a$10$tiMKhTevX11CG99k1XgYPOswNvzfDGKsclStFeNUpidO478s/xgJC',
      person_id: 1,
      status: 'active',
      role: 'admin',
      created_at: '2025-06-11 21:38:39',
      updated_at: '2025-06-11 22:22:03',
      last_login: null
    }
  ]);
};
