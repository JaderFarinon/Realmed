const db = require('../db');

const DEFAULT_CONSELHO = 'CRM';
const DEFAULT_COLUMN_INFO = {
  hasConselho: false,
  hasCorpoClinico: false,
  hasCrmNumeroCorrecao: false,
};

let cachedMedicosColumnInfo;
let cachedMedicosColumnInfoPromise;

const mapColumnName = (row) =>
  (row && (row.COLUMN_NAME || row.column_name || row.columnName || ''))
    .toString()
    .toLowerCase();

async function getMedicosColumnInfo() {
  if (cachedMedicosColumnInfo) {
    return cachedMedicosColumnInfo;
  }

  if (cachedMedicosColumnInfoPromise) {
    return cachedMedicosColumnInfoPromise;
  }

  cachedMedicosColumnInfoPromise = (async () => {
    const databaseName = process.env.DB_NAME;

    if (!databaseName) {
      cachedMedicosColumnInfo = { ...DEFAULT_COLUMN_INFO };
      return cachedMedicosColumnInfo;
    }

    try {
      const [rows] = await db.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'medicos'",
        [databaseName],
      );

      const columnNames = rows.map(mapColumnName);

      cachedMedicosColumnInfo = {
        hasConselho: columnNames.includes('conselho'),
        hasCorpoClinico: columnNames.includes('corpo_clinico'),
        hasCrmNumeroCorrecao: columnNames.includes('crm_numero_correcao'),
      };

      return cachedMedicosColumnInfo;
    } catch (err) {
      console.warn(
        'Não foi possível consultar as colunas da tabela medicos no banco local:',
        err?.sqlMessage || err?.message || err,
      );
      cachedMedicosColumnInfo = { ...DEFAULT_COLUMN_INFO };
      return cachedMedicosColumnInfo;
    } finally {
      cachedMedicosColumnInfoPromise = null;
    }
  })();

  return cachedMedicosColumnInfoPromise;
}

function buildMedicosSelectColumns(columnInfo = DEFAULT_COLUMN_INFO, options = {}) {
  const { includeAuditFields = true, includeUserCreate = true } = options;

  const columns = [
    'id',
    'nome_completo',
    columnInfo.hasConselho ? 'conselho' : `'${DEFAULT_CONSELHO}' AS conselho`,
    columnInfo.hasCrmNumeroCorrecao
      ? 'COALESCE(crm_numero_correcao, crm_numero) AS crm_numero'
      : 'crm_numero AS crm_numero',
    'crm_numero AS crm_numero_original',
    columnInfo.hasCrmNumeroCorrecao ? 'crm_numero_correcao' : 'NULL AS crm_numero_correcao',
    'crm_uf',
    columnInfo.hasCorpoClinico ? 'corpo_clinico' : 'NULL AS corpo_clinico',
    'cpf',
    'telefone_principal',
    'email',
    'especialidade',
    'ie_status',
  ];

  if (includeAuditFields) {
    columns.push('created_at', 'updated_at');
  }

  if (includeUserCreate) {
    columns.push('user_create');
  }

  return columns;
}

function resetMedicosColumnInfoCache() {
  cachedMedicosColumnInfo = null;
  cachedMedicosColumnInfoPromise = null;
}

module.exports = {
  DEFAULT_CONSELHO,
  DEFAULT_COLUMN_INFO,
  getMedicosColumnInfo,
  buildMedicosSelectColumns,
  resetMedicosColumnInfoCache,
};
