/**
 * Paystack Payment Gateway Connector
 * Handles all Paystack API interactions for Afritok
 * 
 * Paystack is the best payment gateway for Africa:
 * - 40+ African countries
 * - Low fees (3.5% + N100 per transaction)
 * - Instant settlements
 * - Mobile Money support
 */

import axios, { AxiosInstance } from 'axios';

export interface PaystackConfig {
  secretKey: string;
  publicKey: string;
  webhookSecret: string;
}

export interface PaystackInitializePaymentParams {
  email: string;
  amount: number; // in cents (e.g., 1000 = $10.00)
  reference?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitializePaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyPaymentResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    paid_at: string;
    status: string;
    customer: {
      id: number;
      email: string;
      customer_code: string;
      first_name: string;
      last_name: string;
      phone: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
    };
  };
}

export interface PaystackCreateTransferRecipientParams {
  type: 'nuban' | 'mobile_money' | 'ghipss'; // Bank account, Mobile Money, Ghana Interbank
  name: string;
  account_number?: string;
  bank_code?: string;
  mobile_money_number?: string;
  mobile_money_provider?: string; // 'MTN', 'VODAFONE', 'AIRTELTIGO'
}

export interface PaystackCreateTransferRecipientResponse {
  status: boolean;
  message: string;
  data: {
    recipient_code: string;
    domain: string;
    type: string;
    name: string;
    description: string;
    metadata: any;
    created_at: string;
  };
}

export interface PaystackInitiateTransferParams {
  source: 'balance' | 'authorization';
  reason: string;
  amount: number; // in cents
  recipient: string; // recipient_code
  reference?: string;
}

export interface PaystackInitiateTransferResponse {
  status: boolean;
  message: string;
  data: {
    transfer_code: string;
    reference: string;
    amount: number;
    recipient: number;
    status: string;
    reason: string;
    source: string;
    source_details: any;
    failures: any;
    titan_code: string;
    transferred_at: string;
    domain: string;
    id: number;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    status: string;
    customer?: {
      id: number;
      email: string;
      customer_code: string;
    };
    transfer_code?: string;
    recipient?: {
      recipient_code: string;
      name: string;
    };
  };
}

/**
 * Paystack API Client
 */
export class PaystackClient {
  private client: AxiosInstance;
  private config: PaystackConfig;

  constructor(config: PaystackConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initialize a payment transaction
   * User clicks "Pay" → Gets payment URL → Completes payment on Paystack
   */
  async initializePayment(
    params: PaystackInitializePaymentParams
  ): Promise<PaystackInitializePaymentResponse> {
    try {
      const response = await this.client.post<PaystackInitializePaymentResponse>(
        '/transaction/initialize',
        {
          email: params.email,
          amount: params.amount,
          reference: params.reference || this.generateReference(),
          metadata: params.metadata || {},
        }
      );

      if (!response.data.status) {
        throw new Error(`Paystack error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      console.error('[Paystack] Initialize payment failed:', error);
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   * After user completes payment, verify it was successful
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyPaymentResponse> {
    try {
      const response = await this.client.get<PaystackVerifyPaymentResponse>(
        `/transaction/verify/${reference}`
      );

      if (!response.data.status) {
        throw new Error(`Paystack error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      console.error('[Paystack] Verify payment failed:', error);
      throw error;
    }
  }

  /**
   * Create a transfer recipient
   * Before transferring money to a user, create a recipient
   */
  async createTransferRecipient(
    params: PaystackCreateTransferRecipientParams
  ): Promise<PaystackCreateTransferRecipientResponse> {
    try {
      const payload: any = {
        type: params.type,
        name: params.name,
      };

      if (params.type === 'nuban') {
        payload.account_number = params.account_number;
        payload.bank_code = params.bank_code;
      } else if (params.type === 'mobile_money') {
        payload.mobile_money_number = params.mobile_money_number;
        payload.mobile_money_provider = params.mobile_money_provider;
      }

      const response = await this.client.post<PaystackCreateTransferRecipientResponse>(
        '/transferrecipient',
        payload
      );

      if (!response.data.status) {
        throw new Error(`Paystack error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      console.error('[Paystack] Create transfer recipient failed:', error);
      throw error;
    }
  }

  /**
   * Initiate a transfer to a recipient
   * Send money to user's Mobile Money or bank account
   */
  async initiateTransfer(
    params: PaystackInitiateTransferParams
  ): Promise<PaystackInitiateTransferResponse> {
    try {
      const response = await this.client.post<PaystackInitiateTransferResponse>(
        '/transfer',
        {
          source: params.source,
          reason: params.reason,
          amount: params.amount,
          recipient: params.recipient,
          reference: params.reference || this.generateReference(),
        }
      );

      if (!response.data.status) {
        throw new Error(`Paystack error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      console.error('[Paystack] Initiate transfer failed:', error);
      throw error;
    }
  }

  /**
   * Get transfer status
   */
  async getTransferStatus(transferCode: string): Promise<any> {
    try {
      const response = await this.client.get(`/transfer/${transferCode}`);
      return response.data;
    } catch (error) {
      console.error('[Paystack] Get transfer status failed:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * Ensure webhook is from Paystack
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.config.webhookSecret)
      .update(body)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Generate unique reference
   */
  private generateReference(): string {
    return `AFRITOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Paystack Payment Flow for Afritok
 *
 * FLOW 1: User Earns Money
 * ========================
 * 1. User creates content → Gets views/likes/comments
 * 2. Earnings accumulate in Afritok wallet
 * 3. User clicks "Withdraw"
 * 4. System initiates Paystack transfer
 * 5. Money goes to user's Mobile Money (MTN, Orange, Airtel, etc.)
 * 6. User receives notification
 *
 * FLOW 2: Creator Receives Payment
 * ================================
 * 1. Creator sells product/service
 * 2. Customer pays via Paystack
 * 3. Paystack verifies payment
 * 4. Money goes to creator's wallet
 * 5. Creator can withdraw to Mobile Money
 *
 * FLOW 3: Commission to Platform Owner
 * ====================================
 * 1. Every transaction has a fee (5-10%)
 * 2. Platform owner receives commission
 * 3. Example: $10 transaction → Owner gets $0.50-$1.00
 * 4. Scales with platform growth
 *
 * Supported Countries (40+):
 * - West Africa: Nigeria, Ghana, Senegal, Côte d'Ivoire, Mali, Burkina Faso, Benin, Togo
 * - East Africa: Kenya, Uganda, Tanzania, Rwanda
 * - Southern Africa: South Africa, Zimbabwe, Botswana
 * - Central Africa: Cameroon, Gabon, Chad
 * - North Africa: Egypt, Morocco, Tunisia
 * - And many more...
 *
 * Mobile Money Providers:
 * - MTN Mobile Money (West & East Africa)
 * - Orange Money (West & Central Africa)
 * - Airtel Money (West & East Africa)
 * - Vodafone Cash (Ghana)
 * - Equity Bank (Kenya)
 * - And many more...
 */

export default PaystackClient;
