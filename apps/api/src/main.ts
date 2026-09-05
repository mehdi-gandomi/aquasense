import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',')
        .map((o) => o.trim())
        .filter(Boolean) ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`AQUASENSE SCADA core listening on 0.0.0.0:${port}`);
}

void bootstrap();
