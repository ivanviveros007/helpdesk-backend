import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Problema de entrega' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'delivery', description: 'Identificador único dentro de la org (kebab-case)' })
  @IsString()
  @Matches(/^[a-z0-9_-]+$/)
  slug: string;

  @ApiPropertyOptional({ example: 'No llegó, llegó tarde o a una dirección incorrecta' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Truck', description: 'Nombre de ícono Lucide' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#2F6FED' })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 2, description: '1=alta, 2=media, 3=baja' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  default_priority?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sla_first_response_hours?: number;

  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sla_resolution_hours?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sort_order?: number;
}
