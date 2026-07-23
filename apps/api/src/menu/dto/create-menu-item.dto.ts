import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'id (uuid) de la categoría a la que pertenece el platillo.',
  })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description: 'Nombre del platillo.',
    maxLength: 150,
    example: 'Chilaquiles verdes',
  })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ description: 'Descripción del platillo.' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ description: 'Precio base del platillo (MXN).', example: 120.5 })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiProperty({
    description: 'Número de personas que sirve una orden de este platillo.',
    example: 1,
  })
  @IsInt()
  @Min(1)
  servesPeople!: number;

  @ApiPropertyOptional({
    description:
      'Atributos flexibles del platillo (alérgenos, extras, atributos futuros) sin alterar el esquema.',
    example: { allergens: ['gluten'] },
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
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
