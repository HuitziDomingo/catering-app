import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { MenuItem } from '@catering-app/shared-types';
import { API_BASE_URL } from '../../../core/api-config';
import type { MenuImageUploadEvent } from '../util/menu-image';
import { MenuDataAccessService } from './menu-data-access.service';

const item = { id: 'item-1', imageUrl: 'http://storage.test/a.webp' } as MenuItem;

describe('MenuDataAccessService (images)', () => {
  let service: MenuDataAccessService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MenuDataAccessService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploadItemImage posts the file as multipart field "image" and maps progress and result', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    const events: MenuImageUploadEvent[] = [];

    service.uploadItemImage('item-1', file).subscribe((event) => events.push(event));

    const req = http.expectOne(`${API_BASE_URL}/menu/items/item-1/image`);
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('image')).toBe(file);

    req.event({ type: HttpEventType.Sent });
    req.event({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 });
    req.event({ type: HttpEventType.UploadProgress, loaded: 200, total: 200 });
    req.flush(item);

    expect(events).toEqual([
      { type: 'progress', percent: 25 },
      { type: 'progress', percent: 100 },
      { type: 'done', item },
    ]);
  });

  it('uploadItemImage reports 0% when the browser does not know the total size', () => {
    const events: MenuImageUploadEvent[] = [];
    service
      .uploadItemImage('item-1', new File(['x'], 'a.png', { type: 'image/png' }))
      .subscribe((event) => events.push(event));

    const req = http.expectOne(`${API_BASE_URL}/menu/items/item-1/image`);
    req.event({ type: HttpEventType.UploadProgress, loaded: 10 });
    req.flush(item);

    expect(events[0]).toEqual({ type: 'progress', percent: 0 });
  });

  it('uploadItemImage propagates the API error (e.g. 413) untouched', () => {
    let error: unknown;
    service
      .uploadItemImage('item-1', new File(['x'], 'a.png', { type: 'image/png' }))
      .subscribe({ error: (err: unknown) => (error = err) });

    http
      .expectOne(`${API_BASE_URL}/menu/items/item-1/image`)
      .flush(
        { statusCode: 413, message: 'La imagen excede el tamaño máximo de 5 MB.' },
        { status: 413, statusText: 'Payload Too Large' },
      );

    expect(error).toMatchObject({
      status: 413,
      error: { message: 'La imagen excede el tamaño máximo de 5 MB.' },
    });
  });

  it('removeItemImage sends DELETE /menu/items/:id/image', () => {
    let result: MenuItem | undefined;
    service.removeItemImage('item-1').subscribe((value) => (result = value));

    const req = http.expectOne(`${API_BASE_URL}/menu/items/item-1/image`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...item, imageUrl: null });

    expect(result?.imageUrl).toBeNull();
  });
});
