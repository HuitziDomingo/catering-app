import { ApiProperty } from '@nestjs/swagger';

/** Forma de respuesta devuelta por /auth/me: el payload del access token vigente. */
export class MeResponseDto {
  @ApiProperty({ description: 'id (uuid) del usuario autenticado.' })
  sub!: string;

  @ApiProperty({ description: 'Email del usuario autenticado.' })
  email!: string;

  @ApiProperty({ description: 'Nombre del rol del usuario (customer / staff / admin / superadmin).' })
  role!: string;
}
