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
      max_memory_restart: '300M'
    }
  ]
}
