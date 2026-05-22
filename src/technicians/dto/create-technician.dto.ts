import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateTechnicianDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsInt()
  @IsOptional()
  nivel_id?: number;

  @IsBoolean()
  @IsOptional()
  estado_activo?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];
}
