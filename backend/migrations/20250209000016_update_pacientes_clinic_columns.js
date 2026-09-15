const TABLE_NAME = 'pacientes'
const CLINIC_INDEX = 'idx_pacientes_clinic_id'

const columnsToAdd = [
  { name: 'clinic_id', definition: (table) => table.integer('clinic_id').unsigned().nullable() },
  { name: 'telefone_comercial', definition: (table) => table.string('telefone_comercial', 20) },
  { name: 'telefone_celular', definition: (table) => table.string('telefone_celular', 20) },
  { name: 'endereco_responsavel', definition: (table) => table.string('endereco_responsavel', 160) },
  { name: 'telefone_responsavel', definition: (table) => table.string('telefone_responsavel', 20) },
  { name: 'indicador', definition: (table) => table.string('indicador', 120) },
  { name: 'codigo_convenio_clinic', definition: (table) => table.string('codigo_convenio_clinic', 30) },
  { name: 'codigo_medico_clinic', definition: (table) => table.string('codigo_medico_clinic', 30) },
  { name: 'auditoria', definition: (table) => table.string('auditoria', 120) },
  { name: 'codigo_raca', definition: (table) => table.string('codigo_raca', 30) },
  { name: 'internet_senha', definition: (table) => table.string('internet_senha', 120) },
  {
    name: 'internet_logado',
    definition: (table) => table.boolean('internet_logado').notNullable().defaultTo(0),
  },
  { name: 'vinculo', definition: (table) => table.string('vinculo', 120) },
  { name: 'plano', definition: (table) => table.string('plano', 120) },
  { name: 'data_cadastro_clinic', definition: (table) => table.dateTime('data_cadastro_clinic') },
  { name: 'cpf_pai', definition: (table) => table.string('cpf_pai', 14) },
  { name: 'cpf_mae', definition: (table) => table.string('cpf_mae', 14) },
  {
    name: 'telefone_residencial_complemento',
    definition: (table) => table.string('telefone_residencial_complemento', 10),
  },
  {
    name: 'telefone_comercial_complemento',
    definition: (table) => table.string('telefone_comercial_complemento', 10),
  },
  {
    name: 'telefone_celular_complemento',
    definition: (table) => table.string('telefone_celular_complemento', 10),
  },
  { name: 'ficha_pai', definition: (table) => table.string('ficha_pai', 120) },
  { name: 'nome_social', definition: (table) => table.string('nome_social', 180) },
  { name: 'uniao_homoafetiva', definition: (table) => table.boolean('uniao_homoafetiva').notNullable().defaultTo(0) },
  { name: 'tea', definition: (table) => table.boolean('tea').notNullable().defaultTo(0) },
]

const hasColumn = (knex, column) => knex.schema.hasColumn(TABLE_NAME, column)

const indexExists = async (knex, indexName) => {
  const [rows] = await knex.raw('SHOW INDEX FROM ?? WHERE Key_name = ?', [TABLE_NAME, indexName])
  return Array.isArray(rows) ? rows.length > 0 : rows[0]?.length > 0
}

exports.up = async function up(knex) {
  for (const column of columnsToAdd) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await hasColumn(knex, column.name)
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await knex.schema.alterTable(TABLE_NAME, (table) => {
        column.definition(table)
      })
    }
  }

  const hasClinicIndex = await indexExists(knex, CLINIC_INDEX)
  if (!hasClinicIndex) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.index(['clinic_id'], CLINIC_INDEX)
    })
  }
}

exports.down = async function down(knex) {
  const hasClinicIndex = await indexExists(knex, CLINIC_INDEX)
  if (hasClinicIndex) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropIndex(['clinic_id'], CLINIC_INDEX)
    })
  }

  for (const column of columnsToAdd.slice().reverse()) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await hasColumn(knex, column.name)
    if (exists) {
      // eslint-disable-next-line no-await-in-loop
      await knex.schema.alterTable(TABLE_NAME, (table) => {
        table.dropColumn(column.name)
      })
    }
  }
}
