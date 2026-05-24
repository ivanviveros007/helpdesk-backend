import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Level } from '../levels/entities/level.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class RoutingService {
  constructor(
    @InjectRepository(Level)
    private readonly levelRepo: Repository<Level>,
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async getRoutingContext(orgId?: string) {
    const levelWhere = orgId ? { org_id: orgId } : {};
    const techWhere = orgId ? { org_id: orgId, estado_activo: true } : { estado_activo: true };

    const [niveles, tecnicos, org] = await Promise.all([
      this.levelRepo.find({ where: levelWhere, order: { numero_nivel: 'ASC' } }),
      this.techRepo.find({
        where: techWhere,
        relations: { nivel: true, skills: true },
        order: { carga_actual: 'ASC' },
      }),
      orgId ? this.orgRepo.findOneBy({ id: orgId }) : Promise.resolve(null),
    ]);

    return {
      generated_at: new Date().toISOString(),
      org_context: {
        company_type: org?.company_type ?? null,
        ai_custom_instructions: org?.ai_custom_instructions ?? null,
      },
      niveles: niveles.map((l) => ({
        id: l.id,
        numero_nivel: l.numero_nivel,
        nombre: l.nombre,
        descripcion_responsabilidades: l.descripcion_responsabilidades,
        tags: l.tags,
        max_complexity_score: l.max_complexity_score,
      })),
      tecnicos: tecnicos.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        nivel_id: t.nivel?.id ?? null,
        numero_nivel: t.nivel?.numero_nivel ?? null,
        estado_activo: t.estado_activo,
        carga_actual: t.carga_actual,
        skills: t.skills.map((s) => s.nombre_tecnologia),
      })),
    };
  }
}
