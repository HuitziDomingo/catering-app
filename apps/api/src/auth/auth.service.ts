import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { User } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.interface';

/** Rol por defecto que se asigna a quien se registra desde la app. */
const DEFAULT_ROLE = 'customer';
const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Dueño único del auth (ADR-010): hash de contraseña (bcrypt), emisión y
 * validación de JWT propios, y refresh tokens. Sin Supabase Auth.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado.');
    }

    const role = await this.roles.findOne({ where: { name: DEFAULT_ROLE } });
    if (!role) {
      // Los roles se siembran en la primera migración; si falta, es un error
      // de configuración de la base, no del cliente.
      throw new InternalServerErrorException(
        `El rol por defecto "${DEFAULT_ROLE}" no existe. ¿Se corrieron las migraciones?`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone ?? null,
      whatsappNumber: dto.whatsappNumber ?? null,
      passwordHash,
      roleId: role.id,
      role,
      isActive: true,
    });
    const saved = await this.users.save(user);

    return this.issueTokens(saved, role.name);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.issueTokens(user, user.role.name);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.requireSecret('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado.');
    }

    const user = await this.users.findOne({
      where: { id: payload.sub },
      relations: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return this.issueTokens(user, user.role.name);
  }

  /** Verifica credenciales; lanza 401 si no coinciden. */
  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.users.findOne({
      where: { email },
      relations: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
    return user;
  }

  private async issueTokens(user: User, roleName: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: roleName,
    };

    // `expiresIn` de jsonwebtoken es `number | StringValue` (tipo plantilla del
    // paquete `ms`); un string de config no encaja sin aserción explícita.
    const expiresIn = (value: string): JwtSignOptions['expiresIn'] =>
      value as JwtSignOptions['expiresIn'];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.requireSecret('JWT_ACCESS_SECRET'),
        expiresIn: expiresIn(
          this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        ),
      }),
      this.jwt.signAsync(payload, {
        secret: this.requireSecret('JWT_REFRESH_SECRET'),
        expiresIn: expiresIn(
          this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
        ),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private requireSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
    const secret = this.config.get<string>(key);
    if (!secret) {
      throw new InternalServerErrorException(`${key} no está definida.`);
    }
    return secret;
  }
}
