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

  // Portal público de reclamos — el cliente final crea/sigue reclamos sin cuenta
  @Column({ default: true })
  portal_enabled: boolean;

  @Column({ nullable: true })
  portal_logo_url: string;

  @Column({ default: '#2F6FED' })
  portal_primary_color: string;

  @Column({ nullable: true })
  portal_welcome_message: string;

  @Column({ default: 'Número de pedido' })
  portal_order_label: string;

  @CreateDateColumn()
  created_at: Date;
}
