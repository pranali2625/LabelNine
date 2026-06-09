module.exports = {
  apps: [
    {
      name: 'labelnine-server',
      script: './server/index.js',
      cwd: '/home/labelnine',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
}
