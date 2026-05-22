import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  // Public endpoint — clients submit tickets
  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.service.findAll();
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
}
