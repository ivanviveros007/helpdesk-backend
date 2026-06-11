import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginSuperAdminDto {
  @ApiProperty({ example: 'superadmin@helpdesk.io' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecret' })
  @IsString()
  password: string;
}
