import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallet, wallet => wallet.transactions, { onDelete: 'CASCADE' })
  wallet: Wallet;

  @Column({ type: 'enum', enum: ['deposit', 'withdraw', 'transfer'] })
  type: 'deposit' | 'withdraw' | 'transfer';

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed'], default: 'completed' })
  status: 'pending' | 'completed' | 'failed';

  @CreateDateColumn()
  createdAt: Date;
}
