import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

@Controller('internal')
export class RoutingController {
  constructor(private readonly service: RoutingService) {}

  @Get('routing-context')
  @UseGuards(InternalSecretGuard)
  getRoutingContext(@Query('org_id') orgId?: string) {
    return this.service.getRoutingContext(orgId);
  }
}
