import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source.options';

// Este archivo lo consume el CLI de TypeORM (migration:run / generate / revert),
// fuera del contexto de Nest, por lo que carga el .env por su cuenta.
// El .env vive en apps/api/.env (resuelto relativo a este archivo).
loadEnv({ path: join(__dirname, '..', '..', '.env') });

export const AppDataSource = new DataSource(buildDataSourceOptions());
