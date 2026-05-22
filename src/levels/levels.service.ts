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

  findAll(): Promise<Level[]> {
    return this.repo.find({ order: { numero_nivel: 'ASC' } });
  }

  async findOne(id: number): Promise<Level> {
    const level = await this.repo.findOneBy({ id });
    if (!level) throw new NotFoundException(`Level ${id} not found`);
    return level;
  }

  create(dto: CreateLevelDto): Promise<Level> {
    const level = this.repo.create(dto);
    return this.repo.save(level);
  }

  async update(id: number, dto: UpdateLevelDto): Promise<Level> {
    const level = await this.findOne(id);
    Object.assign(level, dto);
    return this.repo.save(level);
  }

  async remove(id: number): Promise<void> {
    const level = await this.findOne(id);
    await this.repo.remove(level);
  }
}
