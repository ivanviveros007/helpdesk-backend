import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperAdmin } from './entities/super-admin.entity';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { Organization } from '../organizations/entities/organization.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { User } from '../users/entities/user.entity';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuperAdmin, Organization, Technician, Ticket, User]),
    CategoriesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<number>('jwt.expiration', 604800) },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SuperAdminService],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
