import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Technician } from './entities/technician.entity';
import { Skill } from './entities/skill.entity';
import { TechniciansService } from './technicians.service';
import { TechniciansController } from './technicians.controller';
import { LevelsModule } from '../levels/levels.module';
import { Level } from '../levels/entities/level.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Technician, Skill, Level]),
    LevelsModule,
  ],
  providers: [TechniciansService],
  controllers: [TechniciansController],
  exports: [TechniciansService],
})
export class TechniciansModule {}
