import { ApiProperty } from '@nestjs/swagger';

/** Forma de respuesta devuelta por /auth/register, /auth/login y /auth/refresh. */
export class AuthTokensDto {
  @ApiProperty({ description: 'JWT de acceso de corta duración.' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT de refresco de larga duración.' })
  refreshToken!: string;
}
