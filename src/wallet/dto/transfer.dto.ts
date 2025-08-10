import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsNumber, Min } from 'class-validator';

export class TransferDto {
  @ApiProperty({ example: 'uuid-of-sender-wallet' })
  @IsNotEmpty()
  @IsUUID()
  senderId: string;

  @ApiProperty({ example: 'uuid-of-receiver-wallet' })
  @IsNotEmpty()
  @IsUUID()
  receiverId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  amount: number;
}
