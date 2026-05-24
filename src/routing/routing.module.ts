import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Level } from '../levels/entities/level.entity';
import { Technician } from '../technicians/entities/technician.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Level, Technician, Organization])],
  providers: [RoutingService],
  controllers: [RoutingController],
})
export class RoutingModule {}
