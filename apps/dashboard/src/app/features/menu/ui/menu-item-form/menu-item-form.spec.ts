import { TestBed } from '@angular/core/testing';
import type { MenuCategory } from '@catering-app/shared-types';
import { MenuItemForm } from './menu-item-form';

const category: MenuCategory = {
  id: 'cat-1',
  name: 'Desayunos',
  displayOrder: 1,
  isActive: true,
};

// Expone el FormGroup `protected` del componente para las aserciones de este
// spec sin relajar su visibilidad en el componente en sí.
const formOf = (instance: MenuItemForm) => (instance as unknown as { form: MenuItemForm['form'] }).form;

describe('MenuItemForm', () => {
  const createFixture = () => {
    const fixture = TestBed.createComponent(MenuItemForm);
    fixture.componentRef.setInput('categories', [category]);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuItemForm],
    }).compileComponents();
  });

  it('starts invalid: name, categoryId, basePrice and servesPeople are required', () => {
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

  it('rejects servesPeople below 1', () => {
    const form = formOf(createFixture().componentInstance);

    form.controls.servesPeople.setValue(0);
    expect(form.controls.servesPeople.invalid).toBe(true);

    form.controls.servesPeople.setValue(1);
    expect(form.controls.servesPeople.invalid).toBe(false);
  });

  it('is valid and emits the expected DTO once all required fields are filled', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const emitted: unknown[] = [];
    component.save.subscribe((dto) => emitted.push(dto));

    const form = formOf(component);
    form.setValue({
      name: 'Chilaquiles verdes',
      description: 'Con pollo',
      categoryId: 'cat-1',
      basePrice: 95.5,
      servesPeople: 2,
      isActive: true,
    });
    expect(form.invalid).toBe(false);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(emitted).toEqual([
      {
        name: 'Chilaquiles verdes',
        description: 'Con pollo',
        categoryId: 'cat-1',
        basePrice: 95.5,
        servesPeople: 2,
        isActive: true,
      },
    ]);
  });

  it('does not emit when submitted while invalid', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const emitted: unknown[] = [];
    component.save.subscribe((dto) => emitted.push(dto));

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(emitted).toEqual([]);
    expect(formOf(component).touched).toBe(true);
  });

  it('patches the form with the existing item when editing', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('item', {
      id: 'item-1',
      categoryId: 'cat-1',
      name: 'Flan napolitano',
      description: 'Receta casera',
      basePrice: '45.00',
      servesPeople: 1,
      attributes: {},
      imageUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    fixture.detectChanges();

    expect(formOf(fixture.componentInstance).getRawValue()).toMatchObject({
      name: 'Flan napolitano',
      basePrice: 45,
      servesPeople: 1,
    });
  });
});
