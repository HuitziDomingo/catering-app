import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Nombre completo del usuario.', maxLength: 150, example: 'Ana Pérez' })
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ description: 'Email único del usuario.', maxLength: 255, example: 'ana@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: 'Contraseña en texto plano (se hashea con bcrypt antes de guardarse).',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // límite del algoritmo bcrypt
  password!: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto.', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Número de WhatsApp de contacto.', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappNumber?: string;
}
