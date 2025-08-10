import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: 200 })
  @IsNumber()
  @Min(1)
  amount: number;
}
