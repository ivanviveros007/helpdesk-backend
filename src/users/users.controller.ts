import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Users (admin)')
@ApiBearerAuth('access-token')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @ApiOperation({ summary: 'Create a user in the org' })
  @Post()
  create(@Body() dto: CreateUserDto, @Request() req) {
    return this.service.create(dto, req.user.org_id);
  }

  @ApiOperation({ summary: 'List all users in the org' })
  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.org_id);
  }
}
