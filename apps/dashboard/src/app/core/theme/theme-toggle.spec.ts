import { TestBed } from '@angular/core/testing';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { ThemeToggle } from './theme-toggle';

// TUI_DARK_MODE persiste a localStorage bajo la clave "tuiDark" (ver
// @taiga-ui/core/tokens/dark-mode) -- jsdom trae su propio localStorage en
// memoria, así que no hace falta mockearlo aparte: se limpia entre tests
// igual que se limpiaría un mock.
describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const createFixture = () => {
    TestBed.configureTestingModule({ imports: [ThemeToggle] });
    const fixture = TestBed.createComponent(ThemeToggle);
    fixture.detectChanges();
    return fixture;
  };

  const toggle = (fixture: ReturnType<typeof createFixture>, checked: boolean) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#theme-toggle-switch');
    input.checked = checked;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  it('switching to dark stores the preference in localStorage', () => {
    const fixture = createFixture();

    toggle(fixture, true);

    expect(localStorage.getItem('tuiDark')).toBe('true');
  });

  it('switching back to light stores the preference in localStorage', () => {
    const fixture = createFixture();

    toggle(fixture, true);
    toggle(fixture, false);

    expect(localStorage.getItem('tuiDark')).toBe('false');
  });

  it('shows the moon icon in dark mode and the sun icon in light mode', () => {
    const fixture = createFixture();

    expect(
      fixture.nativeElement.querySelector('[data-testid="theme-toggle-icon-sun"]'),
    ).not.toBeNull();

    toggle(fixture, true);

    expect(
      fixture.nativeElement.querySelector('[data-testid="theme-toggle-icon-moon"]'),
    ).not.toBeNull();
  });

  it('a simulated reload picks up the previously persisted preference', () => {
    const fixture = createFixture();
    toggle(fixture, true);
    expect(localStorage.getItem('tuiDark')).toBe('true');

    // Simula un reload: nuevo injector raíz, TUI_DARK_MODE se reconstruye
    // desde cero y debe leer el valor ya persistido en localStorage.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const darkModeAfterReload = TestBed.inject(TUI_DARK_MODE);

    expect(darkModeAfterReload()).toBe(true);
  });
});
