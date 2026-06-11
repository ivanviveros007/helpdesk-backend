import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export interface MacroAction {
  type: 'set_status' | 'set_category';
  value: string;
}

@Entity('macros')
export class Macro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  org_id: string;

  @Column()
  name: string;

  // Texto con variables: {{customer_name}}, {{ticket_id}}, {{order_reference}},
  // {{org_name}}, {{agent_name}}, {{tracking_url}}, {{category_name}}
  @Column('text')
  body: string;

  @Column('jsonb', { default: [] })
  actions: MacroAction[];

  @Column({ default: true })
  is_shared: boolean;

  @Column({ nullable: true })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}
