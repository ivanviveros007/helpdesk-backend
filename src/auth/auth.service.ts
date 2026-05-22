import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TechniciansService } from '../technicians/technicians.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly techniciansService: TechniciansService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const tech = await this.techniciansService.findByEmail(dto.email);
    if (!tech) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, tech.password_hash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    if (!tech.estado_activo) throw new UnauthorizedException('Account is inactive');

    const payload = { sub: tech.id, email: tech.email, role: tech.role };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: tech.id,
        nombre: tech.nombre,
        email: tech.email,
        role: tech.role,
        nivel: tech.nivel,
      },
    };
  }
}
