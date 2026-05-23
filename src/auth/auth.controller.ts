import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.service.register(dto);
  }

  @Get('invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.service.validateInvite(token);
  }
}
