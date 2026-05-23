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

  @CreateDateColumn()
  created_at: Date;
}
