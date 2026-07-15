import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard para proteger rutas con el access token JWT propio. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
