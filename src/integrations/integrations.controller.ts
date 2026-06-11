import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional } from 'class-validator';
import { IntegrationsService } from './integrations.service';
import type { IntegrationProvider } from './entities/org-integration.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class UpsertIntegrationDto {
  @ApiProperty({ enum: ['slack', 'teams', 'whatsapp'] })
  @IsIn(['slack', 'teams', 'whatsapp'])
  provider: IntegrationProvider;

  @ApiProperty({ example: { webhook_url: 'https://hooks.slack.com/services/...' } })
  @IsObject()
  config: Record<string, string>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  events?: string[];
}

class SetActiveDto {
  @ApiProperty()
  @IsBoolean()
  is_active: boolean;
}

@ApiTags('Integrations (admin)')
@ApiBearerAuth('access-token')
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @ApiOperation({ summary: 'List org integrations' })
  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.org_id);
  }

  @ApiOperation({ summary: 'Create or update an integration' })
  @Post()
  upsert(@Body() dto: UpsertIntegrationDto, @Request() req: any) {
    return this.service.upsert(req.user.org_id, dto.provider, dto.config, dto.events);
  }

  @ApiOperation({ summary: 'Activate/deactivate an integration' })
  @Patch(':id')
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
    @Request() req: any,
  ) {
    return this.service.setActive(id, req.user.org_id, dto.is_active);
  }

  @ApiOperation({ summary: 'Delete an integration' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.remove(id, req.user.org_id);
  }
}
