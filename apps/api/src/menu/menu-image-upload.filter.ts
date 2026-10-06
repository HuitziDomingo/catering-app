import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { MAX_MENU_IMAGE_BYTES } from './menu-image.processor';

const MAX_MB = MAX_MENU_IMAGE_BYTES / (1024 * 1024);

export const MENU_IMAGE_TOO_LARGE_MESSAGE = `La imagen excede el tamaño máximo de ${MAX_MB} MB.`;

export const MENU_IMAGE_BAD_MULTIPART_MESSAGE =
  'Envía un solo archivo en el campo "image" de un formulario multipart.';

/**
 * Mensajes en inglés de multer/busboy que Nest ya convierte en 400: varios
 * archivos, formulario cortado, etc.
 */
const MULTIPART_ERROR_PREFIXES = [
  'Too many',
  'Field name',
  'Field value',
  'Unexpected field',
  'Multipart:',
];

interface MulterLikeError {
  name: string;
  code?: string;
}

/**
 * Errores de multer en la subida de imágenes del menú, en español como el
 * resto de la API (el dashboard muestra el mensaje que llega tal cual):
 *
 * - 413 "File too large" de multer -> mensaje con el tamaño máximo.
 * - Errores de multipart que Nest ya convierte en 400 -> mensaje claro.
 * - `MulterError` que Nest **no** reconoce: multer 2 cambió el texto de
 *   LIMIT_UNEXPECTED_FILE a "Unexpected file field" y Nest lo deja pasar
 *   como error genérico, así que un campo con otro nombre respondía 500.
 *   Aquí se clasifica por `code`, que es estable.
 *
 * Todo lo demás sigue el manejo normal de Nest (BaseExceptionFilter).
 */
@Catch()
export class MenuImageUploadFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (
      exception instanceof PayloadTooLargeException ||
      (isMulterError(exception) && exception.code === 'LIMIT_FILE_SIZE')
    ) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: MENU_IMAGE_TOO_LARGE_MESSAGE,
        error: 'Payload Too Large',
      });
      return;
    }

    if (
      isMulterError(exception) ||
      (exception instanceof BadRequestException &&
        MULTIPART_ERROR_PREFIXES.some((prefix) =>
          exception.message.startsWith(prefix),
        ))
    ) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: MENU_IMAGE_BAD_MULTIPART_MESSAGE,
        error: 'Bad Request',
      });
      return;
    }

    super.catch(exception, host);
  }
}

function isMulterError(error: unknown): error is MulterLikeError {
  return error instanceof Error && error.name === 'MulterError';
}
