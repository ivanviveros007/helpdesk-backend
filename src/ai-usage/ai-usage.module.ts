import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { AiUsageService } from './ai-usage.service';
import { AiUsageController } from './ai-usage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiUsageLog])],
  controllers: [AiUsageController],
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
