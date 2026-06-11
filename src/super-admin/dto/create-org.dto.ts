import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrgDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'pro', description: 'Subscription plan' })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiPropertyOptional({ example: 'tech_saas', enum: ['tech_saas', 'ecommerce', 'healthcare', 'retail', 'it_services', 'other'] })
  @IsString()
  @IsOptional()
  company_type?: string;

  @ApiPropertyOptional({ example: 'Escalate any production outage to priority 10.' })
  @IsString()
  @IsOptional()
  ai_custom_instructions?: string;

  @ApiProperty({ example: 'Admin Acme' })
  @IsString()
  admin_nombre: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  admin_email: string;

  @ApiProperty({ example: 'supersecret' })
  @IsString()
  @MinLength(8)
  admin_password: string;
}
