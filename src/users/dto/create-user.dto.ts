import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'juan@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecret' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Invitation token from email link' })
  @IsString()
  @IsOptional()
  invite_token?: string;
}
