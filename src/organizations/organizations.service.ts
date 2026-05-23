import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly repo: Repository<Organization>,
  ) {}

  findBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findOneBy({ slug });
  }

  findById(id: string): Promise<Organization | null> {
    return this.repo.findOneBy({ id });
  }
}
