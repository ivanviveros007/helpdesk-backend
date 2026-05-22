import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Level } from '../../levels/entities/level.entity';
import { Skill } from './skill.entity';

export enum TechnicianRole {
  TECHNICIAN = 'technician',
  ADMIN = 'admin',
}

@Entity('tecnicos')
export class Technician {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({
    type: 'enum',
    enum: TechnicianRole,
    default: TechnicianRole.TECHNICIAN,
  })
  role: TechnicianRole;

  @ManyToOne(() => Level, { eager: true, nullable: true })
  @JoinColumn({ name: 'nivel_id' })
  nivel: Level;

  @Column({ default: true })
  estado_activo: boolean;

  @Column({ default: 0 })
  carga_actual: number;

  @ManyToMany(() => Skill, { eager: true, cascade: true })
  @JoinTable({
    name: 'tecnico_skills',
    joinColumn: { name: 'tecnico_id' },
    inverseJoinColumn: { name: 'skill_id' },
  })
  skills: Skill[];

  @CreateDateColumn()
  created_at: Date;
}
