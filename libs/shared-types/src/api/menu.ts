/**
 * Reglas de la imagen de un platillo (ADR-028), compartidas por la API
 * (multer + sharp) y el dashboard (validación antes de subir), para que los
 * dos lados rechacen exactamente lo mismo.
 */
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const MENU_IMAGE_ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
