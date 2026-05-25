import { Injectable, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SuperAdmin } from './entities/super-admin.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Technician, TechnicianRole } from '../technicians/entities/technician.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { CreateOrgDto } from './dto/create-org.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(SuperAdmin)
    private readonly superAdminRepo: Repository<SuperAdmin>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async login(dto: LoginSuperAdminDto) {
    const sa = await this.superAdminRepo.findOneBy({ email: dto.email });
    if (!sa) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, sa.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: sa.id, email: sa.email, role: 'superadmin', entity_type: 'superadmin', nombre: sa.nombre };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: sa.id, nombre: sa.nombre, email: sa.email, role: 'superadmin' },
    };
  }

  async getOrganizations() {
    const orgs = await this.orgRepo.find({ order: { created_at: 'DESC' } });
    return Promise.all(orgs.map((org) => this.attachOrgStats(org)));
  }

  async getOrganization(id: string) {
    const org = await this.orgRepo.findOneBy({ id });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return this.attachOrgStats(org);
  }

  async createOrg(dto: CreateOrgDto) {
    const existing = await this.orgRepo.findOneBy({ slug: dto.slug });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already in use`);

    const org = await this.orgRepo.save(
      this.orgRepo.create({
        nombre: dto.nombre,
        slug: dto.slug,
        plan: dto.plan ?? 'trial',
        company_type: dto.company_type,
        ai_custom_instructions: dto.ai_custom_instructions,
      }),
    );

    // Create initial admin for this org
    const password_hash = await bcrypt.hash(dto.admin_password, 10);
    const admin = this.techRepo.create({
      nombre: dto.admin_nombre,
      email: dto.admin_email,
      password_hash,
      role: TechnicianRole.ADMIN,
      org_id: org.id,
      estado_activo: true,
    });
    await this.techRepo.save(admin);

    return this.attachOrgStats(org);
  }

  async updateAiConfig(id: string, data: { company_type?: string; ai_custom_instructions?: string }) {
    const org = await this.orgRepo.findOneBy({ id });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    Object.assign(org, data);
    await this.orgRepo.save(org);
    return { id: org.id, company_type: org.company_type, ai_custom_instructions: org.ai_custom_instructions };
  }

  async updateOrg(id: string, data: { nombre?: string; plan?: string; estado_activo?: boolean }) {
    const org = await this.orgRepo.findOneBy({ id });
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    Object.assign(org, data);
    await this.orgRepo.save(org);
    return this.attachOrgStats(org);
  }

  async createOrgAdmin(orgId: string, dto: { nombre: string; email: string; password: string }) {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org) throw new NotFoundException(`Organization ${orgId} not found`);

    const existing = await this.techRepo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already in use');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const admin = this.techRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      password_hash,
      role: TechnicianRole.ADMIN,
      org_id: orgId,
      estado_activo: true,
    });
    return this.techRepo.save(admin);
  }

  async getGlobalMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total_orgs, orgs_activas, total_tickets, tickets_hoy, tickets_mes] = await Promise.all([
      this.orgRepo.count(),
      this.orgRepo.countBy({ estado_activo: true }),
      this.ticketRepo.count(),
      this.ticketRepo.createQueryBuilder('t').where('t.created_at >= :d', { d: startOfDay }).getCount(),
      this.ticketRepo.createQueryBuilder('t').where('t.created_at >= :d', { d: startOfMonth }).getCount(),
    ]);

    const avgResult = await this.ticketRepo
      .createQueryBuilder('t')
      .select('AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600)', 'avg_hours')
      .where('t.estado = :s', { s: TicketStatus.RESUELTO })
      .getRawOne<{ avg_hours: string }>();

    const orgs_con_tickets = await this.ticketRepo
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.org_id)', 'count')
      .where('t.created_at >= :d', { d: startOfMonth })
      .getRawOne<{ count: string }>();

    return {
      total_orgs,
      orgs_activas,
      total_tickets_all_time: total_tickets,
      tickets_hoy,
      tickets_este_mes: tickets_mes,
      avg_resolution_hours: avgResult?.avg_hours ? parseFloat(avgResult.avg_hours).toFixed(1) : null,
      orgs_con_tickets_este_mes: parseInt(orgs_con_tickets?.count ?? '0'),
    };
  }

  async getOrgMembers(orgId: string) {
    const [technicians, users] = await Promise.all([
      this.techRepo.find({ where: { org_id: orgId }, order: { created_at: 'ASC' } }),
      this.userRepo.find({ where: { org_id: orgId }, order: { created_at: 'ASC' } }),
    ]);
    return {
      technicians: technicians.map((t) => ({
        id: t.id, nombre: t.nombre, email: t.email,
        role: t.role, estado_activo: t.estado_activo, created_at: t.created_at,
      })),
      users: users.map((u) => ({
        id: u.id, nombre: u.nombre, email: u.email,
        role: 'user', estado_activo: u.estado_activo, created_at: u.created_at,
      })),
    };
  }

  async toggleMemberStatus(type: 'technician' | 'user', memberId: string, orgId: string) {
    if (type === 'technician') {
      const tech = await this.techRepo.findOneBy({ id: memberId, org_id: orgId });
      if (!tech) throw new NotFoundException('Technician not found');
      await this.techRepo.update(memberId, { estado_activo: !tech.estado_activo });
      return { estado_activo: !tech.estado_activo };
    } else {
      const user = await this.userRepo.findOneBy({ id: memberId, org_id: orgId });
      if (!user) throw new NotFoundException('User not found');
      await this.userRepo.update(memberId, { estado_activo: !user.estado_activo });
      return { estado_activo: !user.estado_activo };
    }
  }

  async deleteMember(memberId: string, orgId: string) {
    const user = await this.userRepo.findOneBy({ id: memberId, org_id: orgId });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.delete(memberId);
  }

  async getLogs() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [recentTickets, recentUsers, recentOrgs, stuckTickets] = await Promise.all([
      this.ticketRepo.find({ order: { created_at: 'DESC' }, take: 20 }),
      this.userRepo.find({ order: { created_at: 'DESC' }, take: 10 }),
      this.orgRepo.find({ order: { created_at: 'DESC' }, take: 5 }),
      this.ticketRepo
        .createQueryBuilder('t')
        .where('t.estado = :s', { s: TicketStatus.PENDIENTE_IA })
        .andWhere('t.created_at < :d', { d: fiveMinAgo })
        .orderBy('t.created_at', 'DESC')
        .take(10)
        .getMany(),
    ]);

    const logs: { type: string; message: string; timestamp: string; meta?: object }[] = [];

    for (const t of recentTickets) {
      logs.push({ type: 'ticket_created', message: `Ticket creado: "${t.asunto}"`, timestamp: t.created_at.toISOString(), meta: { id: t.id, org_id: t.org_id } });
    }
    for (const u of recentUsers) {
      logs.push({ type: 'user_registered', message: `Usuario registrado: ${u.email}`, timestamp: u.created_at.toISOString(), meta: { id: u.id, org_id: u.org_id } });
    }
    for (const o of recentOrgs) {
      logs.push({ type: 'org_created', message: `Organización creada: ${o.nombre}`, timestamp: o.created_at.toISOString(), meta: { id: o.id } });
    }
    for (const t of stuckTickets) {
      logs.push({ type: 'ai_error', message: `Ticket atascado en PENDIENTE_IA: "${t.asunto}"`, timestamp: t.created_at.toISOString(), meta: { id: t.id, org_id: t.org_id } });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
  }

  private async attachOrgStats(org: Organization) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total_tickets, tickets_abiertos, tickets_resueltos, total_tecnicos, total_usuarios, tickets_este_mes] =
      await Promise.all([
        this.ticketRepo.countBy({ org_id: org.id }),
        this.ticketRepo.createQueryBuilder('t').where('t.org_id = :id AND t.estado != :s', { id: org.id, s: TicketStatus.RESUELTO }).getCount(),
        this.ticketRepo.countBy({ org_id: org.id, estado: TicketStatus.RESUELTO }),
        this.techRepo.countBy({ org_id: org.id }),
        this.userRepo.countBy({ org_id: org.id }),
        this.ticketRepo.createQueryBuilder('t').where('t.org_id = :id AND t.created_at >= :d', { id: org.id, d: startOfMonth }).getCount(),
      ]);

    const avgResult = await this.ticketRepo
      .createQueryBuilder('t')
      .select('AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600)', 'avg_hours')
      .where('t.org_id = :id AND t.estado = :s', { id: org.id, s: TicketStatus.RESUELTO })
      .getRawOne<{ avg_hours: string }>();

    return {
      ...org,
      stats: {
        total_tickets,
        tickets_abiertos,
        tickets_resueltos,
        avg_resolution_hours: avgResult?.avg_hours ? parseFloat(avgResult.avg_hours).toFixed(1) : null,
        total_tecnicos,
        total_usuarios,
        tickets_este_mes,
      },
    };
  }
}
