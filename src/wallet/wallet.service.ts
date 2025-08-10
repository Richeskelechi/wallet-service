import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransferDto } from './dto/transfer.dto';
import { RedisCacheService } from '../cache/cache.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet) private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly cache: RedisCacheService
  ) { }

  async createWallet(dto: CreateWalletDto) {
    const existing = await this.walletRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('Wallet with this email already exists');
    }

    return this.dataSource.transaction(async (manager) => {
      const wallet = manager.create(Wallet, {
        fullname: dto.fullname,
        email: dto.email,
        balance: dto.balance ?? 0,
      });

      await manager.save(wallet);

      // If balance is provided and > 0, create initial transaction
      if (dto.balance && dto.balance > 0) {
        const txn = manager.create(Transaction, {
          id: uuidv4(),
          walletId: wallet.id,
          type: 'deposit',
          amount: dto.balance,
          status: 'completed',
        });
        await manager.save(txn);
      }

      await this.cache.set(`wallet:${wallet.id}`, { balance: wallet.balance });

      return wallet;
    });
  }

  async getBalance(walletId: string): Promise<{ walletId: string; balance: number }> {
    // Try to get from cache first
    const cached = await this.cache.get<{ balance: number }>(`wallet:${walletId}`);
    if (cached) {
      return { walletId, balance: cached.balance };
    }
  
    // If not in cache, fetch from DB
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
  
    // Update cache with fresh balance
    await this.cache.set(`wallet:${walletId}`, { balance: wallet.balance });
  
    return { walletId, balance: wallet.balance };
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

  async transfer(dto: TransferDto) {
    const { senderId, receiverId, amount } = dto;

    if (senderId === receiverId) {
      throw new BadRequestException('Cannot transfer to the same wallet');
    }

    return this.dataSource.transaction(async (manager) => {
      // Lock sender and receiver wallets for update
      const sender = await manager.findOne(Wallet, {
        where: { id: senderId },
        lock: { mode: 'pessimistic_write' },
      });
      const receiver = await manager.findOne(Wallet, {
        where: { id: receiverId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!sender) throw new NotFoundException('Sender wallet not found');
      if (!receiver) throw new NotFoundException('Receiver wallet not found');

      // Convert balances to numbers before arithmetic
      const senderBalanceNum = Number(sender.balance);
      const receiverBalanceNum = Number(receiver.balance);

      if (senderBalanceNum < amount) throw new BadRequestException('Insufficient funds');

      // Update balances using numbers
      sender.balance = senderBalanceNum - amount;
      receiver.balance = receiverBalanceNum + amount;

      await manager.save(sender);
      await manager.save(receiver);

      // Create debit transaction for sender
      const senderTxn = manager.create(Transaction, {
        id: uuidv4(),
        walletId: sender.id,
        type: 'transfer',
        amount,
        status: 'completed',
        metadata: { direction: 'debit', to: receiver.id },
      });
      await manager.save(senderTxn);

      // Create credit transaction for receiver
      const receiverTxn = manager.create(Transaction, {
        id: uuidv4(),
        walletId: receiver.id,
        type: 'transfer',
        amount,
        status: 'completed',
        metadata: { direction: 'credit', from: sender.id },
      });
      await manager.save(receiverTxn);

      // Update cache
      await this.cache.set(`wallet:${sender.id}`, { balance: sender.balance });
      await this.cache.set(`wallet:${receiver.id}`, { balance: receiver.balance });

      return {
        message: 'Transfer successful',
        senderBalance: sender.balance,
        receiverBalance: receiver.balance,
      };
    });
  }
}
