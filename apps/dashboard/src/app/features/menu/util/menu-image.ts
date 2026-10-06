import {
  MENU_IMAGE_ACCEPTED_MIME_TYPES,
  MENU_IMAGE_MAX_BYTES,
  type MenuItem,
} from '@catering-app/shared-types';

const MAX_MB = MENU_IMAGE_MAX_BYTES / (1024 * 1024);

/** Valor del atributo `accept` del input de archivo. */
export const MENU_IMAGE_ACCEPT = MENU_IMAGE_ACCEPTED_MIME_TYPES.join(',');

export const MENU_IMAGE_TOO_LARGE_MESSAGE = `La imagen excede el tamaño máximo de ${MAX_MB} MB.`;
export const MENU_IMAGE_INVALID_TYPE_MESSAGE = 'Formato no permitido: usa una imagen JPG, PNG o WebP.';

// Algunos sistemas no informan el tipo MIME de ciertos archivos (llega como
// ''): en ese caso se decide por la extensión. La API vuelve a validar por el
// contenido real del archivo de todos modos (ADR-028).
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/**
 * Mismas reglas que la API (ADR-028): JPG, PNG o WebP de máximo 5 MB.
 * Devuelve el mensaje de error en español, o null si el archivo es válido.
 * Validar aquí evita subir 5 MB para recibir un 400/413.
 */
export function validateMenuImageFile(file: File): string | null {
  const typeOk = file.type
    ? (MENU_IMAGE_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)
    : ACCEPTED_EXTENSIONS.test(file.name);
  if (!typeOk) {
    return MENU_IMAGE_INVALID_TYPE_MESSAGE;
  }
  if (file.size > MENU_IMAGE_MAX_BYTES) {
    return MENU_IMAGE_TOO_LARGE_MESSAGE;
  }
  return null;
}

/**
 * Qué hacer con la imagen al guardar el formulario: dejarla como está,
 * reemplazarla por un archivo nuevo, o quitarla.
 */
export type MenuImageChange =
  | { readonly kind: 'keep' }
  | { readonly kind: 'replace'; readonly file: File }
  | { readonly kind: 'remove' };

/**
 * Evento de una subida en curso: avance (0-100) mientras se envía el archivo,
 * y el platillo actualizado al terminar.
 */
export type MenuImageUploadEvent =
  | { readonly type: 'progress'; readonly percent: number }
  | { readonly type: 'done'; readonly item: MenuItem };
