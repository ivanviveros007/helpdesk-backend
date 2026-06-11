import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ example: 'nuevousuario@acme.com' })
  @IsEmail()
  email: string;
}
