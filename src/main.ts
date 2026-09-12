import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT || 10000;
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  await app.listn(port, '0.0.0.0'); 
  console.log('Application running on port ${port}');
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['https://invest-bankend-1-x3yz.onrender.com/api'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
