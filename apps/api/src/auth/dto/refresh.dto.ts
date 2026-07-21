import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token JWT emitido previamente por /auth/login o /auth/register.' })
  @IsString()
  refreshToken!: string;
}
