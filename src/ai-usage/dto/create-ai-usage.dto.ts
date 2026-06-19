import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAiUsageDto {
  @IsUUID()
  org_id: string;

  @IsUUID()
  @IsOptional()
  ticket_id?: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(0)
  input_tokens: number;

  @IsInt()
  @Min(0)
  output_tokens: number;
}
