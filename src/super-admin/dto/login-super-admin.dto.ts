import { IsEmail, IsString } from 'class-validator';

export class LoginSuperAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
