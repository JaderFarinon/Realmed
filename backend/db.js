const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
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

const envPath = resolveEnvPath();
const dotenvResult = dotenv.config(envPath ? { path: envPath, override: true } : { override: true });

if (dotenvResult.error) {
  console.warn('[MySQL] Não foi possível carregar o arquivo .env automaticamente:', dotenvResult.error.message);
} else if (dotenvResult.parsed) {
  console.log('[MySQL] Variáveis de ambiente carregadas do arquivo:', envPath);
}

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];

requiredEnvVars.forEach((key) => {
  if (process.env[key] === undefined) {
    throw new Error(`Missing required environment variable ${key} for MySQL connection`);
  }
});

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 33060,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('[MySQL] Configuração do pool de conexões:', {
  host: poolConfig.host,
  user: poolConfig.user,
  database: poolConfig.database,
  port: poolConfig.port,
  connectionLimit: poolConfig.connectionLimit,
  waitForConnections: poolConfig.waitForConnections,
  queueLimit: poolConfig.queueLimit
});

const pool = mysql.createPool(poolConfig);

module.exports = pool;
