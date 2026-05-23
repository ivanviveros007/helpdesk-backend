import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post()
  create(@Body() dto: CreateInvitationDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.service.findByOrg(req.user.org_id);
  }
}
