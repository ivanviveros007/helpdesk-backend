import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePublicComplaintDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  customer_name: string;

  @ApiProperty({ example: 'juan@gmail.com' })
  @IsEmail()
  customer_email: string;

  @ApiPropertyOptional({ example: '+5491155551234' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customer_phone?: string;

  @ApiPropertyOptional({ example: 'ORD-8821' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  order_reference?: string;

  @ApiProperty({ description: 'ID de la categoría de reclamo' })
  @IsUUID()
  category_id: string;

  @ApiProperty({ example: 'Mi pedido llegó con el producto roto' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;
}
