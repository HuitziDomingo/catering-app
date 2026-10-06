import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import sharp from 'sharp';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MenuCategory } from '../database/entities/menu-category.entity';
import { MenuItem } from '../database/entities/menu-item.entity';
import { MenuItemPriceHistory } from '../database/entities/menu-item-price-history.entity';
import { StorageService } from '../storage/storage.service';
import {
  MENU_IMAGE_BAD_MULTIPART_MESSAGE,
  MENU_IMAGE_TOO_LARGE_MESSAGE,
} from './menu-image-upload.filter';
import { MAX_MENU_IMAGE_BYTES } from './menu-image.processor';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

/**
 * POST /menu/items/:id/image de punta a punta (servidor HTTP real con
 * multer y sharp reales, sin BD ni almacenamiento): verifica el contrato que
 * ve el dashboard -- 413 por tamaño, 400 por formato o archivo faltante, y
 * que lo que se guarda es webp (ADR-028). Los guards de rol se prueban en
 * menu.controller.spec.ts; aquí dejan pasar.
 */
describe('POST /menu/items/:id/image (integration)', () => {
  let app: INestApplication;
  const itemId = '7f3c2a1e-4b5d-4c6e-9f80-1a2b3c4d5e6f';
  const storage = {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
    getPublicUrl: jest.fn(
      (_bucket: string, key: string) => `http://storage.test/menu-images/${key}`,
    ),
    getSignedUrl: jest.fn(),
  };
  const itemsRepo = {
    findOne: jest.fn(),
    save: jest.fn((item) => Promise.resolve(item)),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        MenuService,
        { provide: getRepositoryToken(MenuItem), useValue: itemsRepo },
        { provide: getRepositoryToken(MenuCategory), useValue: {} },
        { provide: getRepositoryToken(MenuItemPriceHistory), useValue: {} },
        { provide: StorageService, useValue: storage },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = {
            sub: 'staff-1',
            email: 's@example.com',
            role: 'staff',
          };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    itemsRepo.findOne.mockResolvedValue({
      id: itemId,
      categoryId: 'cat-1',
      name: 'Chilaquiles',
      basePrice: '100.00',
      servesMin: 1,
      servesMax: 10,
      attributes: {},
      imageKey: null,
      isActive: true,
    });
  });

  const png = (width: number, height: number) =>
    sharp({
      create: { width, height, channels: 3, background: '#c0392b' },
    })
      .png()
      .toBuffer();

  it('guarda la imagen como webp y responde 201 con imageUrl', async () => {
    const res = await request(app.getHttpServer())
      .post(`/menu/items/${itemId}/image`)
      .attach('image', await png(2400, 1200), 'foto.png');

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toMatch(
      new RegExp(`^http://storage.test/menu-images/menu-items/${itemId}/[0-9a-f-]+\\.webp$`),
    );
    expect(res.body).not.toHaveProperty('imageKey');

    const [bucket, , body, contentType] = storage.putObject.mock.calls[0];
    expect(bucket).toBe('menuImages');
    expect(contentType).toBe('image/webp');
    const meta = await sharp(body).metadata();
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([1200, 600]);
  });

  it('responde 413 si el archivo excede 5 MB, sin tocar el almacenamiento', async () => {
    const res = await request(app.getHttpServer())
      .post(`/menu/items/${itemId}/image`)
      .attach('image', Buffer.alloc(MAX_MENU_IMAGE_BYTES + 1), 'enorme.jpg');

    expect(res.status).toBe(413);
    expect(res.body.message).toBe(MENU_IMAGE_TOO_LARGE_MESSAGE);
    expect(res.body.message).toBe('La imagen excede el tamaño máximo de 5 MB.');
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('responde 400 en español si el archivo llega en otro campo', async () => {
    const res = await request(app.getHttpServer())
      .post(`/menu/items/${itemId}/image`)
      .attach('foto', await png(10, 10), 'foto.png');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MENU_IMAGE_BAD_MULTIPART_MESSAGE);
  });

  it('responde 400 si el contenido no es imagen aunque la extensión diga .jpg', async () => {
    const res = await request(app.getHttpServer())
      .post(`/menu/items/${itemId}/image`)
      .attach('image', Buffer.from('no soy una imagen'), {
        filename: 'foto.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/^La imagen debe ser JPG, PNG o WebP/);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('deja pasar los demás errores sin cambios (404 si el platillo no existe)', async () => {
    itemsRepo.findOne.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post(`/menu/items/${itemId}/image`)
      .attach('image', await png(10, 10), 'foto.png');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('El platillo indicado no existe.');
  });

  it('responde 400 si falta el archivo', async () => {
    const res = await request(app.getHttpServer())
      .post(`/menu/items/${itemId}/image`)
      .field('otro', 'valor');

    expect(res.status).toBe(400);
  });

  it('responde 400 si el id no es uuid, sin consultar la BD', async () => {
    const res = await request(app.getHttpServer())
      .post('/menu/items/no-es-uuid/image')
      .attach('image', await png(10, 10), 'foto.png');

    expect(res.status).toBe(400);
    expect(itemsRepo.findOne).not.toHaveBeenCalled();
  });

  it('PATCH /menu/items/:id descarta imageUrl: solo se pone una imagen subiéndola', async () => {
    await request(app.getHttpServer())
      .patch(`/menu/items/${itemId}`)
      .send({ name: 'Chilaquiles rojos', imageUrl: 'https://otro.sitio/x.jpg' });

    const saved = itemsRepo.save.mock.calls[0][0];
    expect(saved.name).toBe('Chilaquiles rojos');
    expect(saved).not.toHaveProperty('imageUrl');
    expect(saved.imageKey).toBeNull();
  });
});
