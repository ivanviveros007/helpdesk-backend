import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  nombre: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  plan?: string;

  @IsString()
  @IsOptional()
  company_type?: string;

  @IsString()
  @IsOptional()
  ai_custom_instructions?: string;

  // Admin inicial de la org
  @IsString()
  admin_nombre: string;

  @IsEmail()
  admin_email: string;

  @IsString()
  @MinLength(8)
  admin_password: string;
}
