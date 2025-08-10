import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  fullname: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;
}