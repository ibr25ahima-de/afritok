/**
 * Paystack Payment Router
 * tRPC endpoints for Paystack payment processing
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import PaystackClient from './paystack-connector';
import { ENV } from './_core/env';

// Initialize Paystack client
const paystack = new PaystackClient({
  secretKey: ENV.paystackSecretKey || '',
  publicKey: ENV.paystackPublicKey || '',
  webhookSecret: ENV.paystackWebhookSecret || '',
});

export const paystackRouter = router({
  /**
   * Initialize a payment
   * User clicks "Pay" → Gets payment URL
   */
  initializePayment: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive('Amount must be positive'),
        email: z.string().email('Invalid email'),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await paystack.initializePayment({
          email: input.email,
          amount: Math.round(input.amount * 100), // Convert to cents
          metadata: {
            userId: ctx.user.id,
            username: ctx.user.name,
            ...input.metadata,
          },
        });

        return {
          success: true,
          authorizationUrl: response.data.authorization_url,
          accessCode: response.data.access_code,
          reference: response.data.reference,
        };
      } catch (error) {
        console.error('[tRPC] Initialize payment failed:', error);
        throw new Error('Failed to initialize payment');
      }
    }),

  /**
   * Verify a payment
   * After user completes payment on Paystack
   */
  verifyPayment: protectedProcedure
    .input(
      z.object({
        reference: z.string().min(1, 'Reference is required'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await paystack.verifyPayment(input.reference);

        if (response.data.status === 'success') {
          // Payment successful
          // TODO: Update user's wallet/balance in database
          console.log(`[Paystack] Payment verified for user ${ctx.user.id}`);

          return {
            success: true,
            status: 'success',
            amount: response.data.amount / 100, // Convert from cents
            reference: response.data.reference,
            message: 'Payment successful!',
          };
        } else {
          return {
            success: false,
            status: response.data.status,
            message: 'Payment not completed',
          };
        }
      } catch (error) {
        console.error('[tRPC] Verify payment failed:', error);
        throw new Error('Failed to verify payment');
      }
    }),

  /**
   * Create a transfer recipient
   * Before transferring money to user, create recipient
   */
  createTransferRecipient: protectedProcedure
    .input(
      z.object({
        type: z.enum(['nuban', 'mobile_money', 'ghipss']),
        name: z.string().min(1, 'Name is required'),
        accountNumber: z.string().optional(),
        bankCode: z.string().optional(),
        mobileMoneyNumber: z.string().optional(),
        mobileMoneyProvider: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const response = await paystack.createTransferRecipient({
          type: input.type,
          name: input.name,
          account_number: input.accountNumber,
          bank_code: input.bankCode,
          mobile_money_number: input.mobileMoneyNumber,
          mobile_money_provider: input.mobileMoneyProvider,
        });

        // TODO: Save recipient_code to user's profile
        console.log(`[Paystack] Recipient created for user ${ctx.user.id}`);

        return {
          success: true,
          recipientCode: response.data.recipient_code,
          message: 'Recipient created successfully',
        };
      } catch (error) {
        console.error('[tRPC] Create transfer recipient failed:', error);
        throw new Error('Failed to create transfer recipient');
      }
    }),

  /**
   * Initiate a transfer (withdrawal)
   * Send money to user's Mobile Money or bank account
   */
  initiateTransfer: protectedProcedure
    .input(
      z.object({
        recipientCode: z.string().min(1, 'Recipient code is required'),
        amount: z.number().positive('Amount must be positive'),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check user has enough balance
        // TODO: Verify user balance before transfer

        const response = await paystack.initiateTransfer({
          source: 'balance',
          reason: input.reason || `Withdrawal for user ${ctx.user.id}`,
          amount: Math.round(input.amount * 100), // Convert to cents
          recipient: input.recipientCode,
        });

        if (response.status) {
          // TODO: Update user's wallet, create transaction record
          console.log(`[Paystack] Transfer initiated for user ${ctx.user.id}`);

          return {
            success: true,
            transferCode: response.data.transfer_code,
            reference: response.data.reference,
            amount: response.data.amount / 100,
            status: response.data.status,
            message: 'Transfer initiated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Failed to initiate transfer',
          };
        }
      } catch (error) {
        console.error('[tRPC] Initiate transfer failed:', error);
        throw new Error('Failed to initiate transfer');
      }
    }),

  /**
   * Get transfer status
   */
  getTransferStatus: protectedProcedure
    .input(
      z.object({
        transferCode: z.string().min(1, 'Transfer code is required'),
      })
    )
    .query(async ({ input }) => {
      try {
        const response = await paystack.getTransferStatus(input.transferCode);

        return {
          success: response.status,
          status: response.data?.status,
          amount: response.data?.amount ? response.data.amount / 100 : 0,
          recipient: response.data?.recipient,
        };
      } catch (error) {
        console.error('[tRPC] Get transfer status failed:', error);
        throw new Error('Failed to get transfer status');
      }
    }),

  /**
   * Get payment history
   */
  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Query database for user's payment history
      // For now, return empty array
      return {
        success: true,
        payments: [],
        message: 'Payment history retrieved',
      };
    } catch (error) {
      console.error('[tRPC] Get payment history failed:', error);
      throw new Error('Failed to get payment history');
    }
  }),

  /**
   * Get withdrawal history
   */
  getWithdrawalHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      // TODO: Query database for user's withdrawal history
      // For now, return empty array
      return {
        success: true,
        withdrawals: [],
        message: 'Withdrawal history retrieved',
      };
    } catch (error) {
      console.error('[tRPC] Get withdrawal history failed:', error);
      throw new Error('Failed to get withdrawal history');
    }
  }),

  /**
   * Webhook handler for Paystack events
   * Called by Paystack when payment/transfer events occur
   */
  handleWebhook: publicProcedure
    .input(
      z.object({
        event: z.string(),
        data: z.record(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const event = input.event;
        const data = input.data;

        console.log(`[Paystack Webhook] Event: ${event}`);

        switch (event) {
          case 'charge.success':
            // Payment successful
            console.log(`[Webhook] Payment successful: ${data.reference}`);
            // TODO: Update user's wallet
            break;

          case 'transfer.success':
            // Transfer successful
            console.log(`[Webhook] Transfer successful: ${data.transfer_code}`);
            // TODO: Update user's withdrawal status
            break;

          case 'transfer.failed':
            // Transfer failed
            console.log(`[Webhook] Transfer failed: ${data.transfer_code}`);
            // TODO: Notify user, retry transfer
            break;

          default:
            console.log(`[Webhook] Unknown event: ${event}`);
        }

        return { success: true };
      } catch (error) {
        console.error('[tRPC] Webhook handler failed:', error);
        throw new Error('Failed to handle webhook');
      }
    }),
});

/**
 * SUMMARY: Paystack Payment Router
 *
 * Available Endpoints:
 * - paystack.initializePayment() - Start payment process
 * - paystack.verifyPayment() - Verify payment completion
 * - paystack.createTransferRecipient() - Register withdrawal account
 * - paystack.initiateTransfer() - Send money to user
 * - paystack.getTransferStatus() - Check transfer status
 * - paystack.getPaymentHistory() - Get user's payment history
 * - paystack.getWithdrawalHistory() - Get user's withdrawal history
 * - paystack.handleWebhook() - Process Paystack webhooks
 *
 * Integration with Afritok:
 * 1. User earns money → Wallet balance increases
 * 2. User clicks "Withdraw" → createTransferRecipient() + initiateTransfer()
 * 3. Paystack processes transfer → handleWebhook() receives confirmation
 * 4. User receives money in Mobile Money account
 * 5. User sees notification + transaction history
 */
