import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ErrorResponseDto } from '../auth/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { StorageService } from '../storage/storage.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuCategoryResponseDto } from './dto/menu-category-response.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuImageUploadFilter } from './menu-image-upload.filter';
import { MAX_MENU_IMAGE_BYTES } from './menu-image.processor';
import { toMenuItemResponse } from './menu-item-response.mapper';
import { MenuService } from './menu.service';

/** Roles con permiso de escritura sobre el catálogo de menú. */
const MENU_WRITE_ROLES = ['staff', 'admin', 'superadmin'];

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(
    private readonly menu: MenuService,
    private readonly storage: StorageService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Lista las categorías de menú activas.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categorías activas, ordenadas por displayOrder.',
    type: [MenuCategoryResponseDto],
  })
  findActiveCategories(): Promise<MenuCategoryResponseDto[]> {
    return this.menu.findActiveCategories();
  }

  @Get('items')
  @ApiOperation({
    summary: 'Lista los platillos activos del menú, con filtro opcional por categoría.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'id (uuid) de categoría para filtrar los platillos.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Platillos activos.',
    type: [MenuItemResponseDto],
  })
  async findActiveItems(
    @Query('categoryId') categoryId?: string,
  ): Promise<MenuItemResponseDto[]> {
    const items = await this.menu.findActiveItems(categoryId);
    return items.map((item) => toMenuItemResponse(item, this.storage));
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MENU_WRITE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crea un platillo de menú (solo staff/admin/superadmin).' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Platillo creado.',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DTO inválido, o servesMax menor que servesMin (ver ADR-021).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'La categoría indicada no existe.',
    type: ErrorResponseDto,
  })
  async createItem(
    @Body() dto: CreateMenuItemDto,
  ): Promise<MenuItemResponseDto> {
    return toMenuItemResponse(await this.menu.createItem(dto), this.storage);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MENU_WRITE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Actualiza un platillo de menú (solo staff/admin/superadmin). Un cambio de ' +
      'basePrice queda registrado en el historial de precios.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del platillo.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Platillo actualizado.',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'DTO inválido, o el servesMax/servesMin efectivo (nuevo o ya ' +
      'guardado) queda con servesMax menor que servesMin (ver ADR-021).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El platillo (o la categoría indicada) no existe.',
    type: ErrorResponseDto,
  })
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @Req() req: Request,
  ): Promise<MenuItemResponseDto> {
    const user = req.user as JwtPayload;
    return toMenuItemResponse(
      await this.menu.updateItem(id, dto, user.sub),
      this.storage,
    );
  }

  @Post('items/:id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MENU_WRITE_ROLES)
  // Traduce al español los errores de multer (413 "File too large", campo
  // equivocado...); debe envolver al interceptor, que es quien los lanza.
  @UseFilters(MenuImageUploadFilter)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_MENU_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'JPG, PNG o WebP, máximo 5 MB.',
        },
      },
    },
  })
  @ApiOperation({
    summary:
      'Sube o reemplaza la imagen de un platillo (solo staff/admin/superadmin). ' +
      'Se guarda como webp de máximo 1200 px y se borra la anterior (ADR-028).',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del platillo.' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Imagen guardada; devuelve el platillo con su nueva imageUrl.',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Falta el archivo, el id no es uuid, o el archivo no es una imagen ' +
      'JPG/PNG/WebP válida.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El platillo no existe.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    description: 'El archivo excede 5 MB ("La imagen excede el tamaño máximo de 5 MB.").',
    type: ErrorResponseDto,
  })
  async uploadItemImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<MenuItemResponseDto> {
    if (!file) {
      throw new BadRequestException(
        'Falta el archivo de imagen (campo "image" del multipart).',
      );
    }
    return toMenuItemResponse(
      await this.menu.setItemImage(id, file.buffer),
      this.storage,
    );
  }

  @Delete('items/:id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MENU_WRITE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Quita la imagen de un platillo (solo staff/admin/superadmin). Sin ' +
      'imagen no hace nada.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del platillo.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Platillo sin imagen (imageUrl: null).',
    type: MenuItemResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El id no es uuid.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El platillo no existe.',
    type: ErrorResponseDto,
  })
  async removeItemImage(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<MenuItemResponseDto> {
    return toMenuItemResponse(
      await this.menu.removeItemImage(id),
      this.storage,
    );
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MENU_WRITE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Da de baja un platillo de menú (soft delete: is_active = false). ' +
      'Solo staff/admin/superadmin.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del platillo.' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Platillo dado de baja.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El platillo no existe.',
    type: ErrorResponseDto,
  })
  async deleteItem(@Param('id') id: string): Promise<void> {
    await this.menu.softDeleteItem(id);
  }
}
