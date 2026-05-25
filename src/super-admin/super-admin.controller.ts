import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { CreateOrgDto } from './dto/create-org.dto';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Post('auth/login')
  login(@Body() dto: LoginSuperAdminDto) {
    return this.service.login(dto);
  }

  @Get('organizations')
  @UseGuards(SuperAdminGuard)
  getOrganizations() {
    return this.service.getOrganizations();
  }

  @Post('organizations')
  @UseGuards(SuperAdminGuard)
  createOrg(@Body() dto: CreateOrgDto) {
    return this.service.createOrg(dto);
  }

  @Get('organizations/:id')
  @UseGuards(SuperAdminGuard)
  getOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOrganization(id);
  }

  @Patch('organizations/:id')
  @UseGuards(SuperAdminGuard)
  updateOrg(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre?: string; plan?: string; estado_activo?: boolean },
  ) {
    return this.service.updateOrg(id, body);
  }

  @Patch('organizations/:id/ai-config')
  @UseGuards(SuperAdminGuard)
  updateAiConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { company_type?: string; ai_custom_instructions?: string },
  ) {
    return this.service.updateAiConfig(id, body);
  }

  @Post('organizations/:id/admin')
  @UseGuards(SuperAdminGuard)
  createOrgAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre: string; email: string; password: string },
  ) {
    return this.service.createOrgAdmin(id, body);
  }

  @Get('organizations/:id/members')
  @UseGuards(SuperAdminGuard)
  getOrgMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOrgMembers(id);
  }

  @Patch('organizations/:id/members/:type/:memberId/toggle-status')
  @UseGuards(SuperAdminGuard)
  toggleMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('type') type: 'technician' | 'user',
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.toggleMemberStatus(type, memberId, id);
  }

  @Delete('organizations/:id/members/users/:memberId')
  @UseGuards(SuperAdminGuard)
  @HttpCode(204)
  deleteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.deleteMember(memberId, id);
  }

  @Patch('organizations/:id/members/technicians/:memberId')
  @UseGuards(SuperAdminGuard)
  updateTechnician(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() body: { nombre?: string; email?: string; password?: string },
  ) {
    return this.service.updateTechnician(id, memberId, body);
  }

  @Get('metrics')
  @UseGuards(SuperAdminGuard)
  getMetrics() {
    return this.service.getGlobalMetrics();
  }

  @Get('logs')
  @UseGuards(SuperAdminGuard)
  getLogs() {
    return this.service.getLogs();
  }
}
