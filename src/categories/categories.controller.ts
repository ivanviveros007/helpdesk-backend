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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Complaint categories (admin)')
@ApiBearerAuth('access-token')
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @ApiOperation({ summary: 'List complaint categories in the org' })
  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.org_id);
  }

  @ApiOperation({ summary: 'Create a complaint category' })
  @Post()
  create(@Body() dto: CreateCategoryDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id);
  }

  @ApiOperation({ summary: 'Update a complaint category' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.org_id);
  }

  @ApiOperation({ summary: 'Deactivate a complaint category (soft delete)' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.remove(id, req.user.org_id);
  }
}
