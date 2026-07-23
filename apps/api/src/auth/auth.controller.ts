import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, minutes } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { LoginDto } from './dto/login.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './jwt-payload.interface';

/**
 * Límite estricto para endpoints de auth (registro/login/refresh): 5
 * intentos por minuto por IP. Son los blancos típicos de fuerza bruta y
 * credential stuffing, y esta app maneja cuentas reales de clientes — el
 * límite laxo global (ThrottlerModule en AppModule) no es suficiente aquí.
 */
const AUTH_THROTTLE = { default: { limit: 5, ttl: minutes(1) } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Registra un nuevo usuario y emite sus tokens.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Usuario creado.', type: AuthTokensDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'DTO inválido (email, contraseña, etc).', type: ErrorResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'El email ya está registrado.', type: ErrorResponseDto })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Límite de 5 solicitudes por minuto por IP excedido.', type: ErrorResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Autentica un usuario existente y emite sus tokens.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Credenciales válidas.', type: AuthTokensDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'DTO inválido.', type: ErrorResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Credenciales inválidas.', type: ErrorResponseDto })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Límite de 5 solicitudes por minuto por IP excedido.', type: ErrorResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Emite un nuevo par de tokens a partir de un refresh token vigente.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refresh token válido.', type: AuthTokensDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'DTO inválido.', type: ErrorResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token inválido, expirado, o usuario inactivo/inexistente.', type: ErrorResponseDto })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Límite de 5 solicitudes por minuto por IP excedido.', type: ErrorResponseDto })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  /** Ruta protegida de prueba: devuelve el payload del token actual. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Devuelve el payload del access token actual (ruta protegida de prueba).' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token válido.', type: MeResponseDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Falta el access token o es inválido/expirado.', type: ErrorResponseDto })
  me(@Req() req: Request): JwtPayload {
    return req.user as JwtPayload;
  }
}
