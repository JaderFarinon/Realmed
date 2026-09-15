exports.seed = async function(knex) {
  await knex('users').del();
  await knex('people').del();

  await knex('people').insert([
    {
      id: 1,
      cpf: '052.860.209-84',
      full_name: 'Jader Gabriel Farinon',
      email: 'jadergfarinon@gmail.com',
      birth_date: '1989-05-23',
      phone: '+5541992466980',
      blood_type: 'A+',
      zip_code: '82560020',
      street: 'Rua João Havro',
      number: '1361',
      neighborhood: 'Boa Vista',
      city: 'Curitiba',
      state: 'PR',
      gender: 'M',
      marital_status: 'Casado',
      nationality: 'Brasileira',
      birthplace: 'Francisco Beltrão',
      created_at: '2025-06-11 21:35:25',
      updated_at: '2025-06-11 21:39:09'
    }
  ]);
};
