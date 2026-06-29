import './load-env';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const { ensureServiceRoleKey } = require('../../lib/supabaseAdmin');
  await ensureServiceRoleKey();

  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      process.env.BASE_URL || 'http://localhost:3000',
      'http://localhost:3000',
    ],
    credentials: true,
  });
  app.setGlobalPrefix('api/admin');
  const port = Number(process.env.ADMIN_API_PORT || 3002);
  await app.listen(port);
  console.log(`WallNest Admin API (NestJS) http://localhost:${port}/api/admin`);
}

bootstrap();
