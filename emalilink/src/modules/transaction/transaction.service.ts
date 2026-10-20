import { TransactionRepository } from './transaction.repository';
import { RegistryService } from '../registry/registry.service';
import { adapterRegistry } from '../../adapters/adapter.registry';
import { normalizePhone } from '../../utils/phoneValidator';
import { generateId } from '../../utils/crypto';
import { TRANSACTION_STATUS } from '../../utils/constants';
import { logger } from '../../config/logger';
import { CreateTransactionRequest, TransactionResponse } from './transaction.types';

export class TransactionService {
  private repository: TransactionRepository;
  private registry: RegistryService;

  constructor() {
    this.repository = new TransactionRepository();
    this.registry = new RegistryService();
  }

  async createTransaction(
    request: CreateTransactionRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    const transactionId = generateId('EM');
    const currency = request.currency || 'ZAR';

    // 1. Validate and normalize recipient phone
    const normalizedPhone = normalizePhone(request.recipient_phone);
    if (!normalizedPhone) {
      throw new Error('Invalid recipient phone number');
    }

    // 2. Verify recipient wallet exists in registry
    const recipientWalletId = await this.registry.findWallet(
      normalizedPhone,
      request.recipient_provider
    );
    if (!recipientWalletId) {
      throw new Error(
        `Recipient ${normalizedPhone} is not registered with ${request.recipient_provider}`
      );
    }

    // 3. Get sender and recipient adapters
    const senderAdapter = adapterRegistry.get(request.sender_provider);
    const recipientAdapter = adapterRegistry.get(request.recipient_provider);

    if (!senderAdapter) {
      throw new Error(`Unknown sender provider: ${request.sender_provider}`);
    }
    if (!recipientAdapter) {
      throw new Error(`Unknown recipient provider: ${request.recipient_provider}`);
    }

    // 4. Log transaction as pending
    await this.repository.create({
      transaction_id: transactionId,
      sender_provider: request.sender_provider,
      sender_wallet_id: request.sender_wallet_id,
      recipient_phone: normalizedPhone,
      recipient_provider: request.recipient_provider,
      recipient_wallet_id: recipientWalletId,
      amount: request.amount,
      currency,
      idempotency_key: idempotencyKey,
      status: TRANSACTION_STATUS.PENDING,
    });

    try {
      // 5. Debit sender
      await this.repository.updateStatus(transactionId, TRANSACTION_STATUS.ROUTING);

      const debitResult = await senderAdapter.debitWallet(
        request.sender_wallet_id,
        request.amount,
        currency
      );

      if (!debitResult.success) {
        await this.repository.updateStatus(
          transactionId,
          TRANSACTION_STATUS.FAILED,
          debitResult.error
        );
        throw new Error(`Sender debit failed: ${debitResult.error}`);
      }

      // Record debit ledger entry
      await this.repository.createLedgerEntry({
        transaction_id: transactionId,
        provider_code: request.sender_provider,
        wallet_id: request.sender_wallet_id,
        direction: 'debit',
        amount: request.amount,
        currency,
      });

      // 6. Credit recipient
      const creditResult = await recipientAdapter.creditWallet(
        normalizedPhone,
        request.amount,
        currency,
        transactionId
      );

      if (!creditResult.success) {
        // TODO: Compensate — refund sender
        await this.repository.updateStatus(
          transactionId,
          TRANSACTION_STATUS.FAILED,
          creditResult.error
        );
        throw new Error(`Recipient credit failed: ${creditResult.error}`);
      }

      // Record credit ledger entry
      await this.repository.createLedgerEntry({
        transaction_id: transactionId,
        provider_code: request.recipient_provider,
        wallet_id: recipientWalletId,
        direction: 'credit',
        amount: request.amount,
        currency,
      });

      // 7. Mark transaction as completed
      await this.repository.updateStatus(transactionId, TRANSACTION_STATUS.COMPLETED);

      logger.info(`Transaction ${transactionId} completed successfully`);

      return {
        transaction_id: transactionId,
        sender: {
          provider: request.sender_provider,
          wallet_id: request.sender_wallet_id,
        },
        recipient: {
          provider: request.recipient_provider,
          phone: normalizedPhone,
          wallet_id: recipientWalletId,
        },
        amount: request.amount,
        currency,
        status: TRANSACTION_STATUS.COMPLETED,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`Transaction ${transactionId} failed:`, error);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<any> {
    const tx = await this.repository.findById(transactionId);
    if (!tx) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    return tx;
  }
}

