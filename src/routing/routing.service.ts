import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Level } from '../levels/entities/level.entity';
import { Technician } from '../technicians/entities/technician.entity';

@Injectable()
export class RoutingService {
  constructor(
    @InjectRepository(Level)
    private readonly levelRepo: Repository<Level>,
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
  ) {}

  async getRoutingContext() {
    const [niveles, tecnicos] = await Promise.all([
      this.levelRepo.find({ order: { numero_nivel: 'ASC' } }),
      this.techRepo.find({
        where: { estado_activo: true },
        relations: { nivel: true, skills: true },
        order: { carga_actual: 'ASC' },
      }),
    ]);

    return {
      generated_at: new Date().toISOString(),
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
