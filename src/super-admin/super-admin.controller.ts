import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Post('organizations/:id/admin')
  @UseGuards(SuperAdminGuard)
  createOrgAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { nombre: string; email: string; password: string },
  ) {
    return this.service.createOrgAdmin(id, body);
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
