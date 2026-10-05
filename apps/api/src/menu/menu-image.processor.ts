import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/** Tamaño máximo del archivo subido (lo aplica multer: excederlo es 413). */
export const MAX_MENU_IMAGE_BYTES = 5 * 1024 * 1024;

/** Lado mayor máximo de la imagen guardada (ADR-028). */
export const MENU_IMAGE_MAX_SIDE = 1200;

const MENU_IMAGE_QUALITY = 80;

/**
 * Tope de píxeles de entrada: un PNG de pocos MB puede declarar dimensiones
 * enormes y agotar la memoria al decodificarlo. 40 MP cubre de sobra las
 * fotos de cualquier celular.
 */
const MAX_INPUT_PIXELS = 40_000_000;

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export interface ProcessedMenuImage {
  buffer: Buffer;
  contentType: 'image/webp';
}

/**
 * Valida y normaliza una imagen de platillo (ver ADR-028). El formato se
 * revisa por el contenido del archivo, no por la extensión ni el
 * Content-Type que manda el cliente. La salida siempre es webp de máximo
 * 1200 px por lado, con la orientación EXIF aplicada y sin metadatos (sharp
 * los descarta por default, incluida la ubicación GPS de fotos de celular).
 */
export async function processMenuImage(
  input: Buffer,
): Promise<ProcessedMenuImage> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(input, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata());
  } catch {
    throw invalidImage();
  }
  if (!format || !ALLOWED_FORMATS.has(format)) {
    throw invalidImage();
  }

  try {
    const buffer = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: MENU_IMAGE_MAX_SIDE,
        height: MENU_IMAGE_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: MENU_IMAGE_QUALITY })
      .toBuffer();
    return { buffer, contentType: 'image/webp' };
  } catch {
    // Cabecera válida pero contenido corrupto o demasiado grande.
    throw invalidImage();
  }
}

function invalidImage(): BadRequestException {
  return new BadRequestException(
    'La imagen debe ser JPG, PNG o WebP válida (máximo 5 MB y 40 megapíxeles).',
  );
}
