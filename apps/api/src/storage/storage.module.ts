import { Module } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

/** Almacenamiento de archivos (ver ADR-028): se inyecta el puerto, no el adaptador. */
@Module({
  providers: [{ provide: StorageService, useClass: S3StorageService }],
  exports: [StorageService],
})
export class StorageModule {}
