import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgIntegration } from './entities/org-integration.entity';
import { IntegrationsService } from './integrations.service';
import { WhatsappService } from './whatsapp.service';
import { IntegrationsController } from './integrations.controller';
import { WhatsappInboundController } from './whatsapp-inbound.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrgIntegration]),
    forwardRef(() => TicketsModule),
    OrganizationsModule,
    CategoriesModule,
  ],
  providers: [IntegrationsService, WhatsappService],
  controllers: [IntegrationsController, WhatsappInboundController],
  exports: [IntegrationsService, WhatsappService],
})
export class IntegrationsModule {}
