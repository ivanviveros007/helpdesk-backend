import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { RoutingService } from './routing.service';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';

@ApiTags('Internal')
@ApiSecurity('internal-secret')
@Controller('internal')
export class RoutingController {
  constructor(private readonly service: RoutingService) {}

  @ApiOperation({ summary: 'Get routing context (levels + technicians) filtered by org — called by AI service' })
  @ApiQuery({ name: 'org_id', required: false })
  @Get('routing-context')
  @UseGuards(InternalSecretGuard)
  getRoutingContext(@Query('org_id') orgId?: string) {
    return this.service.getRoutingContext(orgId);
  }
}
