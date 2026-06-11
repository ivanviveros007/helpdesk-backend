import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTechnicianDto {
  @ApiProperty({ example: 'Carlos López' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ example: 'carlos@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'supersecret' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 1, description: 'Support level ID' })
  @IsInt()
  @IsOptional()
  nivel_id?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  estado_activo?: boolean;

  @ApiPropertyOptional({ example: ['windows', 'networking'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}
