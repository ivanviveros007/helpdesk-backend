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
import { TechniciansService } from './technicians.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/technicians')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class TechniciansController {
  constructor(private readonly service: TechniciansService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.org_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.org_id);
  }

  @Post()
  create(@Body() dto: CreateTechnicianDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTechnicianDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.org_id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.remove(id, req.user.org_id);
  }
}
