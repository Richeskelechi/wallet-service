import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  createWallet(@Body() dto: CreateWalletDto) {
    return this.walletService.createWallet(dto);
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Deposit funds into a wallet' })
  deposit(@Param('id') id: string, @Body() dto: DepositDto) {
    return this.walletService.deposit(id, dto);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw funds from a wallet' })
  withdraw(@Param('id') id: string, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(id, dto);
  }
}
