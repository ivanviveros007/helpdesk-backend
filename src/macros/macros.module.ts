import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Macro } from './entities/macro.entity';
import { MacrosService } from './macros.service';
import { MacrosController } from './macros.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Macro])],
  providers: [MacrosService],
  controllers: [MacrosController],
  exports: [MacrosService],
})
export class MacrosModule {}
