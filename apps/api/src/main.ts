/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

const { version } = require('../../../package.json') as { version: string };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Catering App API')
    .setDescription(
      'API REST del backend de Catering App: autenticación de usuarios (JWT propio, ADR-010) y servidor MCP para consultas de pedidos.',
    )
    .setVersion(version)
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const docsPath = `${globalPrefix}/docs`;
  SwaggerModule.setup(docsPath, app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger docs available at: http://localhost:${port}/${docsPath}`);
}

bootstrap();
