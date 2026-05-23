import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TechniciansService } from './technicians.service';
import { Technician } from './entities/technician.entity';
import { Skill } from './entities/skill.entity';
import { Level } from '../levels/entities/level.entity';

const ORG_A = 'org-a-uuid';
const ORG_B = 'org-b-uuid';

const makeTech = (overrides: Partial<Technician> = {}): Technician =>
  ({
    id: 'tech-uuid',
    nombre: 'Carlos',
    email: 'carlos@test.com',
    password_hash: 'hashed',
    org_id: ORG_A,
    estado_activo: true,
    carga_actual: 0,
    skills: [],
    nivel: null,
    ...overrides,
  } as unknown as Technician);

describe('TechniciansService — multi-tenancy', () => {
  let service: TechniciansService;
  let techRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechniciansService,
        {
          provide: getRepositoryToken(Technician),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
          },
        },
        { provide: getRepositoryToken(Skill), useValue: { findOneBy: jest.fn(), save: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(Level), useValue: { findOneBy: jest.fn() } },
      ],
    }).compile();

    service = module.get(TechniciansService);
    techRepo = module.get(getRepositoryToken(Technician));
  });

  describe('findAll', () => {
    it('filters by org_id when provided', async () => {
      techRepo.find.mockResolvedValue([makeTech()]);
      await service.findAll(ORG_A);
      expect(techRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { org_id: ORG_A } }),
      );
    });

    it('returns all technicians when no org_id', async () => {
      techRepo.find.mockResolvedValue([makeTech(), makeTech({ org_id: ORG_B })]);
      await service.findAll();
      expect(techRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findOne', () => {
    it('includes org_id in query when provided', async () => {
      techRepo.findOneBy.mockResolvedValue(makeTech());
      await service.findOne('tech-uuid', ORG_A);
      expect(techRepo.findOneBy).toHaveBeenCalledWith({ id: 'tech-uuid', org_id: ORG_A });
    });

    it('throws NotFoundException when technician not in org', async () => {
      techRepo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('tech-uuid', ORG_B)).rejects.toThrow(NotFoundException);
    });
  });
});
