import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { RedisCacheService } from '../cache/cache.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly cache: RedisCacheService
  ) {}

  async createWallet(dto: CreateWalletDto) {
    const existing = await this.walletRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Wallet with this email already exists');
    }
  
    const wallet = this.walletRepo.create({
      fullname: dto.fullname,
      email: dto.email,
      balance: dto.balance ?? 0,
    });
  
    await this.walletRepo.save(wallet);
    await this.cache.set(`wallet:${wallet.id}`, { balance: wallet.balance });
  
    return wallet;
  }  

  async deposit(walletId: string, dto: DepositDto) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      wallet.balance += dto.amount;
      await manager.save(wallet);

      const txn = this.txnRepo.create({
        id: uuidv4(),
        walletId,
        type: 'deposit',
        amount: dto.amount,
        status: 'completed',
      });
      await manager.save(txn);

      await this.cache.set(`wallet:${wallet.id}`, { balance: wallet.balance });
      return wallet;
    });
  }

  async withdraw(walletId: string, dto: WithdrawDto) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');
      if (wallet.balance < dto.amount) throw new BadRequestException('Insufficient funds');

      wallet.balance -= dto.amount;
      await manager.save(wallet);

      const txn = this.txnRepo.create({
        id: uuidv4(),
        walletId,
        type: 'withdraw',
        amount: dto.amount,
        status: 'completed',
      });
      await manager.save(txn);

      await this.cache.set(`wallet:${wallet.id}`, { balance: wallet.balance });
      return wallet;
    });
  }
}
