import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email registrado del usuario.', example: 'cliente@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ description: 'Contraseña en texto plano del usuario.' })
  @IsString()
  password!: string;
}
