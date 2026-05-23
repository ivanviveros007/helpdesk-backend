import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LevelsService } from './levels.service';
import { CreateLevelDto } from './dto/create-level.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/levels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LevelsController {
  constructor(private readonly service: LevelsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.org_id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.org_id);
  }

  @Post()
  create(@Body() dto: CreateLevelDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLevelDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.org_id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.org_id);
  }
}
