import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTicketDto, @Request() req) {
    return this.service.create(dto, req.user);
  }

  // User sees only their own tickets
  @Get('my-tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  findMyTickets(@Request() req) {
    return this.service.findByUser(req.user.id, req.user.org_id);
  }

  @Get('admin/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getMetrics(@Request() req) {
    return this.service.getMetrics(req.user.org_id);
  }

  // Admin: all tickets with optional filters
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllAdmin(
    @Request() req,
    @Query('tecnico_id') tecnico_id?: string,
    @Query('estado') estado?: string,
    @Query('nivel') nivel?: string,
  ) {
    return this.service.findAllForAdmin(req.user.org_id, { tecnico_id, estado, nivel });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.service.findAll(req.user.org_id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get('technician/:techId')
  @UseGuards(JwtAuthGuard)
  findByTechnician(@Param('techId', ParseUUIDPipe) techId: string) {
    return this.service.findByTechnician(techId);
  }

  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard)
  markResolved(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.markResolved(id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  cancelTicket(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.cancelTicket(id, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(204)
  deleteTicket(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.deleteTicket(id, req.user.id);
  }
}
