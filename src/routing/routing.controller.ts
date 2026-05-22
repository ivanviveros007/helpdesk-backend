import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

@Controller('internal')
export class RoutingController {
  constructor(private readonly service: RoutingService) {}

  @Get('routing-context')
  @UseGuards(InternalSecretGuard)
  getRoutingContext() {
    return this.service.getRoutingContext();
  }
}
