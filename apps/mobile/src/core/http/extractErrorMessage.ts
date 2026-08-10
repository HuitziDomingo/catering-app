import { AxiosError } from 'axios';

/**
 * Extrae un mensaje legible de un error de axios o genérico para mostrarlo
 * en UI. Equivalente a extract-error-message.ts en dashboard: NestJS's
 * ValidationPipe devuelve `message` como string[] cuando falla la
 * validación de varios campos a la vez (ver ErrorResponseDto en la API).
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const message = (err.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    return message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}
