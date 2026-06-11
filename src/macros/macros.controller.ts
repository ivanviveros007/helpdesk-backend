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
import { MacrosService } from './macros.service';
import { CreateMacroDto, UpdateMacroDto } from './dto/macro.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Macros (quick replies)')
@ApiBearerAuth('access-token')
@Controller('macros')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('technician', 'admin')
export class MacrosController {
  constructor(private readonly service: MacrosService) {}

  @ApiOperation({ summary: 'List macros visible to the requesting agent' })
  @Get()
  findAll(@Request() req: any) {
    return this.service.findAllForAgent(req.user.org_id, req.user.nombre);
  }

  @ApiOperation({ summary: 'Create a macro' })
  @Post()
  create(@Body() dto: CreateMacroDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id, req.user.nombre);
  }

  @ApiOperation({ summary: 'Update a macro' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMacroDto,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req.user.org_id);
  }

  @ApiOperation({ summary: 'Delete a macro' })
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.remove(id, req.user.org_id);
  }
}
