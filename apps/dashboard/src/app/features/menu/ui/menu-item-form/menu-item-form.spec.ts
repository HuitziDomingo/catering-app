import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { MenuItemForm } from './menu-item-form';

const category: MenuCategory = {
  id: 'cat-1',
  name: 'Desayunos',
  displayOrder: 1,
  isActive: true,
};

const item: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Flan napolitano',
  description: 'Receta casera',
  basePrice: 45,
  servesMin: 1,
  servesMax: 1,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const formOf = (instance: MenuItemForm) => (instance as unknown as { form: MenuItemForm['form'] }).form;

describe('MenuItemForm', () => {
  let save: jest.Mock;
  let uploadImage: jest.Mock;
  let removeImage: jest.Mock;
  let completeWith: jest.Mock;

  // MenuItemForm se abre como contenido de diálogo (TuiDialogService.open),
  // no con [item]/[categories] por binding de plantilla -- el equivalente
  // de prueba es proveer POLYMORPHEUS_CONTEXT directamente (mismo mecanismo
  // que injectContext() usa en tiempo de ejecución).
  const createFixture = (dialogItem: MenuItem | null = null) => {
    save = jest.fn();
    uploadImage = jest.fn();
    removeImage = jest.fn();
    completeWith = jest.fn();

    TestBed.configureTestingModule({
      imports: [MenuItemForm],
      providers: [
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {
            data: { item: dialogItem, categories: [category], save, uploadImage, removeImage },
            completeWith,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MenuItemForm);
    fixture.detectChanges();
    return fixture;
  };

  it('opens with an empty/default form when creating', () => {
    const form = formOf(createFixture().componentInstance);

    expect(form.getRawValue()).toMatchObject({
      name: '',
      categoryId: '',
      basePrice: 0,
      servesMin: 1,
      servesMax: 1,
      isActive: true,
    });
  });

  it('opens pre-filled with the existing item when editing', () => {
    const form = formOf(createFixture(item).componentInstance);

    expect(form.getRawValue()).toMatchObject({
      name: 'Flan napolitano',
      basePrice: 45,
      servesMin: 1,
      servesMax: 1,
    });
  });

  it('starts invalid: name and categoryId are required', () => {
    const form = formOf(createFixture().componentInstance);

    expect(form.invalid).toBe(true);
    expect(form.controls.name.invalid).toBe(true);
    expect(form.controls.categoryId.invalid).toBe(true);
  });

  it('rejects a zero or negative basePrice', () => {
    const form = formOf(createFixture().componentInstance);

    form.controls.basePrice.setValue(0);
    expect(form.controls.basePrice.invalid).toBe(true);

    form.controls.basePrice.setValue(-5);
    expect(form.controls.basePrice.invalid).toBe(true);

    form.controls.basePrice.setValue(10);
    expect(form.controls.basePrice.invalid).toBe(false);
  });

  it('rejects servesMin or servesMax below 1', () => {
    const form = formOf(createFixture().componentInstance);

    form.controls.servesMin.setValue(0);
    expect(form.controls.servesMin.invalid).toBe(true);

    form.controls.servesMin.setValue(1);
    expect(form.controls.servesMin.invalid).toBe(false);

    form.controls.servesMax.setValue(0);
    expect(form.controls.servesMax.invalid).toBe(true);

    form.controls.servesMax.setValue(1);
    expect(form.controls.servesMax.invalid).toBe(false);
  });

  it('rejects a servesMax lower than servesMin', () => {
    const form = formOf(createFixture().componentInstance);

    form.controls.servesMin.setValue(5);
    form.controls.servesMax.setValue(2);
    expect(form.errors?.['servesRange']).toBe(true);

    form.controls.servesMax.setValue(5);
    expect(form.errors?.['servesRange']).toBeUndefined();
  });

  it('does not call save when submitted while invalid', () => {
    const fixture = createFixture();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(save).not.toHaveBeenCalled();
    expect(formOf(fixture.componentInstance).touched).toBe(true);
  });

  it('calls save with the expected DTO once all required fields are filled', () => {
    const fixture = createFixture();
    save.mockReturnValue(of(item));
    const form = formOf(fixture.componentInstance);
    form.setValue({
      name: 'Chilaquiles verdes',
      description: 'Con pollo',
      categoryId: 'cat-1',
      basePrice: 95.5,
      servesMin: 2,
      servesMax: 4,
      isActive: true,
    });
    expect(form.invalid).toBe(false);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(save).toHaveBeenCalledWith(
      {
        name: 'Chilaquiles verdes',
        description: 'Con pollo',
        categoryId: 'cat-1',
        basePrice: 95.5,
        servesMin: 2,
        servesMax: 4,
        isActive: true,
      },
      null,
    );
  });

  it('closes the dialog once save succeeds', () => {
    const fixture = createFixture();
    save.mockReturnValue(of(item));
    formOf(fixture.componentInstance).setValue({
      name: 'Chilaquiles verdes',
      description: 'Con pollo',
      categoryId: 'cat-1',
      basePrice: 95.5,
      servesMin: 2,
      servesMax: 4,
      isActive: true,
    });

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(completeWith).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and shows the error when save fails', () => {
    const fixture = createFixture();
    save.mockReturnValue(throwError(() => new Error('Unauthorized')));
    formOf(fixture.componentInstance).setValue({
      name: 'Chilaquiles verdes',
      description: 'Con pollo',
      categoryId: 'cat-1',
      basePrice: 95.5,
      servesMin: 2,
      servesMax: 4,
      isActive: true,
    });

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(completeWith).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="form-error"]').textContent).toContain(
      'Unauthorized',
    );
  });

  it('closes without calling save when cancelled', () => {
    const fixture = createFixture();

    fixture.nativeElement.querySelector('[data-testid="cancel-button"]').click();

    expect(save).not.toHaveBeenCalled();
    expect(completeWith).toHaveBeenCalledTimes(1);
  });

  describe('image', () => {
    const validValue = {
      name: 'Chilaquiles verdes',
      description: 'Con pollo',
      categoryId: 'cat-1',
      basePrice: 95.5,
      servesMin: 2,
      servesMax: 4,
      isActive: true,
    };
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    const withImage: MenuItem = { ...item, imageUrl: 'http://storage.test/a.webp' };

    beforeEach(() => {
      Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:preview'), revokeObjectURL: jest.fn() });
    });

    const pickFile = (fixture: ReturnType<typeof createFixture>, picked: File) => {
      const input = fixture.nativeElement.querySelector(
        '[data-testid="image-file-input"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [picked], configurable: true });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const submit = (fixture: ReturnType<typeof createFixture>) => {
      fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
      fixture.detectChanges();
    };
    const formError = (fixture: ReturnType<typeof createFixture>) =>
      fixture.nativeElement.querySelector('[data-testid="form-error"]')?.textContent ?? '';

    it('creates the item first and then uploads the image to its new id', () => {
      const fixture = createFixture();
      save.mockReturnValue(of({ ...item, id: 'new-id' }));
      uploadImage.mockReturnValue(of({ type: 'done', item: withImage }));
      formOf(fixture.componentInstance).setValue(validValue);
      pickFile(fixture, file);

      submit(fixture);

      expect(save).toHaveBeenCalled();
      expect(uploadImage).toHaveBeenCalledWith('new-id', file);
      expect(completeWith).toHaveBeenCalledTimes(1);
    });

    it('does not touch the image endpoints when the image did not change', () => {
      const fixture = createFixture(withImage);
      save.mockReturnValue(of(withImage));

      submit(fixture);

      expect(save).toHaveBeenCalledWith(expect.any(Object), withImage.id);
      expect(uploadImage).not.toHaveBeenCalled();
      expect(removeImage).not.toHaveBeenCalled();
      expect(completeWith).toHaveBeenCalledTimes(1);
    });

    it('removes the saved image when "Quitar" was chosen', () => {
      const fixture = createFixture(withImage);
      save.mockReturnValue(of(withImage));
      removeImage.mockReturnValue(of(item));
      fixture.nativeElement.querySelector('[data-testid="image-remove-button"]').click();
      fixture.detectChanges();

      submit(fixture);

      expect(removeImage).toHaveBeenCalledWith(item.id);
      expect(completeWith).toHaveBeenCalledTimes(1);
    });

    it('shows the upload progress and keeps the dialog open until the upload ends', () => {
      const fixture = createFixture(item);
      const upload$ = new Subject<
        { type: 'progress'; percent: number } | { type: 'done'; item: MenuItem }
      >();
      save.mockReturnValue(of(item));
      uploadImage.mockReturnValue(upload$);
      pickFile(fixture, file);

      submit(fixture);
      upload$.next({ type: 'progress', percent: 45 });
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="image-progress"]').textContent,
      ).toContain('45%');
      expect(fixture.nativeElement.querySelector('[data-testid="submit-button"]').disabled).toBe(true);
      expect(completeWith).not.toHaveBeenCalled();

      upload$.next({ type: 'done', item: withImage });
      upload$.complete();

      expect(completeWith).toHaveBeenCalledTimes(1);
    });

    it('shows the API message (e.g. 413) and that the item itself was saved', () => {
      const fixture = createFixture(item);
      save.mockReturnValue(of(item));
      uploadImage.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 413,
              error: { statusCode: 413, message: 'La imagen excede el tamaño máximo de 5 MB.' },
            }),
        ),
      );
      pickFile(fixture, file);

      submit(fixture);

      expect(completeWith).not.toHaveBeenCalled();
      expect(formError(fixture)).toContain('El platillo se guardó, pero la imagen no se pudo actualizar');
      expect(formError(fixture)).toContain('La imagen excede el tamaño máximo de 5 MB.');
      expect(fixture.nativeElement.querySelector('[data-testid="image-progress"]')).toBeNull();
    });

    it('after a failed upload on create, retrying updates the created item instead of creating another', () => {
      const fixture = createFixture();
      const created = { ...item, id: 'new-id' };
      save.mockReturnValue(of(created));
      uploadImage.mockReturnValueOnce(throwError(() => new Error('Network down')));
      formOf(fixture.componentInstance).setValue(validValue);
      pickFile(fixture, file);
      submit(fixture);
      expect(fixture.nativeElement.querySelector('[data-testid="submit-button"]').textContent).toContain(
        'Guardar cambios',
      );

      uploadImage.mockReturnValueOnce(of({ type: 'done', item: withImage }));
      submit(fixture);

      expect(save).toHaveBeenNthCalledWith(1, expect.any(Object), null);
      expect(save).toHaveBeenNthCalledWith(2, expect.any(Object), 'new-id');
      expect(uploadImage).toHaveBeenLastCalledWith('new-id', file);
      expect(completeWith).toHaveBeenCalledTimes(1);
    });
  });
});
