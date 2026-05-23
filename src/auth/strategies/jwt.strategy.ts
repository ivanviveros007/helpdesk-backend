import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TechniciansService } from '../../technicians/technicians.service';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  entity_type: 'user' | 'technician' | 'superadmin';
  org_id: string | null;
  nombre: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly techniciansService: TechniciansService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.entity_type === 'superadmin') {
      // Super-admin tokens are validated by SuperAdminGuard — pass through here
    } else if (payload.entity_type === 'user') {
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.estado_activo) throw new UnauthorizedException();
    } else {
      const tech = await this.techniciansService.findOne(payload.sub);
      if (!tech || !tech.estado_activo) throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      entity_type: payload.entity_type,
      org_id: payload.org_id,
      nombre: payload.nombre,
    };
  }
}
