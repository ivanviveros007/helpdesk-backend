import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SimilarTicketDto {
  @IsString()
  ticket_id: string;

  @IsNumber()
  similarity_score: number;

  @IsString()
  resolution_summary: string;
}

export class AiDecisionDto {
  @IsUUID()
  ticket_id: string;

  @IsString()
  category: string;

  @IsInt()
  @Min(1)
  @Max(10)
  priority: number;

  @IsInt()
  @Min(1)
  @Max(10)
  complexity_score: number;

  @IsInt()
  suggested_level: number;

  @IsUUID()
  @IsOptional()
  assigned_tecnico_id: string | null;

  @IsString()
  reasoning: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimilarTicketDto)
  similar_tickets: SimilarTicketDto[];
}
