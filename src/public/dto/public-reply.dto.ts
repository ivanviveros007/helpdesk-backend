import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PublicReplyDto {
  @ApiProperty({ example: 'Adjunto la foto que me pidieron' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
