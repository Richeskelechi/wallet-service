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
import { PaginationDto } from './dto/pagination.dto';
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
    const cacheKey = `wallet:${walletId}`;
    const lockKey = `lock:${cacheKey}`;
    const lockTtlSeconds = 10; // e.g., 10 seconds lock TTL
  
    // Try to get from cache first
    const cached = await this.cache.get<{ balance: number }>(cacheKey);
    if (cached) {
      return { walletId, balance: cached.balance };
    }
  
    // Try to acquire lock to prevent stampede
    const lockAcquired = await this.cache.acquireLock(lockKey, lockTtlSeconds);
  
    if (lockAcquired) {
      try {
        // Only this process fetches from DB & updates cache
        const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }
  
        // Update cache with fresh balance
        await this.cache.set(cacheKey, { balance: wallet.balance });
  
        return { walletId, balance: wallet.balance };
      } finally {
        // Release lock (optional, TTL will expire anyway)
        await this.cache.releaseLock(lockKey);
      }
    } else {
      // Someone else is loading cache, wait and retry
  
      // Simple retry logic - wait 100ms, then try get from cache again
      await new Promise(resolve => setTimeout(resolve, 100));
  
      const cachedRetry = await this.cache.get<{ balance: number }>(cacheKey);
      if (cachedRetry) {
        return { walletId, balance: cachedRetry.balance };
      }
  
      // As fallback, fetch directly from DB (to avoid endless waiting)
      const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      // Update cache
      await this.cache.set(cacheKey, { balance: wallet.balance });
      return { walletId, balance: wallet.balance };
    }
  }  

  async deposit(walletId: string, dto: DepositDto) {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');

      const walletBalance = Number(wallet.balance);

      wallet.balance = walletBalance + dto.amount;
      await manager.save(wallet);

      const txn = this.txnRepo.create({
        id: uuidv4(),
        walletId,
        type: 'deposit',
        amount: dto.amount,
        status: 'completed',
      });
      await manager.save(txn);

      // Invalidate wallet caches
      await this.invalidateWalletCaches(walletId)
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

      // Invalidate wallet caches
      await this.invalidateWalletCaches(walletId)
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

      // Invalidate wallet caches
      await this.invalidateWalletCaches(sender.id)
      await this.invalidateWalletCaches(receiver.id)

      return {
        message: 'Transfer successful',
        senderBalance: sender.balance,
        receiverBalance: receiver.balance,
      };
    });
  }

  async getTransactions(walletId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10, type } = pagination;
    const cacheKey = `transactions:${walletId}:page:${page}:limit:${limit}:type:${type || 'all'}`;

    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = { walletId };
    if (type) where.type = type;

    const [transactions, total] = await this.txnRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = {
      transaction: transactions.map(txn => ({
        id: txn.id,
        amount: txn.amount,
        timestamp: txn.createdAt,
        status: txn.status,
        type: txn.type,
        metadata: txn.metadata,
      })),
      pagination: {
        totalItems: total,
        itemCount: transactions.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };

    // Set cache TTL from env or default 300 seconds
    const CACHE_TTL = Number(process.env.REDIS_CACHE_TTL) || 3600;
    await this.cache.set(cacheKey, result, CACHE_TTL);

    return result;
  }

  async invalidateTransactionCache(walletId: string) {
    await this.cache.delByPattern(`transactions:${walletId}:*`);
  }

  async invalidateWalletCaches(walletId: string) {
    await this.invalidateTransactionCache(walletId);
    await this.cache.del(`wallet:${walletId}`);
  }
  
}
