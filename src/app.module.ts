import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { LevelsModule } from './levels/levels.module';
import { TechniciansModule } from './technicians/technicians.module';
import { RoutingModule } from './routing/routing.module';
import { AiClientModule } from './ai-client/ai-client.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { InvitationsModule } from './invitations/invitations.module';
import { EmailModule } from './email/email.module';
import { CategoriesModule } from './categories/categories.module';
import { PublicModule } from './public/public.module';

// Entities
import { Ticket } from './tickets/entities/ticket.entity';
import { TicketAttachment } from './tickets/entities/ticket-attachment.entity';
import { TicketComment } from './tickets/entities/ticket-comment.entity';
import { Level } from './levels/entities/level.entity';
import { Technician } from './technicians/entities/technician.entity';
import { Skill } from './technicians/entities/skill.entity';
import { Organization } from './organizations/entities/organization.entity';
import { User } from './users/entities/user.entity';
import { SuperAdmin } from './super-admin/entities/super-admin.entity';
import { Invitation } from './invitations/entities/invitation.entity';
import { ComplaintCategory } from './categories/entities/complaint-category.entity';
import { CustomerNote } from './public/entities/customer-note.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [Ticket, TicketAttachment, TicketComment, Level, Technician, Skill, Organization, User, SuperAdmin, Invitation, ComplaintCategory, CustomerNote],
        synchronize: config.get<string>('nodeEnv') !== 'production',
        logging: config.get<string>('nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    TicketsModule,
    LevelsModule,
    TechniciansModule,
    RoutingModule,
    AiClientModule,
    OrganizationsModule,
    UsersModule,
    SuperAdminModule,
    InvitationsModule,
    EmailModule,
    CategoriesModule,
    PublicModule,
  ],
})
export class AppModule {}
