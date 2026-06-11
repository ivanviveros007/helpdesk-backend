import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MacroActionDto {
  @ApiProperty({ enum: ['set_status', 'set_category'] })
  @IsIn(['set_status', 'set_category'])
  type: 'set_status' | 'set_category';

  @ApiProperty({ example: 'ESPERANDO_USUARIO' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateMacroDto {
  @ApiProperty({ example: 'Pedir foto del producto' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example:
      'Hola {{customer_name}}, para avanzar con tu reclamo {{ticket_id}} necesitamos una foto del producto. ¡Gracias!',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ type: [MacroActionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MacroActionDto)
  actions?: MacroActionDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_shared?: boolean;
}

export class UpdateMacroDto extends PartialType(CreateMacroDto) {}
