module.exports = {
  apps: [{
    name: 'realmed-api',
    cwd: '/qyvia/realmed/current/backend',
    script: 'app.js',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    out_file: '/qyvia/realmed/logs/api-out.log',
    error_file: '/qyvia/realmed/logs/api-error.log',
    time: true,
    max_memory_restart: '384M',
  }],
}
