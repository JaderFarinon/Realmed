console.log('Iniciando app.js');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const db = require('./db');
const dbSqlServer = require('./dbSqlServer');
const authMiddleware = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const usersRoutes = require('./routes/users');
const usuariosRoutes = require('./routes/usuarios');
const unidadesRoutes = require('./routes/unidades');
const permissoesRoutes = require('./routes/permissoes');

const suporteRoutes = require('./routes/suporte');
const internalChatRoutes = require('./routes/internal_chat');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: { title: 'Grupo NM', version: '1.0.0', description: 'Documentação da API REST (Express + Swagger)' },
  servers: [{ url: 'http://localhost:3005' }],
};

const options = { swaggerDefinition, apis: ['./routes/*.js'] };
const swaggerSpec = swaggerJSDoc(options);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Limitador de requisições por IP
//Abaixo regra para limitar em 100 requisições a cada 15 minutos por IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: 'Muitas requisições do mesmo IP, tente novamente mais tarde.' });
app.use(limiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs-json', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.send(swaggerSpec); });

console.log('Registrando rotas...');
app.use('/api/auth', authRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/unidades', unidadesRoutes);

app.use('/api/permissoes', permissoesRoutes);
app.use('/api/internal-chat', internalChatRoutes);
app.use('/api/suporte', suporteRoutes);

console.log('Rotas registradas com sucesso.');

console.log('Testando conexão com o banco de dados SQL Server...');
dbSqlServer.poolConnect
  .then(pool => pool.request().query('SELECT 1'))
  .then(() => console.log('Conexão com o SQL Server bem-sucedida.'))
  .catch((err) => console.error('Falha ao conectar no SQL Server:', err.message || err));

console.log('Testando conexão com o banco de dados MySQL...');
db.getConnection()
  .then(conn => conn.query('SELECT 1').finally(() => conn.release()))
  .then(() => {
    console.log('Conexão com o banco de dados bem-sucedida.');
    app.listen(3005, () => console.log('API rodando na porta 3005'));
  })
  .catch((err) => {
    console.error('Falha ao conectar no banco de dados:', err.message || err);
    process.exit(1);
  });
console.log('Configuração do banco de dados concluída.');
