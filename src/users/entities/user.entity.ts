import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ nullable: true })
  org_id: string;

  @Column({ default: true })
  estado_activo: boolean;

  @CreateDateColumn()
  created_at: Date;
}
