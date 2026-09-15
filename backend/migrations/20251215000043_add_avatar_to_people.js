exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('people', 'avatar_url')
  if (!hasColumn) {
    await knex.schema.table('people', (table) => {
      table.string('avatar_url', 255)
    })
  }
}

exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn('people', 'avatar_url')
  if (hasColumn) {
    await knex.schema.table('people', (table) => {
      table.dropColumn('avatar_url')
    })
  }
}
