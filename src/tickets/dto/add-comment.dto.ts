import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCommentDto {
  @ApiProperty({ example: 'Ya reinicié el servicio, sigue sin funcionar.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
