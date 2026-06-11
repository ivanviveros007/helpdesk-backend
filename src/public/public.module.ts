import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerNote } from './entities/customer-note.entity';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { InboundEmailController } from './inbound-email.controller';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CategoriesModule } from '../categories/categories.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerNote]),
    OrganizationsModule,
    CategoriesModule,
    TicketsModule,
  ],
  providers: [PublicService],
  controllers: [PublicController, InboundEmailController],
  exports: [TypeOrmModule],
})
export class PublicModule {}
