import {
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLevelDto {
  @IsInt()
  @Min(1)
  numero_nivel: number;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsString()
  @MinLength(10)
  descripcion_responsabilidades: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsInt()
  @Min(1)
  @Max(10)
  max_complexity_score: number;
}
