const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'wallnestbd-web',
      cwd: root,
      script: path.join(root, 'node_modules/next/dist/bin/next'),
      args: 'start -p 3010',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        NODE_OPTIONS: '--max-http-header-size=32768',
      },
    },
    {
      name: 'wallnestbd-admin',
      cwd: root,
      script: path.join(root, 'admin-api/dist/main.js'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        ADMIN_API_PORT: 3012,
        NODE_OPTIONS: '--max-http-header-size=32768',
      },
    },
  ],
};
