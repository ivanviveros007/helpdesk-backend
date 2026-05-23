import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Level } from './entities/level.entity';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';

@Injectable()
export class LevelsService {
  constructor(
    @InjectRepository(Level)
    private readonly repo: Repository<Level>,
  ) {}

  findAll(org_id?: string): Promise<Level[]> {
    return this.repo.find({
      where: org_id ? { org_id } : {},
      order: { numero_nivel: 'ASC' },
    });
  }

  async findOne(id: number, org_id?: string): Promise<Level> {
    const level = await this.repo.findOneBy(org_id ? { id, org_id } : { id });
    if (!level) throw new NotFoundException(`Level ${id} not found`);
    return level;
  }

  create(dto: CreateLevelDto, org_id?: string): Promise<Level> {
    const level = this.repo.create({ ...dto, org_id });
    return this.repo.save(level);
  }

  async update(id: number, dto: UpdateLevelDto, org_id?: string): Promise<Level> {
    const level = await this.findOne(id, org_id);
    Object.assign(level, dto);
    return this.repo.save(level);
  }

  async remove(id: number, org_id?: string): Promise<void> {
    const level = await this.findOne(id, org_id);
    await this.repo.remove(level);
  }
}
