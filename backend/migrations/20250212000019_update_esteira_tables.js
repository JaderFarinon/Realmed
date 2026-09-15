const VIEW_NAME = 'vw_solicitacoes_resumo_etapas'
const SOLICITACAO_ETAPAS_CANDIDATES = ['esteira_procedimento_etapas', 'solicitacao_etapas']

const TABLE_RENAMES = [
  { from: 'solicitacoes_proc', to: 'esteira_procedimento' },
  { from: 'solicitacao_instrumentadores', to: 'esteira_procedimento_instrumentador' },
  { from: 'solicitacao_procedimentos', to: 'esteira_procedimento_procedimento' },
  { from: 'solicitacao_materiais', to: 'esteira_procedimento_material' },
  { from: 'solicitacao_alergias_alimentos', to: 'esteira_procedimento_al_alim' },
  { from: 'solicitacao_alergias_medicamentos', to: 'esteira_procedimento_al_med' },
  { from: 'procedimento_etapas', to: 'esteira_procedimento_etapa' },
  { from: 'procedimento_tipos', to: 'esteira_procedimento_tipos' },
  { from: 'motivos_pendencia', to: 'esteira_procedimento_mot_pend' },
  { from: 'motivo_pendencia_etapas', to: 'esteira_procedimento_mot_pend_etapa' },
]

