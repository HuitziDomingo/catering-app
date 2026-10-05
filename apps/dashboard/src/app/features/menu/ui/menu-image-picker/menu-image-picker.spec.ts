import { TestBed } from '@angular/core/testing';
import { MENU_IMAGE_MAX_BYTES } from '@catering-app/shared-types';
import type { MenuImageChange } from '../../util/menu-image';
import { MenuImagePicker } from './menu-image-picker';

describe('MenuImagePicker', () => {
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    // jsdom no implementa object URLs.
    let counter = 0;
    createObjectURL = jest.fn(() => `blob:preview-${++counter}`);
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  const render = (currentUrl: string | null = null) => {
    const fixture = TestBed.createComponent(MenuImagePicker);
    fixture.componentRef.setInput('currentUrl', currentUrl);
    fixture.componentRef.setInput('itemName', 'Chilaquiles');
    const changes: MenuImageChange[] = [];
    fixture.componentInstance.changed.subscribe((change) => changes.push(change));
    fixture.detectChanges();
    return { fixture, changes };
  };
  const el = (fixture: ReturnType<typeof render>['fixture']) =>
    fixture.nativeElement as HTMLElement;
  const query = (fixture: ReturnType<typeof render>['fixture'], testId: string) =>
    el(fixture).querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const pick = (fixture: ReturnType<typeof render>['fixture'], file: File) => {
    const input = query(fixture, 'image-file-input') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const png = (size = 1024) => new File([new Uint8Array(size)], 'foto.png', { type: 'image/png' });
  const shownSrc = (fixture: ReturnType<typeof render>['fixture']) =>
    (query(fixture, 'thumbnail-image') as HTMLImageElement | null)?.getAttribute('src') ?? null;

  it('shows the placeholder and "Elegir imagen" when there is no image', () => {
    const { fixture } = render();

    expect(query(fixture, 'thumbnail-placeholder')).not.toBeNull();
    expect(query(fixture, 'image-choose-button')?.textContent?.trim()).toBe('Elegir imagen');
    expect(query(fixture, 'image-remove-button')).toBeNull();
  });

  it('shows the current image with "Reemplazar" and "Quitar"', () => {
    const { fixture } = render('http://storage.test/a.webp');

    expect(shownSrc(fixture)).toBe('http://storage.test/a.webp');
    expect(query(fixture, 'image-choose-button')?.textContent?.trim()).toBe('Reemplazar');
    expect(query(fixture, 'image-remove-button')).not.toBeNull();
  });

  it('previews a valid file before uploading and emits replace', () => {
    const { fixture, changes } = render('http://storage.test/a.webp');
    const file = png();

    pick(fixture, file);

    expect(shownSrc(fixture)).toBe('blob:preview-1');
    expect(changes).toEqual([{ kind: 'replace', file }]);
    expect(query(fixture, 'image-pending')?.textContent).toContain('Se subirá al guardar');
  });

  it('rejects an invalid type with a Spanish error and keeps the current image', () => {
    const { fixture, changes } = render('http://storage.test/a.webp');

    pick(fixture, new File(['x'], 'animada.gif', { type: 'image/gif' }));

    expect(query(fixture, 'image-error')?.textContent).toContain(
      'Formato no permitido: usa una imagen JPG, PNG o WebP.',
    );
    expect(changes).toEqual([]);
    expect(shownSrc(fixture)).toBe('http://storage.test/a.webp');
  });

  it('rejects a file over 5 MB with the same message as the API', () => {
    const { fixture, changes } = render();

    pick(fixture, png(MENU_IMAGE_MAX_BYTES + 1));

    expect(query(fixture, 'image-error')?.textContent).toContain(
      'La imagen excede el tamaño máximo de 5 MB.',
    );
    expect(changes).toEqual([]);
  });

  it('"Quitar" on a saved image emits remove and shows the placeholder', () => {
    const { fixture, changes } = render('http://storage.test/a.webp');

    query(fixture, 'image-remove-button')?.click();
    fixture.detectChanges();

    expect(changes).toEqual([{ kind: 'remove' }]);
    expect(query(fixture, 'thumbnail-placeholder')).not.toBeNull();
    expect(query(fixture, 'image-pending')?.textContent).toContain('Se quitará al guardar');
  });

  it('"Quitar" on a just-picked file (no saved image) goes back to keep and frees the preview', () => {
    const { fixture, changes } = render();
    pick(fixture, png());

    query(fixture, 'image-remove-button')?.click();
    fixture.detectChanges();

    expect(changes.at(-1)).toEqual({ kind: 'keep' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });

  it('"Deshacer" restores the saved image', () => {
    const { fixture, changes } = render('http://storage.test/a.webp');
    pick(fixture, png());

    query(fixture, 'image-undo-button')?.click();
    fixture.detectChanges();

    expect(changes.at(-1)).toEqual({ kind: 'keep' });
    expect(shownSrc(fixture)).toBe('http://storage.test/a.webp');
    expect(query(fixture, 'image-undo-button')).toBeNull();
  });

  it('frees the previous preview when picking another file', () => {
    const { fixture } = render();
    pick(fixture, png());
    pick(fixture, png());

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(shownSrc(fixture)).toBe('blob:preview-2');
  });

  it('shows the upload progress and disables the buttons while saving', () => {
    const { fixture } = render('http://storage.test/a.webp');

    fixture.componentRef.setInput('progress', 60);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(query(fixture, 'image-progress')?.textContent).toContain('Subiendo imagen… 60%');
    expect((query(fixture, 'image-choose-button') as HTMLButtonElement).disabled).toBe(true);
    expect((query(fixture, 'image-remove-button') as HTMLButtonElement).disabled).toBe(true);
  });
});
