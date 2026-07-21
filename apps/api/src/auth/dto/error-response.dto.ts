import { ApiProperty } from '@nestjs/swagger';

/** Forma estándar de error de NestJS (HttpExceptionFilter por defecto). */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensaje de error, o lista de mensajes cuando falla la validación del DTO.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