const MAIN_TABLE = 'esteira_procedimento'
const AUXILIARY_TABLES = {
  esteira_procedimento_instrumentador: {
    renameFrom: 'solicitacao_id',
    columns: (table, knex) => {
      table.increments('id').primary()
      table
        .integer('esteira_procedimento_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(MAIN_TABLE)
        .withKeyName('fk_epi_est_proc')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('nome', 180).notNullable()
      table.timestamps(true, true)
      table.index(['esteira_procedimento_id'], 'idx_est_proc_instr_proc')
    },
  },
  esteira_procedimento_procedimento: {
    renameFrom: 'solicitacao_id',
    columns: (table, knex) => {
      table.increments('id').primary()
      table
        .integer('esteira_procedimento_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(MAIN_TABLE)
        .withKeyName('fk_epp_est_proc')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.integer('procedimento_id').unsigned().nullable()
      table.string('descricao', 255).nullable()
      table.timestamps(true, true)
      table.index(['esteira_procedimento_id'], 'idx_est_proc_proc_proc')
    },
  },
  esteira_procedimento_material: {
    renameFrom: 'solicitacao_id',
    columns: (table, knex) => {
      table.increments('id').primary()
      table
        .integer('esteira_procedimento_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(MAIN_TABLE)
        .withKeyName('fk_epm_est_proc')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.integer('material_id').unsigned().nullable()
      table.string('descricao', 255).notNullable()
      table.timestamps(true, true)
      table.index(['esteira_procedimento_id'], 'idx_est_proc_material_proc')
    },
  },
  esteira_procedimento_al_alim: {
    renameFrom: 'solicitacao_id',
    columns: (table, knex) => {
      table.increments('id').primary()
      table
        .integer('esteira_procedimento_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(MAIN_TABLE)
        .withKeyName('fk_epaa_est_proc')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('descricao', 255).notNullable()
      table.timestamps(true, true)
      table.index(['esteira_procedimento_id'], 'idx_est_proc_alim_proc')
    },
  },
  esteira_procedimento_al_med: {
    renameFrom: 'solicitacao_id',
    columns: (table, knex) => {
      table.increments('id').primary()
      table
        .integer('esteira_procedimento_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable(MAIN_TABLE)
        .withKeyName('fk_epam_est_proc')
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
      table.string('descricao', 255).notNullable()
      table.timestamps(true, true)
      table.index(['esteira_procedimento_id'], 'idx_est_proc_med_proc')
    },
  },
}

const DOWN_AUXILIARY_TABLES = [
  'solicitacao_instrumentadores',
  'solicitacao_procedimentos',
  'solicitacao_materiais',
  'solicitacao_alergias_alimentos',
  'solicitacao_alergias_medicamentos',
]

function formatIdentifier(knex, identifier) {
  if (knex.client && typeof knex.client.wrapIdentifier === 'function') {
    return knex.client.wrapIdentifier(identifier)
  }
  return `\`${identifier}\``
}

async function renameTableIfExists(knex, from, to) {
  const hasFrom = await knex.schema.hasTable(from)
  const hasTo = await knex.schema.hasTable(to)

  if (hasFrom && !hasTo) {
    await knex.schema.renameTable(from, to)
  }
}

async function renameColumnIfExists(knex, table, from, to) {
  const hasTable = await knex.schema.hasTable(table)
  if (!hasTable) return

  const hasFrom = await knex.schema.hasColumn(table, from)
  const hasTo = await knex.schema.hasColumn(table, to)

  if (hasFrom && !hasTo) {
    await knex.schema.alterTable(table, (tbl) => {
      tbl.renameColumn(from, to)
    })
  }
}

async function ensureColumn(knex, table, column, callback) {
  const exists = await knex.schema.hasColumn(table, column)
  if (!exists) {
    await knex.schema.alterTable(table, callback)
  }
}

async function dropForeignKeys(knex, table, column) {
  const constraints = await knex('information_schema.KEY_COLUMN_USAGE')
    .select('CONSTRAINT_NAME')
    .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('TABLE_NAME', table)
    .andWhere('COLUMN_NAME', column)
    .whereNotNull('REFERENCED_TABLE_NAME')

  for (const constraint of constraints) {
    await knex.schema.raw('ALTER TABLE ?? DROP FOREIGN KEY ??', [table, constraint.CONSTRAINT_NAME])
  }
}

async function dropForeignKeyIfExists(knex, table, column, constraintName) {
  const exists = await knex('information_schema.KEY_COLUMN_USAGE')
    .where('TABLE_SCHEMA', knex.raw('DATABASE()'))
    .andWhere('TABLE_NAME', table)
    .andWhere('COLUMN_NAME', column)
    .andWhere('CONSTRAINT_NAME', constraintName)
    .whereNotNull('REFERENCED_TABLE_NAME')
    .first()

  if (exists) {
    await knex.schema.alterTable(table, (tbl) => {
      tbl.dropForeign(column, constraintName)
    })
  }
}

async function ensureMainTable(knex) {
  const hasTable = await knex.schema.hasTable(MAIN_TABLE)

  if (!hasTable) {
    await knex.schema.createTable(MAIN_TABLE, (table) => {
      table.increments('id').primary()
      table.string('numero_liberacao', 60).nullable()
      table.string('convenio', 150).nullable()
      table.string('convenio_integracao_codigo', 120).nullable()
      table.string('convenio_integracao_origem', 40).nullable()
      table.string('carteirinha', 60).nullable()
      table.string('nome_paciente', 180).notNullable()
      table.string('paciente_integracao_codigo', 120).nullable()
      table.string('paciente_integracao_origem', 40).nullable()
      table.string('acomodacao', 120).nullable()
      table.date('data_nascimento').nullable()
      table.string('telefone_contato', 40).nullable()
      table.dateTime('data_cirurgia').nullable()
      table.date('data_solicitacao').nullable()
      table.date('data_ultima_consulta').nullable()
      table.integer('paciente_id').unsigned().nullable()
      table.integer('medico_id').unsigned().nullable()
      table.integer('convenio_id').unsigned().nullable()
      table.string('medico', 180).nullable()
      table.string('medico_integracao_codigo', 120).nullable()
      table.string('medico_integracao_origem', 40).nullable()
      table.string('auxiliar', 180).nullable()
      table.string('auxiliar_integracao_codigo', 120).nullable()
      table.string('auxiliar_integracao_origem', 40).nullable()
      table.string('fornecedor', 150).nullable()
      table.string('duracao_estimada', 20).nullable()
      table.string('internacao', 150).nullable()
      table.boolean('pernoite').notNullable().defaultTo(false)
      table.string('classificacao', 60).nullable()
      table.boolean('intensificador_imagem').notNullable().defaultTo(false)
      table.boolean('perfurador_serra').notNullable().defaultTo(false)
      table.boolean('reserva_sangue').notNullable().defaultTo(false)
      table.boolean('anestesia').notNullable().defaultTo(false)
      table.boolean('isolamento').notNullable().defaultTo(false)
      table.boolean('anatomia_patologica').notNullable().defaultTo(false)
      table.boolean('mesa_tracao').notNullable().defaultTo(false)
      table.boolean('testemunha_jeova').notNullable().defaultTo(false)
      table.text('observacoes').nullable()
      table.string('status', 40).notNullable().defaultTo('PENDENTE')
      table.integer('procedimento_tipo_id').unsigned().nullable()
      table.timestamps(true, true)

      table.index(['paciente_id'], 'idx_est_proc_paciente')
      table.index(['medico_id'], 'idx_est_proc_medico')
      table.index(['convenio_id'], 'idx_est_proc_convenio')
      table.index(['status'], 'idx_est_proc_status')
      table.index(['data_solicitacao'], 'idx_est_proc_data')
    })
    return
  }

  await ensureColumn(knex, MAIN_TABLE, 'numero_liberacao', (table) => {
    table.string('numero_liberacao', 60).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'convenio', (table) => {
    table.string('convenio', 150).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'convenio_integracao_codigo', (table) => {
    table.string('convenio_integracao_codigo', 120).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'convenio_integracao_origem', (table) => {
    table.string('convenio_integracao_origem', 40).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'carteirinha', (table) => {
    table.string('carteirinha', 60).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'nome_paciente', (table) => {
    table.string('nome_paciente', 180).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'paciente_integracao_codigo', (table) => {
    table.string('paciente_integracao_codigo', 120).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'paciente_integracao_origem', (table) => {
    table.string('paciente_integracao_origem', 40).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'acomodacao', (table) => {
    table.string('acomodacao', 120).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'data_nascimento', (table) => {
    table.date('data_nascimento').nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'telefone_contato', (table) => {
    table.string('telefone_contato', 40).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'data_cirurgia', (table) => {
    table.dateTime('data_cirurgia').nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'medico', (table) => {
    table.string('medico', 180).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'medico_integracao_codigo', (table) => {
    table.string('medico_integracao_codigo', 120).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'medico_integracao_origem', (table) => {
    table.string('medico_integracao_origem', 40).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'auxiliar', (table) => {
    table.string('auxiliar', 180).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'auxiliar_integracao_codigo', (table) => {
    table.string('auxiliar_integracao_codigo', 120).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'auxiliar_integracao_origem', (table) => {
    table.string('auxiliar_integracao_origem', 40).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'fornecedor', (table) => {
    table.string('fornecedor', 150).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'duracao_estimada', (table) => {
    table.string('duracao_estimada', 20).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'internacao', (table) => {
    table.string('internacao', 150).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'pernoite', (table) => {
    table.boolean('pernoite').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'classificacao', (table) => {
    table.string('classificacao', 60).nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'intensificador_imagem', (table) => {
    table.boolean('intensificador_imagem').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'perfurador_serra', (table) => {
    table.boolean('perfurador_serra').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'reserva_sangue', (table) => {
    table.boolean('reserva_sangue').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'anestesia', (table) => {
    table.boolean('anestesia').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'isolamento', (table) => {
    table.boolean('isolamento').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'anatomia_patologica', (table) => {
    table.boolean('anatomia_patologica').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'mesa_tracao', (table) => {
    table.boolean('mesa_tracao').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'testemunha_jeova', (table) => {
    table.boolean('testemunha_jeova').notNullable().defaultTo(false)
  })
  await ensureColumn(knex, MAIN_TABLE, 'status', (table) => {
    table.string('status', 40).notNullable().defaultTo('PENDENTE')
  })
  await ensureColumn(knex, MAIN_TABLE, 'procedimento_tipo_id', (table) => {
    table.integer('procedimento_tipo_id').unsigned().nullable()
  })
  await ensureColumn(knex, MAIN_TABLE, 'created_at', (table) => {
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })
  await ensureColumn(knex, MAIN_TABLE, 'updated_at', (table) => {
    table
      .timestamp('updated_at')
      .defaultTo(knex.fn.now())
  })
}

async function ensureAuxiliaryTable(knex, tableName, config) {
  const hasTable = await knex.schema.hasTable(tableName)

  if (!hasTable) {
    await knex.schema.createTable(tableName, (table) => config.columns(table, knex))
    return
  }

  if (config.renameFrom) {
    await renameColumnIfExists(knex, tableName, config.renameFrom, 'esteira_procedimento_id')
  }

  await ensureColumn(knex, tableName, 'id', (table) => {
    table.increments('id').primary()
  })

  await ensureColumn(knex, tableName, 'esteira_procedimento_id', (table) => {
    table.integer('esteira_procedimento_id').unsigned().nullable()
  })

  const hasEsteiraColumn = await knex.schema.hasColumn(tableName, 'esteira_procedimento_id')
  if (hasEsteiraColumn) {
    await dropForeignKeys(knex, tableName, 'esteira_procedimento_id')
    await knex.schema.alterTable(tableName, (table) => {
      table.integer('esteira_procedimento_id').unsigned().nullable().alter()
    })
    await knex.schema.alterTable(tableName, (table) => {
      table
        .foreign('esteira_procedimento_id', `fk_${tableName}_esteira_proc`)
        .references('id')
        .inTable(MAIN_TABLE)
        .onDelete('CASCADE')
        .onUpdate('CASCADE')
    })
  }

  if (tableName === 'esteira_procedimento_procedimento') {
    await ensureColumn(knex, tableName, 'procedimento_id', (table) => {
      table.integer('procedimento_id').unsigned().nullable()
    })
    await ensureColumn(knex, tableName, 'descricao', (table) => {
      table.string('descricao', 255).nullable()
    })
  } else if (tableName === 'esteira_procedimento_material') {
    await ensureColumn(knex, tableName, 'material_id', (table) => {
      table.integer('material_id').unsigned().nullable()
    })
    await ensureColumn(knex, tableName, 'descricao', (table) => {
      table.string('descricao', 255).notNullable().defaultTo('')
    })
  } else if (tableName === 'esteira_procedimento_instrumentador') {
    await ensureColumn(knex, tableName, 'nome', (table) => {
      table.string('nome', 180).notNullable().defaultTo('')
    })
  } else {
    await ensureColumn(knex, tableName, 'descricao', (table) => {
      table.string('descricao', 255).notNullable().defaultTo('')
    })
  }

  await ensureColumn(knex, tableName, 'created_at', (table) => {
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })
  await ensureColumn(knex, tableName, 'updated_at', (table) => {
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  })
}

async function resolveSolicitacaoEtapasTable(knex, preferred) {
  if (preferred && (await knex.schema.hasTable(preferred))) {
    return preferred
  }

  for (const candidate of SOLICITACAO_ETAPAS_CANDIDATES) {
    if (candidate === preferred) continue
    if (await knex.schema.hasTable(candidate)) {
      return candidate
    }
  }

  return preferred || SOLICITACAO_ETAPAS_CANDIDATES[0]
}

async function recreateResumoView(knex, solicitacaoTable, etapasTable) {
  await knex.schema.raw(`DROP VIEW IF EXISTS ${VIEW_NAME}`)

  const solicitacaoIdentifier = formatIdentifier(knex, solicitacaoTable)
  const resolvedEtapasTable = await resolveSolicitacaoEtapasTable(knex, etapasTable)
  const solicitacaoEtapasIdentifier = formatIdentifier(knex, resolvedEtapasTable)

  const createViewSql = `
    CREATE VIEW ${formatIdentifier(knex, VIEW_NAME)} AS
    SELECT
      sc.id AS solicitacao_id,
      sc.paciente_id,
      sc.medico_id,
      sc.convenio_id,
      sc.data_solicitacao,
      sc.data_ultima_consulta,
      sc.status AS status_solicitacao,
      MAX(CASE WHEN se.etapa = 'CARDIO' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS cardio_concluido,
      MAX(CASE WHEN se.etapa = 'APA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS apa_concluido,
      MAX(CASE WHEN se.etapa = 'LIBERACAO_GUIA' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_guia_concluida,
      MAX(CASE WHEN se.etapa = 'LIBERACAO_OPME' AND se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS liberacao_opme_concluida,
      SUM(CASE WHEN se.status IN ('PENDENTE', 'ATRIBUIDO') THEN 1 ELSE 0 END) AS etapas_pendentes,
      SUM(CASE WHEN se.status IN ('EM_ANDAMENTO', 'PARADO', 'ATRASADO') THEN 1 ELSE 0 END) AS etapas_em_andamento,
      SUM(CASE WHEN se.status = 'CONCLUIDO' THEN 1 ELSE 0 END) AS etapas_concluidas
    FROM ${solicitacaoIdentifier} sc
    LEFT JOIN ${solicitacaoEtapasIdentifier} se ON se.solicitacao_id = sc.id
    GROUP BY
      sc.id,
      sc.paciente_id,
      sc.medico_id,
      sc.convenio_id,
      sc.data_solicitacao,
      sc.data_ultima_consulta,
      sc.status
  `

  await knex.schema.raw(createViewSql)
}

async function ensureSolicitacaoEtapasForeignKey(knex) {
  const tableName = 'esteira_procedimento_etapas'
  const hasTable = await knex.schema.hasTable(tableName)
  if (!hasTable) return

  const oldFkName = 'fk_etapa_solic_proc'
  const newFkName = 'fk_etapa_esteira_proc'

  const hasSolicColumn = await knex.schema.hasColumn(tableName, 'solicitacao_id')
  if (!hasSolicColumn) return

  await dropForeignKeyIfExists(knex, tableName, 'solicitacao_id', oldFkName)
  await dropForeignKeyIfExists(knex, tableName, 'solicitacao_id', newFkName)

  await knex.schema.alterTable(tableName, (table) => {
    table
      .foreign('solicitacao_id', newFkName)
      .references('id')
      .inTable(MAIN_TABLE)
      .onDelete('CASCADE')
      .onUpdate('CASCADE')
  })
}

exports.up = async function up(knex) {
  await knex.schema.raw(`DROP VIEW IF EXISTS ${VIEW_NAME}`)

  for (const { from, to } of TABLE_RENAMES) {
    await renameTableIfExists(knex, from, to)
  }

  await ensureMainTable(knex)

  for (const [tableName, config] of Object.entries(AUXILIARY_TABLES)) {
    await ensureAuxiliaryTable(knex, tableName, config)
  }

  await ensureSolicitacaoEtapasForeignKey(knex)
  await recreateResumoView(knex, MAIN_TABLE)
}

exports.down = async function down(knex) {
  await knex.schema.raw(`DROP VIEW IF EXISTS ${VIEW_NAME}`)

  const tablePairs = [...TABLE_RENAMES].reverse()

  for (const { from, to } of tablePairs) {
    await renameTableIfExists(knex, to, from)
  }

  for (const tableName of DOWN_AUXILIARY_TABLES) {
    const hasTable = await knex.schema.hasTable(tableName)
    if (!hasTable) {
      continue
    }

    await dropForeignKeys(knex, tableName, 'esteira_procedimento_id')
    await renameColumnIfExists(knex, tableName, 'esteira_procedimento_id', 'solicitacao_id')

    const hasSolicColumn = await knex.schema.hasColumn(tableName, 'solicitacao_id')
    if (hasSolicColumn) {
      await dropForeignKeys(knex, tableName, 'solicitacao_id')
      await knex.schema.alterTable(tableName, (table) => {
        table
          .foreign('solicitacao_id', `fk_${tableName}_solic_proc`)
          .references('id')
          .inTable('solicitacoes_proc')
          .onDelete('CASCADE')
          .onUpdate('CASCADE')
      })
    }
  }

  const etapasTable = await resolveSolicitacaoEtapasTable(knex)
  const hasEtapasTable = etapasTable && (await knex.schema.hasTable(etapasTable))

  if (hasEtapasTable) {
    const column = 'solicitacao_id'
    await dropForeignKeyIfExists(knex, etapasTable, column, 'fk_etapa_esteira_proc')
    await dropForeignKeyIfExists(knex, etapasTable, column, 'fk_etapa_solic_proc')

    let solicitacoesTable = null
    if (await knex.schema.hasTable('solicitacoes_proc')) {
      solicitacoesTable = 'solicitacoes_proc'
    } else if (await knex.schema.hasTable('solicitacoes_cirurgia')) {
      solicitacoesTable = 'solicitacoes_cirurgia'
    }

    if (solicitacoesTable) {
      await knex.schema.alterTable(etapasTable, (table) => {
        table
          .foreign(column, 'fk_etapa_solic_proc')
          .references('id')
          .inTable(solicitacoesTable)
          .onDelete('CASCADE')
          .onUpdate('CASCADE')
      })
    }
  }

  await recreateResumoView(knex, 'solicitacoes_proc', etapasTable)
}
