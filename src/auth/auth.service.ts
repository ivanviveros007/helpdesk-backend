import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TechniciansService } from '../technicians/technicians.service';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { InvitationsService } from '../invitations/invitations.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly techniciansService: TechniciansService,
    private readonly usersService: UsersService,
    private readonly orgsService: OrganizationsService,
    private readonly invitationsService: InvitationsService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const tech = await this.techniciansService.findByEmail(dto.email);
    if (tech) {
      const valid = await bcrypt.compare(dto.password, tech.password_hash);
      if (!valid) throw new UnauthorizedException('Invalid credentials');
      if (!tech.estado_activo) throw new UnauthorizedException('Account is inactive');

      const payload = { sub: tech.id, email: tech.email, role: tech.role, entity_type: 'technician', org_id: tech.org_id ?? null, nombre: tech.nombre };
      return {
        access_token: this.jwtService.sign(payload),
        user: { id: tech.id, nombre: tech.nombre, email: tech.email, role: tech.role, entity_type: 'technician', org_id: tech.org_id ?? null, nivel: tech.nivel },
      };
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!user.estado_activo) throw new UnauthorizedException('Account is inactive');

    const payload = { sub: user.id, email: user.email, role: user.role, entity_type: 'user', org_id: user.org_id ?? null, nombre: user.nombre };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, entity_type: 'user', org_id: user.org_id ?? null, nivel: null },
    };
  }

  async register(dto: CreateUserDto) {
    const existingTech = await this.techniciansService.findByEmail(dto.email);
    if (existingTech) throw new ConflictException('Email already in use');

    let org_id: string | undefined;

    if (dto.invite_token) {
      const invite = await this.invitationsService.validate(dto.invite_token);
      if (invite.email !== dto.email) throw new BadRequestException('El email no coincide con la invitación');
      org_id = invite.org_id;
      await this.invitationsService.markUsed(dto.invite_token);
    } else {
      const defaultOrg = await this.orgsService.findBySlug('demo');
      org_id = defaultOrg?.id;
    }

    const user = await this.usersService.create(dto, org_id);

    const payload = { sub: user.id, email: user.email, role: user.role, entity_type: 'user', org_id: user.org_id ?? null, nombre: user.nombre };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, nombre: user.nombre, email: user.email, role: user.role, entity_type: 'user', org_id: user.org_id ?? null, nivel: null },
    };
  }

  validateInvite(token: string) {
    return this.invitationsService.validate(token);
  }
}
