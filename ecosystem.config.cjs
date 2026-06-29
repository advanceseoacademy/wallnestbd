const path = require('path');

const root = __dirname;

require('dotenv').config({ path: path.join(root, '.env') });

const sharedEnv = {
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-http-header-size=32768',
  BASE_URL: process.env.BASE_URL || 'https://wallnestbd.com',
  SESSION_SECRET: process.env.SESSION_SECRET,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
};

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
        ...sharedEnv,
        PORT: 3010,
        ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://127.0.0.1:3012',
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
        ...sharedEnv,
        ADMIN_API_PORT: 3012,
        ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://127.0.0.1:3012',
      },
    },
  ],
};
