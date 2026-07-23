import { DataSourceOptions } from 'typeorm';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { McpToolLog } from './entities/mcp-tool-log.entity';
import { Order } from './entities/order.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuItemPriceHistory } from './entities/menu-item-price-history.entity';
import { InitRolesAndUsers1752537600000 } from './migrations/1752537600000-InitRolesAndUsers';
import { AddMcpToolLogs1752537600001 } from './migrations/1752537600001-AddMcpToolLogs';
import { AddOrders1752537600002 } from './migrations/1752537600002-AddOrders';
import { AddMenu1752537600003 } from './migrations/1752537600003-AddMenu';

/**
 * Construye las opciones de conexión de TypeORM a partir de variables de
 * entorno. La cadena de conexión (Supabase) nunca se hardcodea: llega por
 * `DATABASE_URL` (ver ADR-001, ADR-010).
 *
 * Supabase exige SSL; se activa con `DATABASE_SSL=true`. En un Postgres local
 * de desarrollo se deja en `false`.
 *
 * `synchronize` queda SIEMPRE en false: el esquema se gobierna por migraciones
 * versionadas, no por sincronización automática.
 */
export function buildDataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL no está definida. Configúrala (cadena de conexión de ' +
        'Supabase/Postgres) antes de arrancar la API o correr migraciones.',
    );
  }

  return {
    type: 'postgres',
    url,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [
      Role,
      User,
      McpToolLog,
      Order,
      MenuCategory,
      MenuItem,
      MenuItemPriceHistory,
    ],
    migrations: [
      InitRolesAndUsers1752537600000,
      AddMcpToolLogs1752537600001,
      AddOrders1752537600002,
      AddMenu1752537600003,
    ],
    synchronize: false,
    migrationsRun: false,
    logging: env.DATABASE_LOGGING === 'true',
  };
}
