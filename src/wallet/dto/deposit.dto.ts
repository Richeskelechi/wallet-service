import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(1)
  amount: number;
}
