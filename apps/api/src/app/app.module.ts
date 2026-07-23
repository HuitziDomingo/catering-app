import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { McpModule } from '../mcp/mcp.module';
import { MenuModule } from '../menu/menu.module';
import { OrdersModule } from '../orders/orders.module';
import { buildDataSourceOptions } from '../database/data-source.options';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // En local se lee apps/api/.env; en Cloud Run las variables llegan del
      // entorno (el archivo simplemente no existe y se ignora).
      envFilePath: ['apps/api/.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildDataSourceOptions(),
        autoLoadEntities: true,
      }),
    }),
    // Límite global por IP, laxo a propósito: no debe afectar navegación
    // pública de catálogo (GET /menu/*). Los endpoints sensibles (auth)
    // aplican un límite más estricto vía @Throttle en su propio controller.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: minutes(1), limit: 100 }],
    }),
    AuthModule,
    McpModule,
    MenuModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
