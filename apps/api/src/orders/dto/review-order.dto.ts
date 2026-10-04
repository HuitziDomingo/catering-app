import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  ReviewOrderAction,
  type ReviewOrderDto as ReviewOrderContract,
} from '@catering-app/shared-types';

/**
 * Revisión de un pedido marcado needsReview (ver ADR-027). Cambiar platillos
 * queda fuera a propósito: en ese caso se cancela y se pide de nuevo. Que
 * peopleCount/notes solo vengan con `adjust` (y al menos uno de los dos) lo
 * valida OrdersService.reviewOrder.
 */
export class ReviewOrderDto implements ReviewOrderContract {
  @ApiProperty({ enum: ReviewOrderAction })
  @IsEnum(ReviewOrderAction)
  action!: ReviewOrderAction;

  @ApiPropertyOptional({
    description: 'Nuevo número de personas (solo con action = adjust).',
    example: 350,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  peopleCount?: number;

  @ApiPropertyOptional({
    description: 'Notas del pedido (solo con action = adjust).',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
