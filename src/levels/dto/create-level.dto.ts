import {
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLevelDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  numero_nivel: number;

  @ApiProperty({ example: 'Soporte N1' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ example: 'Atiende consultas generales y problemas básicos de acceso.' })
  @IsString()
  @MinLength(10)
  descripcion_responsabilidades: string;

  @ApiProperty({ example: ['acceso', 'contraseñas'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ example: 4, minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  max_complexity_score: number;
}
