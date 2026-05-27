import { IsString, MinLength, MaxLength } from 'class-validator';

export class AddCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
