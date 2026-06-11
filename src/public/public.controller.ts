import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { CreatePublicComplaintDto } from './dto/create-public-complaint.dto';
import { PublicReplyDto } from './dto/public-reply.dto';

@ApiTags('Public portal (no auth)')
@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @ApiOperation({ summary: 'Portal branding + active categories for an org' })
  @Get(':orgSlug/portal')
  getPortalInfo(@Param('orgSlug') orgSlug: string) {
    return this.service.getPortalInfo(orgSlug);
  }

  @ApiOperation({ summary: 'Create a complaint as an end customer (no account)' })
  @Post(':orgSlug/complaints')
  createComplaint(
    @Param('orgSlug') orgSlug: string,
    @Body() dto: CreatePublicComplaintDto,
  ) {
    return this.service.createComplaint(orgSlug, dto);
  }

  @ApiOperation({ summary: 'Track a complaint by token (no account)' })
  @Get('complaints/track')
  track(@Query('token') token: string) {
    return this.service.trackComplaint(token);
  }

  @ApiOperation({ summary: 'Reply to a complaint via tracking token' })
  @Post('complaints/track/:token/reply')
  reply(@Param('token') token: string, @Body() dto: PublicReplyDto) {
    return this.service.reply(token, dto.body);
  }

  @ApiOperation({ summary: 'Submit CSAT score (1-5) via tracking token' })
  @Post('csat')
  submitCsat(
    @Query('token') token: string,
    @Body() dto: { score: number; comment?: string },
  ) {
    return this.service.submitCsat(token, Number(dto.score), dto.comment);
  }
}
