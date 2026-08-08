import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae un mensaje legible de un error HTTP o genérico para mostrarlo en UI.
 * NestJS's ValidationPipe devuelve `message` como string[] cuando falla la
 * validación de varios campos a la vez (ver ErrorResponseDto en la API).
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const message = (err.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    return message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}
