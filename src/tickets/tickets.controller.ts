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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
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

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'admin')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @Request() req,
  ) {
    return this.service.updateStatus(id, dto, req.user.id);
  }

  @Patch(':id/user-response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  userResponded(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.userResponded(id, req.user.id);
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

  @Post(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
  }))
  addAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.addAttachments(id, files);
  }
}
