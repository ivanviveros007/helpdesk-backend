import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IncidentsService } from './incidents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

class CreateIncidentDto {
  @ApiProperty({ example: 'Demora en envíos — proveedor Andreani' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

class LinkTicketsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ticket_ids: string[];
}

class BroadcastDto {
  @ApiProperty({ example: 'El proveedor normalizó las entregas. Tu pedido llega en 48hs.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}

@ApiTags('Incidents (admin)')
@ApiBearerAuth('access-token')
@Controller('incidents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @ApiOperation({ summary: 'List incidents with affected counts' })
  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.org_id);
  }

  @ApiOperation({ summary: 'Detect complaint patterns (5+ same category in 24h)' })
  @Get('detect')
  detect(@Request() req: any) {
    return this.service.detectPattern(req.user.org_id);
  }

  @ApiOperation({ summary: 'Get an incident with its linked complaints' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.org_id);
  }

  @ApiOperation({ summary: 'Create an incident' })
  @Post()
  create(@Body() dto: CreateIncidentDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id, req.user.nombre);
  }

  @ApiOperation({ summary: 'Link complaints to an incident' })
  @Post(':id/link-tickets')
  link(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkTicketsDto,
    @Request() req: any,
  ) {
    return this.service.linkTickets(id, dto.ticket_ids, req.user.org_id);
  }

  @ApiOperation({ summary: 'Unlink a complaint from an incident' })
  @Delete(':id/tickets/:ticketId')
  unlink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Request() req: any,
  ) {
    return this.service.unlinkTicket(id, ticketId, req.user.org_id);
  }

  @ApiOperation({ summary: 'Broadcast an update to all affected customers' })
  @Post(':id/broadcast')
  broadcast(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BroadcastDto,
    @Request() req: any,
  ) {
    return this.service.broadcast(id, dto.message, req.user.org_id, req.user.nombre);
  }

  @ApiOperation({ summary: 'Resolve the incident and all linked complaints' })
  @Post(':id/resolve')
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BroadcastDto,
    @Request() req: any,
  ) {
    return this.service.resolve(id, dto.message, req.user.org_id, req.user.nombre);
  }
}
