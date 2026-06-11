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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimilarTicketDto {
  @ApiProperty()
  @IsString()
  ticket_id: string;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @IsNumber()
  similarity_score: number;

  @ApiProperty()
  @IsString()
  resolution_summary: string;
}

export class AiDecisionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ticket_id: string;

  @ApiProperty({ example: 'acceso' })
  @IsString()
  category: string;

  @ApiProperty({ minimum: 1, maximum: 10, example: 7 })
  @IsInt()
  @Min(1)
  @Max(10)
  priority: number;

  @ApiProperty({ minimum: 1, maximum: 10, example: 4 })
  @IsInt()
  @Min(1)
  @Max(10)
  complexity_score: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  suggested_level: number;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  assigned_tecnico_id: string | null;

  @ApiProperty()
  @IsString()
  reasoning: string;

  @ApiProperty({ type: [SimilarTicketDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimilarTicketDto)
  similar_tickets: SimilarTicketDto[];
}
