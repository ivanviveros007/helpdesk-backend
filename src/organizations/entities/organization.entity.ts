import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 'trial' })
  plan: string;

  @Column({ default: true })
  estado_activo: boolean;

  @Column({ nullable: true })
  company_type: string; // 'tech_saas' | 'ecommerce' | 'healthcare' | 'retail' | 'it_services' | 'other'

  @Column('text', { nullable: true })
  ai_custom_instructions: string;

  @CreateDateColumn()
  created_at: Date;
}
