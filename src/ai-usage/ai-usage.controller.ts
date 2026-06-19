import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AiUsageService } from './ai-usage.service';
import { CreateAiUsageDto } from './dto/create-ai-usage.dto';
import { InternalSecretGuard } from '../common/guards/internal-secret.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SuperAdminGuard } from '../super-admin/guards/super-admin.guard';

@ApiTags('AI Usage')
@Controller()
export class AiUsageController {
  constructor(private readonly service: AiUsageService) {}

  @ApiOperation({ summary: 'Record AI token usage (internal)' })
  @ApiSecurity('internal-secret')
  @UseGuards(InternalSecretGuard)
  @Post('internal/ai-usage')
  record(@Body() dto: CreateAiUsageDto) {
    return this.service.record(dto);
  }

  @ApiOperation({ summary: 'Get AI usage for current org (admin)' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/ai-usage')
  getByOrg(@Request() req: { user: { org_id: string } }) {
    return this.service.getByOrg(req.user.org_id);
  }

  @ApiOperation({ summary: 'Get global AI usage (superadmin)' })
  @ApiSecurity('internal-secret')
  @UseGuards(SuperAdminGuard)
  @Get('super-admin/ai-usage')
  getGlobal() {
    return this.service.getGlobal();
  }
}
