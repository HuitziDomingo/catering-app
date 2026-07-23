import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { MenuCategoryResponseDto } from './dto/menu-category-response.dto';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuService } from './menu.service';

/** Roles con permiso de escritura sobre el catálogo de menú. */
const MENU_WRITE_ROLES = ['staff', 'admin', 'superadmin'];

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

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
  findActiveItems(
    @Query('categoryId') categoryId?: string,
  ): Promise<MenuItemResponseDto[]> {
    return this.menu.findActiveItems(categoryId);
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
    description: 'DTO inválido.',
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
  createItem(@Body() dto: CreateMenuItemDto): Promise<MenuItemResponseDto> {
    return this.menu.createItem(dto);
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
    description: 'DTO inválido.',
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
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @Req() req: Request,
  ): Promise<MenuItemResponseDto> {
    const user = req.user as JwtPayload;
    return this.menu.updateItem(id, dto, user.sub);
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
