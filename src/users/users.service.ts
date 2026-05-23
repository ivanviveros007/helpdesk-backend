import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, org_id?: string): Promise<User> {
    const existing = await this.repo.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('Email already in use');

    const password_hash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({ nombre: dto.nombre, email: dto.email, password_hash, org_id });
    return this.repo.save(user);
  }

  findAll(org_id?: string): Promise<User[]> {
    return this.repo.find({
      where: org_id ? { org_id } : {},
      order: { nombre: 'ASC' },
      select: { id: true, nombre: true, email: true, role: true, estado_activo: true, created_at: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }
}
