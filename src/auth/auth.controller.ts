import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({ summary: 'Login (user, technician, admin)' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @ApiOperation({ summary: 'Self-register a new user (requires invite token)' })
  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.service.register(dto);
  }

  @ApiOperation({ summary: 'Validate an invitation token' })
  @Get('invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.service.validateInvite(token);
  }
}
