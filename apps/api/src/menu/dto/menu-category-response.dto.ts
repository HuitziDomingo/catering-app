import { ApiProperty } from '@nestjs/swagger';

export class MenuCategoryResponseDto {
  @ApiProperty({ description: 'id (uuid) de la categoría.' })
  id!: string;

  @ApiProperty({ description: 'Nombre de la categoría.', example: 'Desayuno' })
  name!: string;

  @ApiProperty({ description: 'Orden de despliegue en el menú.', example: 1 })
  displayOrder!: number;

  @ApiProperty({ description: 'Si la categoría está activa.' })
  isActive!: boolean;
}
