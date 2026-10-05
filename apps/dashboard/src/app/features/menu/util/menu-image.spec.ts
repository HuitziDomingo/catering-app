import { MENU_IMAGE_MAX_BYTES } from '@catering-app/shared-types';
import {
  MENU_IMAGE_ACCEPT,
  MENU_IMAGE_INVALID_TYPE_MESSAGE,
  MENU_IMAGE_TOO_LARGE_MESSAGE,
  validateMenuImageFile,
} from './menu-image';

const fileOf = (name: string, type: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type });

describe('validateMenuImageFile', () => {
  it.each([
    ['foto.jpg', 'image/jpeg'],
    ['foto.png', 'image/png'],
    ['foto.webp', 'image/webp'],
  ])('accepts %s', (name, type) => {
    expect(validateMenuImageFile(fileOf(name, type))).toBeNull();
  });

  it.each([
    ['animada.gif', 'image/gif'],
    ['foto.heic', 'image/heic'],
    ['menu.pdf', 'application/pdf'],
  ])('rejects %s with a Spanish message', (name, type) => {
    expect(validateMenuImageFile(fileOf(name, type))).toBe(MENU_IMAGE_INVALID_TYPE_MESSAGE);
  });

  it('accepts exactly the maximum size and rejects one byte more (same rule as the API)', () => {
    expect(validateMenuImageFile(fileOf('a.jpg', 'image/jpeg', MENU_IMAGE_MAX_BYTES))).toBeNull();
    expect(validateMenuImageFile(fileOf('a.jpg', 'image/jpeg', MENU_IMAGE_MAX_BYTES + 1))).toBe(
      MENU_IMAGE_TOO_LARGE_MESSAGE,
    );
    expect(MENU_IMAGE_TOO_LARGE_MESSAGE).toBe('La imagen excede el tamaño máximo de 5 MB.');
  });

  it('falls back to the extension when the browser reports no MIME type', () => {
    expect(validateMenuImageFile(fileOf('FOTO.JPEG', ''))).toBeNull();
    expect(validateMenuImageFile(fileOf('notas.txt', ''))).toBe(MENU_IMAGE_INVALID_TYPE_MESSAGE);
  });

  it('builds the accept attribute from the shared MIME list', () => {
    expect(MENU_IMAGE_ACCEPT).toBe('image/jpeg,image/png,image/webp');
  });
});
