import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Technician } from './entities/technician.entity';
import { Skill } from './entities/skill.entity';
import { Level } from '../levels/entities/level.entity';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';

@Injectable()
export class TechniciansService {
  constructor(
    @InjectRepository(Technician)
    private readonly techRepo: Repository<Technician>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(Level)
    private readonly levelRepo: Repository<Level>,
  ) {}

  findAll(): Promise<Technician[]> {
    return this.techRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: string): Promise<Technician> {
    const tech = await this.techRepo.findOneBy({ id });
    if (!tech) throw new NotFoundException(`Technician ${id} not found`);
    return tech;
  }

  async findByEmail(email: string): Promise<Technician | null> {
    return this.techRepo.findOneBy({ email });
  }

  async create(dto: CreateTechnicianDto): Promise<Technician> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const password_hash = await bcrypt.hash(dto.password, 10);

    let nivel: Level | null = null;
    if (dto.nivel_id) {
      nivel = await this.levelRepo.findOneBy({ id: dto.nivel_id });
      if (!nivel) throw new NotFoundException(`Level ${dto.nivel_id} not found`);
    }

    const skills = await this.resolveSkills(dto.skills ?? []);

    const tech = this.techRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      password_hash,
      nivel: nivel ?? undefined,
      estado_activo: dto.estado_activo ?? true,
      skills,
    });

    return this.techRepo.save(tech);
  }

  async update(id: string, dto: UpdateTechnicianDto): Promise<Technician> {
    const tech = await this.findOne(id);

    if (dto.password) {
      tech.password_hash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.nivel_id !== undefined) {
      const nivel = await this.levelRepo.findOneBy({ id: dto.nivel_id });
      if (!nivel) throw new NotFoundException(`Level ${dto.nivel_id} not found`);
      tech.nivel = nivel;
    }
    if (dto.skills !== undefined) {
      tech.skills = await this.resolveSkills(dto.skills);
    }
    if (dto.nombre !== undefined) tech.nombre = dto.nombre;
    if (dto.email !== undefined) tech.email = dto.email;
    if (dto.estado_activo !== undefined) tech.estado_activo = dto.estado_activo;

    return this.techRepo.save(tech);
  }

  async remove(id: string): Promise<void> {
    const tech = await this.findOne(id);
    await this.techRepo.remove(tech);
  }

  async incrementCarga(id: string): Promise<void> {
    await this.techRepo.increment({ id }, 'carga_actual', 1);
  }

  async decrementCarga(id: string): Promise<void> {
    await this.techRepo.decrement({ id }, 'carga_actual', 1);
  }

  private async resolveSkills(skillNames: string[]): Promise<Skill[]> {
    return Promise.all(
      skillNames.map(async (nombre_tecnologia) => {
        let skill = await this.skillRepo.findOneBy({ nombre_tecnologia });
        if (!skill) {
          skill = await this.skillRepo.save(
            this.skillRepo.create({ nombre_tecnologia }),
          );
        }
        return skill;
      }),
    );
  }
}
