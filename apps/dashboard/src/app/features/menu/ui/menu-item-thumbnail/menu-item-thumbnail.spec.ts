import { TestBed } from '@angular/core/testing';
import { MenuItemThumbnail } from './menu-item-thumbnail';

describe('MenuItemThumbnail', () => {
  const render = (url: string | null, alt = 'Chilaquiles') => {
    const fixture = TestBed.createComponent(MenuItemThumbnail);
    fixture.componentRef.setInput('url', url);
    fixture.componentRef.setInput('alt', alt);
    fixture.detectChanges();
    return fixture;
  };
  const query = (fixture: ReturnType<typeof render>, testId: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

  it('shows the image when there is a URL', () => {
    const fixture = render('http://storage.test/a.webp');

    const img = query(fixture, 'thumbnail-image') as HTMLImageElement;
    expect(img.src).toBe('http://storage.test/a.webp');
    expect(img.alt).toBe('Chilaquiles');
    expect(query(fixture, 'thumbnail-placeholder')).toBeNull();
  });

  it('shows the placeholder when there is no image', () => {
    const fixture = render(null);

    expect(query(fixture, 'thumbnail-image')).toBeNull();
    expect(query(fixture, 'thumbnail-placeholder')?.getAttribute('aria-label')).toBe(
      'Sin imagen: Chilaquiles',
    );
  });

  it('falls back to the placeholder when the image fails to load', () => {
    const fixture = render('http://storage.test/rota.webp');

    query(fixture, 'thumbnail-image')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(query(fixture, 'thumbnail-image')).toBeNull();
    expect(query(fixture, 'thumbnail-placeholder')).not.toBeNull();
  });

  it('tries again when the URL changes after a failure', () => {
    const fixture = render('http://storage.test/rota.webp');
    query(fixture, 'thumbnail-image')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    fixture.componentRef.setInput('url', 'http://storage.test/nueva.webp');
    fixture.detectChanges();

    expect((query(fixture, 'thumbnail-image') as HTMLImageElement).src).toBe(
      'http://storage.test/nueva.webp',
    );
  });
});
