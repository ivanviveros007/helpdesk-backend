import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type IntegrationProvider = 'slack' | 'teams' | 'whatsapp';

// config por provider:
// slack:    { webhook_url }
// teams:    { webhook_url }
// whatsapp: { phone_number }  ← número de WhatsApp Business de la org (formato E.164)
@Entity('org_integrations')
@Index(['org_id', 'provider'], { unique: true })
export class OrgIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  org_id: string;

  @Column()
  provider: IntegrationProvider;

  @Column('jsonb', { default: {} })
  config: Record<string, string>;

  @Column({ default: true })
  is_active: boolean;

  @Column('text', { array: true, default: '{complaint.created,complaint.resolved}' })
  events: string[];

  @CreateDateColumn()
  created_at: Date;
}
