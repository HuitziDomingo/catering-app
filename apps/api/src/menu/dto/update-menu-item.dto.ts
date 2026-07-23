import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({
    description: 'id (uuid) de la categoría a la que pertenece el platillo.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Nombre del platillo.', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción del platillo.' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    description:
      'Precio base del platillo (MXN). Un cambio aquí genera una fila de ' +
      'auditoría en menu_item_price_history (ver ADR-006).',
    example: 135,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Número de personas que sirve una orden de este platillo.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  servesPeople?: number;

  @ApiPropertyOptional({
    description: 'Atributos flexibles del platillo (alérgenos, extras, etc.).',
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'URL de la imagen del platillo.' })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Si el platillo está activo (visible en el menú).',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
