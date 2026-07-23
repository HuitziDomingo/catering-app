import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuItemResponseDto {
  @ApiProperty({ description: 'id (uuid) del platillo.' })
  id!: string;

  @ApiProperty({ description: 'id (uuid) de la categoría a la que pertenece.' })
  categoryId!: string;

  @ApiProperty({ description: 'Nombre del platillo.' })
  name!: string;

  @ApiPropertyOptional({ description: 'Descripción del platillo.', nullable: true })
  description?: string | null;

  @ApiProperty({ description: 'Precio base del platillo (MXN).' })
  basePrice!: number;

  @ApiProperty({ description: 'Número de personas que sirve una orden de este platillo.' })
  servesPeople!: number;

  @ApiProperty({
    description: 'Atributos flexibles del platillo (alérgenos, extras, etc.).',
  })
  attributes!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'URL de la imagen del platillo.', nullable: true })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Si el platillo está activo (visible en el menú).' })
  isActive!: boolean;

  @ApiProperty({ description: 'Fecha de creación.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Fecha de última actualización.' })
  updatedAt!: Date;
}
