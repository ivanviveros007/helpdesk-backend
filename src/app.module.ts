import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { LevelsModule } from './levels/levels.module';
import { TechniciansModule } from './technicians/technicians.module';
import { RoutingModule } from './routing/routing.module';
import { AiClientModule } from './ai-client/ai-client.module';

// Entities
import { Ticket } from './tickets/entities/ticket.entity';
import { Level } from './levels/entities/level.entity';
import { Technician } from './technicians/entities/technician.entity';
import { Skill } from './technicians/entities/skill.entity';

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
        entities: [Ticket, Level, Technician, Skill],
        synchronize: config.get<string>('nodeEnv') !== 'production',
        logging: config.get<string>('nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    TicketsModule,
    LevelsModule,
    TechniciansModule,
    RoutingModule,
    AiClientModule,
  ],
})
export class AppModule {}
