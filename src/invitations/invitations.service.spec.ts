import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InvitationsService } from './invitations.service';
import { Invitation } from './entities/invitation.entity';
import { Organization } from '../organizations/entities/organization.entity';

const mockOrg = { id: 'org-uuid', nombre: 'Empresa Demo', slug: 'demo' };

const makeInvitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  id: 'inv-uuid',
  token: 'valid-token',
  email: 'user@test.com',
  org_id: 'org-uuid',
  role: 'user',
  used: false,
  expires_at: new Date(Date.now() + 86400_000),
  created_at: new Date(),
  ...overrides,
});

describe('InvitationsService', () => {
  let service: InvitationsService;
  let invRepo: jest.Mocked<Repository<Invitation>>;
  let orgRepo: jest.Mocked<Repository<Organization>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getRepositoryToken(Invitation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: { findOneBy: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(InvitationsService);
    invRepo = module.get(getRepositoryToken(Invitation));
    orgRepo = module.get(getRepositoryToken(Organization));
  });

  describe('create', () => {
    it('creates an invitation with 7-day expiry', async () => {
      orgRepo.findOneBy.mockResolvedValue(mockOrg as Organization);
      const inv = makeInvitation();
      invRepo.create.mockReturnValue(inv);
      invRepo.save.mockResolvedValue(inv);

      const result = await service.create({ email: 'user@test.com' }, 'org-uuid');

      expect(orgRepo.findOneBy).toHaveBeenCalledWith({ id: 'org-uuid' });
      expect(invRepo.save).toHaveBeenCalled();
      expect(result.email).toBe('user@test.com');
    });

    it('throws NotFoundException when org does not exist', async () => {
      orgRepo.findOneBy.mockResolvedValue(null);
      await expect(service.create({ email: 'x@x.com' }, 'bad-org')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validate', () => {
    it('returns org info for a valid token', async () => {
      invRepo.findOneBy.mockResolvedValue(makeInvitation());
      orgRepo.findOneBy.mockResolvedValue(mockOrg as Organization);

      const result = await service.validate('valid-token');

      expect(result.org_nombre).toBe('Empresa Demo');
      expect(result.org_id).toBe('org-uuid');
      expect(result.email).toBe('user@test.com');
    });

    it('throws NotFoundException for unknown token', async () => {
      invRepo.findOneBy.mockResolvedValue(null);
      await expect(service.validate('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when invitation is already used', async () => {
      invRepo.findOneBy.mockResolvedValue(makeInvitation({ used: true }));
      await expect(service.validate('valid-token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when invitation is expired', async () => {
      invRepo.findOneBy.mockResolvedValue(
        makeInvitation({ expires_at: new Date(Date.now() - 1000) }),
      );
      await expect(service.validate('valid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markUsed', () => {
    it('calls update with used: true', async () => {
      invRepo.update.mockResolvedValue({ affected: 1 } as any);
      await service.markUsed('valid-token');
      expect(invRepo.update).toHaveBeenCalledWith({ token: 'valid-token' }, { used: true });
    });
  });

  describe('findByOrg', () => {
    it('returns invitations filtered by org_id', async () => {
      const inv = makeInvitation();
      invRepo.find.mockResolvedValue([inv]);

      const result = await service.findByOrg('org-uuid');

      expect(invRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { org_id: 'org-uuid' } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
