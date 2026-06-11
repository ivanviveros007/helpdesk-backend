import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Invitations (admin)')
@ApiBearerAuth('access-token')
@Controller('admin/invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @ApiOperation({ summary: 'Send an invitation to a user email' })
  @Post()
  create(@Body() dto: CreateInvitationDto, @Request() req: any) {
    return this.service.create(dto, req.user.org_id);
  }

  @ApiOperation({ summary: 'List all pending invitations for the org' })
  @Get()
  findAll(@Request() req: any) {
    return this.service.findByOrg(req.user.org_id);
  }

  @ApiOperation({ summary: 'Resend an invitation email' })
  @Post(':id/resend')
  resend(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.resend(id, req.user.org_id);
  }

  @ApiOperation({ summary: 'Delete / revoke an invitation' })
  @Delete(':id')
  @HttpCode(204)
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.service.delete(id, req.user.org_id);
  }
}
