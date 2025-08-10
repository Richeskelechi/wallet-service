import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { sendSuccess } from '../utils/helpers/response.helpers';

@ApiTags('wallets')
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  async createWallet(@Body() dto: CreateWalletDto) {
    const data = await this.walletService.createWallet(dto);
    return sendSuccess(data, 'Wallet created successfully');
  }

  @Post(':id/deposit')
  @ApiOperation({ summary: 'Deposit funds into a wallet' })
  async deposit(@Param('id') id: string, @Body() dto: DepositDto) {
    const data = await this.walletService.deposit(id, dto);
    return sendSuccess(data, 'Deposit successful');
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw funds from a wallet' })
  async withdraw(@Param('id') id: string, @Body() dto: WithdrawDto) {
    const data = await this.walletService.withdraw(id, dto);
    return sendSuccess(data, 'Withdrawal successful');
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds between wallets' })
  async transfer(@Body() dto: TransferDto) {
    const data = await this.walletService.transfer(dto);
    return sendSuccess(data, 'Transfer successful');
  }
}
