import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  OrderStatus,
  type OrderListQuery,
  type OrderSortField,
  type SortDirection,
} from '@catering-app/shared-types';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** `?status=pending,confirmed` o `?status=pending&status=confirmed` → OrderStatus[]. */
export function toStatusArray({ value }: { value: unknown }): unknown {
  if (value === undefined || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
}

/** Query strings llegan como texto: solo 'true'/'false' se aceptan como booleano. */
export function toBoolean({ value }: { value: unknown }): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

/** Paginación compartida por GET /orders y GET /orders/mine. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Página, empezando en 1.', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: `Tamaño de página (máximo ${MAX_PAGE_SIZE}).`,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}

export class MyOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Uno o varios status, separados por coma.',
    enum: OrderStatus,
    isArray: true,
  })
  @IsOptional()
  @Transform(toStatusArray)
  @IsEnum(OrderStatus, { each: true })
  status?: OrderStatus[];
}

/** Filtros de la lista de staff (ver ADR-027). */
export class ListOrdersQueryDto extends MyOrdersQueryDto implements OrderListQuery {
  @ApiPropertyOptional({
    description: 'Fecha del evento (scheduledFor) desde, ISO 8601 inclusive.',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha del evento (scheduledFor) hasta, ISO 8601 inclusive.',
    example: '2026-10-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'true: solo pedidos fuera de rango serves_min/serves_max (ADR-021).',
  })
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  needsReview?: boolean;

  @ApiPropertyOptional({
    description:
      'Solo pedidos creados estrictamente después de esta fecha (ISO 8601). ' +
      'Lo usa la campanita del dashboard para cargar lo llegado mientras estaba cerrado.',
  })
  @IsOptional()
  @IsDateString()
  createdSince?: string;

  @ApiPropertyOptional({ enum: ['scheduledFor', 'createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['scheduledFor', 'createdAt'])
  sort?: OrderSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: SortDirection;
}
