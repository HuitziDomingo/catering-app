import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
  let completeWith: jest.Mock;

  // MenuItemForm se abre como contenido de diálogo (TuiDialogService.open),
  // no con [item]/[categories] por binding de plantilla -- el equivalente
  // de prueba es proveer POLYMORPHEUS_CONTEXT directamente (mismo mecanismo
  // que injectContext() usa en tiempo de ejecución).
  const createFixture = (dialogItem: MenuItem | null = null) => {
    save = jest.fn();
    completeWith = jest.fn();

    TestBed.configureTestingModule({
      imports: [MenuItemForm],
      providers: [
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {
            data: { item: dialogItem, categories: [category], save },
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

    expect(save).toHaveBeenCalledWith({
      name: 'Chilaquiles verdes',
      description: 'Con pollo',
      categoryId: 'cat-1',
      basePrice: 95.5,
      servesMin: 2,
      servesMax: 4,
      isActive: true,
    });
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
});
