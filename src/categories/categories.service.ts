import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplaintCategory } from './entities/complaint-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DEFAULT_CATEGORIES } from './default-categories';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(ComplaintCategory)
    private readonly repo: Repository<ComplaintCategory>,
  ) {}

  findAll(orgId: string, onlyActive = false): Promise<ComplaintCategory[]> {
    return this.repo.find({
      where: { org_id: orgId, ...(onlyActive ? { is_active: true } : {}) },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, orgId: string): Promise<ComplaintCategory> {
    const category = await this.repo.findOneBy({ id, org_id: orgId });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }

  async create(dto: CreateCategoryDto, orgId: string): Promise<ComplaintCategory> {
    const existing = await this.repo.findOneBy({ org_id: orgId, slug: dto.slug });
    if (existing) {
      throw new ConflictException(`Ya existe una categoría con el slug "${dto.slug}"`);
    }
    const category = this.repo.create({ ...dto, org_id: orgId });
    return this.repo.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto, orgId: string): Promise<ComplaintCategory> {
    const category = await this.findOne(id, orgId);
    Object.assign(category, dto);
    return this.repo.save(category);
  }

  async remove(id: string, orgId: string): Promise<void> {
    const category = await this.findOne(id, orgId);
    // Soft delete: los tickets históricos siguen apuntando a la categoría
    category.is_active = false;
    await this.repo.save(category);
  }

  /** Crea las 6 categorías default para una organización nueva. Idempotente. */
  async seedDefaults(orgId: string): Promise<void> {
    const count = await this.repo.countBy({ org_id: orgId });
    if (count > 0) return;
    const categories = DEFAULT_CATEGORIES.map((c) =>
      this.repo.create({ ...c, org_id: orgId }),
    );
    await this.repo.save(categories);
  }
}
