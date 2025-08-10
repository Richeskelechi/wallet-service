import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'Healthy Wallet Service' })
  message: string;

  @ApiProperty({ example: null, nullable: true })
  data: any;
}
