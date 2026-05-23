import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('niveles')
export class Level {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  numero_nivel: number;

  @Column()
  nombre: string;

  @Column('text')
  descripcion_responsabilidades: string;

  @Column('simple-array')
  tags: string[];

  @Column()
  max_complexity_score: number;

  @Column({ nullable: true })
  org_id: string;

  @CreateDateColumn()
  created_at: Date;
}
