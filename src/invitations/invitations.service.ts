import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Invitation } from './entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly repo: Repository<Invitation>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async create(dto: CreateInvitationDto, org_id: string): Promise<Invitation> {
    const org = await this.orgRepo.findOneBy({ id: org_id });
    if (!org) throw new NotFoundException('Organization not found');

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);

    const invitation = this.repo.create({
      token: randomUUID(),
      email: dto.email,
      org_id,
      role: 'user',
      used: false,
      expires_at,
    });

    return this.repo.save(invitation);
  }

  async validate(token: string): Promise<{ email: string; org_nombre: string; org_id: string }> {
    const invitation = await this.repo.findOneBy({ token });

    if (!invitation) throw new NotFoundException('Invitación no encontrada');
    if (invitation.used) throw new BadRequestException('Esta invitación ya fue utilizada');
    if (new Date() > invitation.expires_at) throw new BadRequestException('La invitación ha expirado');

    const org = await this.orgRepo.findOneBy({ id: invitation.org_id });
    if (!org) throw new NotFoundException('Organization not found');

    return { email: invitation.email, org_nombre: org.nombre, org_id: invitation.org_id };
  }

  async markUsed(token: string): Promise<void> {
    await this.repo.update({ token }, { used: true });
  }

  findByOrg(org_id: string): Promise<Invitation[]> {
    return this.repo.find({
      where: { org_id },
      order: { created_at: 'DESC' },
    });
  }
}
