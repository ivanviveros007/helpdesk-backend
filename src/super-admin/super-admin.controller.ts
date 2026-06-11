import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { CreateOrgDto } from './dto/create-org.dto';

@ApiTags('Super Admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @ApiOperation({ summary: 'Super admin login' })
  @Post('auth/login')
  login(@Body() dto: LoginSuperAdminDto) {
    return this.service.login(dto);
  }

  @ApiOperation({ summary: 'List all organizations' })
  @ApiSecurity('internal-secret')
  @Get('organizations')
  @UseGuards(SuperAdminGuard)
  getOrganizations() {
    return this.service.getOrganizations();
  }

  @ApiOperation({ summary: 'Create an organization with its initial admin' })
  @ApiSecurity('internal-secret')
  @Post('organizations')
  @UseGuards(SuperAdminGuard)
  createOrg(@Body() dto: CreateOrgDto) {
    return this.service.createOrg(dto);
  }

  @ApiOperation({ summary: 'Get an organization by ID' })
  @ApiSecurity('internal-secret')
  @Get('organizations/:id')
  @UseGuards(SuperAdminGuard)
  getOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOrganization(id);
  }

  @ApiOperation({ summary: 'Update organization name / plan / status' })
  @ApiSecurity('internal-secret')
  @Patch('organizations/:id')
  @UseGuards(SuperAdminGuard)
  updateOrg(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre?: string; plan?: string; estado_activo?: boolean },
  ) {
    return this.service.updateOrg(id, body);
  }

  @ApiOperation({ summary: 'Update AI routing config for an organization' })
  @ApiSecurity('internal-secret')
  @Patch('organizations/:id/ai-config')
  @UseGuards(SuperAdminGuard)
  updateAiConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { company_type?: string; ai_custom_instructions?: string },
  ) {
    return this.service.updateAiConfig(id, body);
  }

  @ApiOperation({ summary: 'Create the initial admin user for an org' })
  @ApiSecurity('internal-secret')
  @Post('organizations/:id/admin')
  @UseGuards(SuperAdminGuard)
  createOrgAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre: string; email: string; password: string },
  ) {
    return this.service.createOrgAdmin(id, body);
  }

  @ApiOperation({ summary: 'List all members (users + technicians) of an org' })
  @ApiSecurity('internal-secret')
  @Get('organizations/:id/members')
  @UseGuards(SuperAdminGuard)
  getOrgMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOrgMembers(id);
  }

  @ApiOperation({ summary: 'Toggle active status of a member' })
  @ApiSecurity('internal-secret')
  @Patch('organizations/:id/members/:type/:memberId/toggle-status')
  @UseGuards(SuperAdminGuard)
  toggleMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('type') type: 'technician' | 'user',
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.toggleMemberStatus(type, memberId, id);
  }

  @ApiOperation({ summary: 'Delete a user from an org' })
  @ApiSecurity('internal-secret')
  @Delete('organizations/:id/members/users/:memberId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(204)
  deleteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.deleteMember(memberId, id);
  }

  @ApiOperation({ summary: 'Update a technician within an org' })
  @ApiSecurity('internal-secret')
  @Patch('organizations/:id/members/technicians/:memberId')
  @UseGuards(SuperAdminGuard)
  updateTechnician(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() body: { nombre?: string; email?: string; password?: string },
  ) {
    return this.service.updateTechnician(id, memberId, body);
  }

  @ApiOperation({ summary: 'Get global platform metrics' })
  @ApiSecurity('internal-secret')
  @Get('metrics')
  @UseGuards(SuperAdminGuard)
  getMetrics() {
    return this.service.getGlobalMetrics();
  }

  @ApiOperation({ summary: 'Get audit logs' })
  @ApiSecurity('internal-secret')
  @Get('logs')
  @UseGuards(SuperAdminGuard)
  getLogs() {
    return this.service.getLogs();
  }
}
