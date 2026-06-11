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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Tickets')
@ApiBearerAuth('access-token')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @ApiOperation({ summary: 'Create a ticket (user)' })
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTicketDto, @Request() req) {
    return this.service.create(dto, req.user);
  }

  @ApiOperation({ summary: "List the authenticated user's tickets" })
  @Get('my-tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  findMyTickets(@Request() req) {
    return this.service.findByUser(req.user.id, req.user.org_id);
  }

  @ApiOperation({ summary: 'Get ticket metrics for the org (admin)' })
  @Get('admin/metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getMetrics(@Request() req) {
    return this.service.getMetrics(req.user.org_id);
  }

  @ApiOperation({ summary: 'List all tickets with optional filters (admin)' })
  @ApiQuery({ name: 'tecnico_id', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'nivel', required: false })
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

  @ApiOperation({ summary: 'List all tickets in the org' })
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.service.findAll(req.user.org_id);
  }

  @ApiOperation({ summary: 'Get a ticket by ID' })
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @ApiOperation({ summary: 'Get tickets assigned to a technician' })
  @Get('technician/:techId')
  @UseGuards(JwtAuthGuard)
  findByTechnician(@Param('techId', ParseUUIDPipe) techId: string) {
    return this.service.findByTechnician(techId);
  }

  @ApiOperation({ summary: 'Update ticket status (technician/admin)' })
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

  @ApiOperation({ summary: 'User acknowledges they completed the requested action' })
  @Patch(':id/user-response')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  userResponded(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.userResponded(id, req.user.id);
  }

  @ApiOperation({ summary: 'Mark a ticket as resolved' })
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard)
  markResolved(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.markResolved(id);
  }

  @ApiOperation({ summary: 'Cancel a ticket (user)' })
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  cancelTicket(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.cancelTicket(id, req.user.id);
  }

  @ApiOperation({ summary: 'Delete a ticket (user)' })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(204)
  deleteTicket(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.deleteTicket(id, req.user.id);
  }

  @ApiOperation({ summary: 'Get a ticket with its full comment thread' })
  @Get(':id/with-comments')
  @UseGuards(JwtAuthGuard)
  findOneWithComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneWithComments(id);
  }

  @ApiOperation({ summary: 'Customer context for the agent side panel (history, profile)' })
  @Get(':id/customer-context')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('technician', 'admin')
  getCustomerContext(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.getCustomerContext(id, req.user.org_id);
  }

  @ApiOperation({ summary: 'Add a comment with optional file attachments' })
  @ApiConsumes('multipart/form-data')
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 5, {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('body') body: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    return this.service.addComment(
      id,
      { body },
      { id: req.user.id, nombre: req.user.nombre, role: req.user.role },
      files ?? [],
    );
  }

  @ApiOperation({ summary: 'Add file attachments to a ticket' })
  @ApiConsumes('multipart/form-data')
  @Post(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  addAttachments(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.service.addAttachments(id, files);
  }
}
