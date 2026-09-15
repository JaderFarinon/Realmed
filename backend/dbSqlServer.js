const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const dotenv = require('dotenv');

const resolveEnvPath = () => {
  const customPath = process.env.DOTENV_CONFIG_PATH;

  if (customPath && customPath.trim() !== '') {
    return path.resolve(process.cwd(), customPath.trim());
  }

  const cwdEnvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(cwdEnvPath)) {
    return cwdEnvPath;
  }

  const localEnvPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(localEnvPath)) {
    return localEnvPath;
  }

  return cwdEnvPath;
};

const envFilePath = resolveEnvPath();
const dotenvResult = dotenv.config(envFilePath ? { path: envFilePath } : undefined);

if (dotenvResult.error) {
  console.warn('[SQL Server] Não foi possível carregar o arquivo .env automaticamente:', dotenvResult.error.message);
} else if (dotenvResult.parsed) {
  console.log('[SQL Server] Variáveis de ambiente carregadas do arquivo:', envFilePath);
}

const SQL_SERVER_DEFAULT_PORT = 1433;

const decodeDoubleQuotedValue = (value) => {
  let result = '';
  let escaping = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (escaping) {
      switch (char) {
        case 'n':
          result += '\n';
          break;
        case 'r':
          result += '\r';
          break;
        case 't':
          result += '\t';
          break;
        case 'f':
          result += '\f';
          break;
        case 'v':
          result += '\v';
          break;
        case '0':
          result += '\0';
          break;
        case '"':
          result += '"';
          break;
        case '\\':
          result += '\\';
          break;
        case '#':
          result += '#';
          break;
        default:
          result += char;
          break;
      }

      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    result += char;
  }

  if (escaping) {
    result += '\\';
  }

  return result;
};

const decodeUnquotedValue = (value) => {
  let result = '';
  let escaping = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      escaping = true;
      continue;
    }

    result += char;
  }

  if (escaping) {
    result += '\\';
  }

  return result;
};

