import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_usage_logs')
export class AiUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  org_id: string;

  @Column({ type: 'uuid', nullable: true })
  ticket_id: string;

  @Column()
  model: string;

  @Column({ type: 'int', default: 0 })
  input_tokens: number;

  @Column({ type: 'int', default: 0 })
  output_tokens: number;

  @CreateDateColumn()
  created_at: Date;
}
