import { BadRequestException } from '@nestjs/common';
import sharp, { type Sharp } from 'sharp';
import { processMenuImage } from './menu-image.processor';

const solid = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#2e86de' } });

describe('processMenuImage', () => {
  it.each([
    ['jpeg', (img: Sharp) => img.jpeg()],
    ['png', (img: Sharp) => img.png()],
    ['webp', (img: Sharp) => img.webp()],
  ])('accepts %s and always returns webp', async (_format, encode) => {
    const input = await encode(solid(100, 80)).toBuffer();

    const result = await processMenuImage(input);

    expect(result.contentType).toBe('image/webp');
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
  });

  it('shrinks the longer side to 1200 px keeping the aspect ratio', async () => {
    const input = await solid(3000, 1500).png().toBuffer();

    const { buffer } = await processMenuImage(input);

    const meta = await sharp(buffer).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 600]);
  });

  it('does not enlarge small images', async () => {
    const input = await solid(300, 200).png().toBuffer();

    const { buffer } = await processMenuImage(input);

    const meta = await sharp(buffer).metadata();
    expect([meta.width, meta.height]).toEqual([300, 200]);
  });

  it('applies the EXIF orientation and strips metadata (e.g. GPS)', async () => {
    // Orientación 6 = rotar 90°: una foto "acostada" de 400x200 se ve de 200x400.
    const input = await solid(400, 200)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const { buffer } = await processMenuImage(input);

    const meta = await sharp(buffer).metadata();
    expect([meta.width, meta.height]).toEqual([200, 400]);
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it('rejects content that is not an image, whatever its name says', async () => {
    await expect(
      processMenuImage(Buffer.from('<?php echo "hola"; ?>')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects image formats other than jpg/png/webp', async () => {
    const gif = await solid(10, 10).gif().toBuffer();

    await expect(processMenuImage(gif)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects images over the pixel limit (decompression bombs)', async () => {
    // 8000x8000 = 64 MP > 40 MP; como PNG de un solo color pesa muy poco.
    const huge = await solid(8000, 8000).png().toBuffer();

    await expect(processMenuImage(huge)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