const parseRawEnvValue = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const stringValue = String(value);
  const trimmed = stringValue.trim();

  if (trimmed === '') {
    return undefined;
  }

  const quotedMatch = trimmed.match(/^(['"])([\s\S]*)\1$/);

  if (quotedMatch) {
    const [, quote, innerValue] = quotedMatch;

    if (quote === '"') {
      return decodeDoubleQuotedValue(innerValue);
    }

    return innerValue;
  }

  return decodeUnquotedValue(trimmed);
};

const processEnvValue = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
};

const envValue = (key) => {
  if (!key) {
    return undefined;
  }

  const directValue = processEnvValue(process.env[key]);
  const rawValue = getRawEnvValue(key);
  const parsedRawValue = parseRawEnvValue(rawValue);

  if (directValue === undefined) {
    return parsedRawValue;
  }

  if (parsedRawValue === undefined || parsedRawValue === directValue) {
    return directValue;
  }

  const rawContainsUnescapedHash = /(^|[^\\\s])#/u.test(rawValue || '');

  if (
    rawContainsUnescapedHash &&
    !directValue.includes('#') &&
    typeof parsedRawValue === 'string' &&
    parsedRawValue.startsWith(directValue)
  ) {
    return parsedRawValue;
  }

  return directValue;
};

let rawEnvValuesCache;
let rawEnvValuesLoaded = false;

const loadRawEnvValues = () => {
  if (rawEnvValuesLoaded) {
    return rawEnvValuesCache;
  }

  rawEnvValuesLoaded = true;

  try {
    if (!envFilePath || !fs.existsSync(envFilePath)) {
      rawEnvValuesCache = null;
      return rawEnvValuesCache;
    }

    const fileContent = fs.readFileSync(envFilePath, 'utf8');
    const lines = fileContent.split(/\r?\n/);
    const entries = new Map();

    lines.forEach((line) => {
      if (!line) {
        return;
      }

      const trimmedLine = line.trim();

      if (trimmedLine === '' || trimmedLine.startsWith('#')) {
        return;
      }

      const equalsIndex = line.indexOf('=');

      if (equalsIndex === -1) {
        return;
      }

      const keyPart = line.slice(0, equalsIndex).trim();

      if (keyPart === '') {
        return;
      }

      const normalizedKey = keyPart.startsWith('export ')
        ? keyPart.slice('export '.length).trim()
        : keyPart;

      if (normalizedKey === '') {
        return;
      }

      const valuePart = line.slice(equalsIndex + 1).trim();
      entries.set(normalizedKey, valuePart);
    });

    rawEnvValuesCache = entries;
  } catch (err) {
    rawEnvValuesCache = null;
  }

  return rawEnvValuesCache;
};

const getRawEnvValue = (key) => {
  if (!key) {
    return undefined;
  }

  const rawValues = loadRawEnvValues();

  if (!rawValues) {
    return undefined;
  }

  return rawValues.get(key);
};

const toUpperSnakeCase = (value) => {
  if (!value) {
    return '';
  }

  return String(value)
    .normalize('NFD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
};

const defaultUnitName = envValue('SQLSERVER_DEFAULT_UNIT') || 'ARTRO';
const normalizedDefaultUnit = toUpperSnakeCase(defaultUnitName) || 'DEFAULT';

const keyFor = (property, unitSuffix) => {
  if (unitSuffix) {
    return `SQLSERVER_${unitSuffix}_${property}`;
  }

  return property === 'PORT' ? 'SQLSERVER_PORT' : `SQLSERVER_${property}`;
};

const buildUnitConfig = (unitName, unitSuffix) => {
  const requiredProperties = ['USER', 'PASSWORD', 'HOST', 'DB'];

  const missing = requiredProperties
    .map((prop) => keyFor(prop, unitSuffix))
    .filter((key) => envValue(key) === undefined);

  if (missing.length > 0) {
    return { unitName, unitSuffix, missing };
  }

  const portKey = keyFor('PORT', unitSuffix);
  const portValue = envValue(portKey);
  let port = Number(portValue);

  if (Number.isNaN(port) || port <= 0) {
    if (portValue !== undefined) {
      console.warn(`Valor inválido para ${portKey}, utilizando porta padrão ${SQL_SERVER_DEFAULT_PORT}.`);
    }
    port = SQL_SERVER_DEFAULT_PORT;
  }

  return {
    unitName,
    unitSuffix,
    config: {
      user: envValue(keyFor('USER', unitSuffix)),
      password: envValue(keyFor('PASSWORD', unitSuffix)),
      server: envValue(keyFor('HOST', unitSuffix)),
      port,
      database: envValue(keyFor('DB', unitSuffix)),
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    }
  };
};

const unitPools = new Map();

let pool;
let poolConnect;

const createDisabledSqlServerPool = (error) => ({
  request() {
    throw error;
  },
  close: async () => {}
});

const wrapConnectionError = (unitName, unitSuffix, config, error) => {
  const segments = [`Falha ao conectar no SQL Server para a unidade "${unitName}".`];
  const reason = error?.message || error;
  if (reason) {
    const sanitized = String(reason).trim().replace(/[.。！？!?]+$/, '');
    segments.push(`Motivo: ${sanitized}.`);
  }

  if (error?.code === 'ELOGIN') {
    const userKey = keyFor('USER', unitSuffix);
    const passwordKey = keyFor('PASSWORD', unitSuffix);
    segments.push(`Verifique as variáveis de ambiente ${userKey} e ${passwordKey}.`);

    const rawPasswordValue = getRawEnvValue(passwordKey);

    if (rawPasswordValue && rawPasswordValue.includes('#')) {
      const trimmedRawValue = rawPasswordValue.trim();
      const isQuoted = /^(['"]).*\1$/.test(trimmedRawValue);
      const hasEscapedHash = rawPasswordValue.includes('\\#');

      if (!isQuoted && !hasEscapedHash) {
        segments.push(
          `Dica: o valor de ${passwordKey} no arquivo .env contém "#" sem aspas ou escape. ` +
            'Envolva a senha entre aspas ("senha#com#caracteres") ou utilize \\# para escapar o caractere.'
        );
      }
    }
  } else if (error?.code) {
    segments.push(`Código do erro: ${error.code}.`);
  }

  if (config?.user) {
    segments.push(`Usuário configurado: ${config.user}.`);
  }

  const connectionError = new Error(segments.join(' '));
  connectionError.code = error?.code;
  connectionError.originalError = error;

  return connectionError;
};

const registerConfiguredUnit = (unitName, unitSuffix, normalizedUnit, config, { isDefault = false } = {}) => {
  const connectionPool = new sql.ConnectionPool(config);

  console.log('[SQL Server] Registrando pool de conexões:', {
    unidade: unitName,
    sufixo: unitSuffix || '(padrão)',
    usuario: config.user,
    servidor: config.server,
    porta: config.port,
    banco: config.database
  });

  const entry = {
    unitName,
    unitSuffix,
    pool: connectionPool,
    poolConnect: connectionPool.connect()
  };

  entry.poolConnect = entry.poolConnect.catch((err) => {
    const connectionError = wrapConnectionError(unitName, unitSuffix, config, err);

    console.warn(connectionError.message);

    if (typeof connectionPool.close === 'function') {
      connectionPool.close().catch(() => {});
    }

    const disabledPool = createDisabledSqlServerPool(connectionError);
    entry.pool = disabledPool;

    const rejection = Promise.reject(connectionError);
    entry.poolConnect = rejection;
    rejection.catch(() => {});

    if (isDefault) {
      pool = entry.pool;
      poolConnect = entry.poolConnect;
    }

    throw connectionError;
  });

  if (isDefault) {
    pool = entry.pool;
    poolConnect = entry.poolConnect;
  }

  unitPools.set(normalizedUnit, entry);

  return entry;
};

const defaultConfigResult = buildUnitConfig(defaultUnitName, '');
const isSqlServerConfigured = Boolean(defaultConfigResult.config);

if (isSqlServerConfigured) {
  registerConfiguredUnit(defaultUnitName, '', normalizedDefaultUnit, defaultConfigResult.config, { isDefault: true });
} else {
  const missingList = defaultConfigResult.missing ? defaultConfigResult.missing.join(', ') : undefined;
  const errorMessage = missingList
    ? `SQL Server connection skipped. Missing environment variables: ${missingList}`
    : 'SQL Server connection skipped. Missing environment variables.';
  const notConfiguredError = new Error(errorMessage);

  console.warn(errorMessage);

  poolConnect = Promise.reject(notConfiguredError);
  poolConnect.catch(() => {});

  pool = {
    request() {
      throw notConfiguredError;
    },
    close: async () => {}
  };

  unitPools.set(normalizedDefaultUnit, {
    unitName: defaultUnitName,
    pool,
    poolConnect
  });
}

const additionalUnitsValue = envValue('SQLSERVER_ADDITIONAL_UNITS');

if (additionalUnitsValue) {
  const additionalUnits = additionalUnitsValue
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');

  if (additionalUnits.length > 0) {
    const isMultiUnitEnabled = false;

    if (!isMultiUnitEnabled) {
      console.log('[SQL Server] Unidades adicionais configuradas serão ignoradas até habilitação por usuário.', {
        unidades: additionalUnits
      });
    } else {
      additionalUnits.forEach((unitName) => {
        const normalized = toUpperSnakeCase(unitName);
        if (!normalized) {
          console.warn(
            `SQL Server connection for unit "${unitName}" skipped. The unit name must contain letters or numbers.`
          );
          return;
        }
        const result = buildUnitConfig(unitName, normalized);

        if (result.config) {
          registerConfiguredUnit(unitName, normalized, normalized, result.config);
        } else if (result.missing && result.missing.length > 0) {
          console.warn(
            `SQL Server connection for unit "${unitName}" skipped. Missing environment variables: ${result.missing.join(', ')}`
          );
        }
      });
    }
  }
}

const resolveActiveUnit = (unitName) => {
  const normalizedRequestedUnit = unitName ? toUpperSnakeCase(unitName) : '';
  const normalizedActiveUnit = normalizedDefaultUnit;

  if (normalizedRequestedUnit && normalizedRequestedUnit !== normalizedActiveUnit) {
    console.log(
      '[SQL Server] Unidade solicitada ainda não habilitada. Forçando unidade padrão.',
      {
        solicitada: normalizedRequestedUnit,
        ativa: normalizedActiveUnit
      }
    );
  }

  // TODO: substituir por verificação da unidade do usuário quando estiver disponível.
  return normalizedActiveUnit;
};

const getSqlServerPool = (unitName) => {
  const normalized = resolveActiveUnit(unitName);
  const entry = unitPools.get(normalized);

  if (!entry) {
    throw new Error(`No SQL Server configuration found for unit "${unitName || defaultUnitName}".`);
  }

  return entry;
};

module.exports = {
  sql,
  pool,
  poolConnect,
  isSqlServerConfigured,
  defaultUnitName,
  getSqlServerPool
};
