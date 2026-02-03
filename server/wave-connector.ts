/**
 * Wave Payment Gateway Connector
 * Handles all Wave API interactions for instant withdrawals
 * 
 * Wave is the best for instant withdrawals in Africa:
 * - 15+ African countries
 * - Lowest fees (1% per transaction)
 * - Instant settlements
 * - Mobile Money support (MTN, Orange, Airtel, etc.)
 * - Works in Senegal, Mali, Côte d'Ivoire, Burkina Faso, Benin, Togo, Niger, Cameroon, etc.
 */

import axios, { AxiosInstance } from 'axios';

export interface WaveConfig {
  apiKey: string;
  apiUrl?: string;
}

export interface WaveSendMoneyParams {
  amount: number; // in cents (e.g., 1000 = $10.00)
  phoneNumber: string; // e.g., "+221771234567"
  country: string; // ISO country code, e.g., "SN", "ML", "CI"
  provider?: string; // 'MTN', 'Orange', 'Airtel', 'Wave', etc.
  description?: string;
  reference?: string;
}

export interface WaveSendMoneyResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  phoneNumber: string;
  country: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

export interface WaveGetTransactionStatusResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  phoneNumber: string;
  country: string;
  failureReason?: string;
}

export interface WaveGetBalanceResponse {
  success: boolean;
  balance: number; // in cents
  currency: string;
  lastUpdated: string;
}

/**
 * Wave API Client
 */
export class WaveClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: WaveConfig) {
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.wave.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send money to a user's Mobile Money account
   * This is the main function for instant withdrawals
   */
  async sendMoney(params: WaveSendMoneyParams): Promise<WaveSendMoneyResponse> {
    try {
      // Validate phone number format
      if (!params.phoneNumber.startsWith('+')) {
        throw new Error('Phone number must start with +');
      }

      const response = await this.client.post<any>('/transfers', {
        amount: params.amount,
        phone_number: params.phoneNumber,
        country: params.country,
        provider: params.provider || 'auto', // Wave auto-detects provider
        description: params.description || 'Afritok Withdrawal',
        reference: params.reference || this.generateReference(),
      });

      if (response.data.success) {
        return {
          success: true,
          transactionId: response.data.transaction_id,
          amount: response.data.amount,
          phoneNumber: response.data.phone_number,
          country: response.data.country,
          status: response.data.status || 'completed',
          message: 'Money sent successfully',
          timestamp: new Date().toISOString(),
        };
      } else {
        throw new Error(response.data.message || 'Failed to send money');
      }
    } catch (error) {
      console.error('[Wave] Send money failed:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<WaveGetTransactionStatusResponse> {
    try {
      const response = await this.client.get<any>(`/transfers/${transactionId}`);

      return {
        success: response.data.success,
        transactionId: response.data.transaction_id,
        status: response.data.status,
        amount: response.data.amount,
        phoneNumber: response.data.phone_number,
        country: response.data.country,
        failureReason: response.data.failure_reason,
      };
    } catch (error) {
      console.error('[Wave] Get transaction status failed:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<WaveGetBalanceResponse> {
    try {
      const response = await this.client.get<any>('/account/balance');

      return {
        success: response.data.success,
        balance: response.data.balance,
        currency: response.data.currency,
        lastUpdated: response.data.last_updated,
      };
    } catch (error) {
      console.error('[Wave] Get balance failed:', error);
      throw error;
    }
  }

  /**
   * Verify phone number is valid for a country
   */
  async verifyPhoneNumber(phoneNumber: string, country: string): Promise<boolean> {
    try {
      const response = await this.client.post<any>('/verify/phone', {
        phone_number: phoneNumber,
        country: country,
      });

      return response.data.valid === true;
    } catch (error) {
      console.error('[Wave] Verify phone number failed:', error);
      return false;
    }
  }

  /**
   * Get supported countries
   */
  async getSupportedCountries(): Promise<string[]> {
    try {
      const response = await this.client.get<any>('/countries');
      return response.data.countries || [];
    } catch (error) {
      console.error('[Wave] Get supported countries failed:', error);
      return [];
    }
  }

  /**
   * Generate unique reference
   */
  private generateReference(): string {
    return `WAVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Wave Withdrawal Flow for Afritok
 *
 * INSTANT WITHDRAWAL PROCESS:
 * ===========================
 * 1. User clicks "Withdraw"
 * 2. User selects country (auto-detected from profile)
 * 3. User enters phone number
 * 4. User confirms amount
 * 5. System calls wave.sendMoney()
 * 6. Money arrives IMMEDIATELY in Mobile Money account
 * 7. User sees success notification
 * 8. Transaction recorded in database
 *
 * SUPPORTED COUNTRIES (15+):
 * ==========================
 * - Senegal (SN) - Orange Money, Wave, Free Money
 * - Mali (ML) - Orange Money, Malitel Money
 * - Côte d'Ivoire (CI) - Orange Money, MTN Money
 * - Burkina Faso (BF) - Orange Money, Moov Money
 * - Benin (BJ) - MTN Money, Moov Money
 * - Togo (TG) - Orange Money, Moov Money
 * - Niger (NE) - Orange Money, Moov Money
 * - Guinea (GN) - Orange Money, Sotelgui Money
 * - Cameroon (CM) - Orange Money, MTN Money
 * - Gabon (GA) - Orange Money
 * - RDC (CD) - Airtel Money, Orange Money
 * - Tchad (TD) - Orange Money
 * - Mauritania (MR) - Chinguitel Money, Maroc Telecom Money
 * - Burundi (BI) - Lumitel Money
 * - Rwanda (RW) - MTN Money, Airtel Money
 *
 * MOBILE MONEY PROVIDERS:
 * ======================
 * - MTN Mobile Money (West & East Africa)
 * - Orange Money (West & Central Africa)
 * - Airtel Money (West & East Africa)
 * - Wave (Senegal, Mali, Côte d'Ivoire, Burkina Faso, Benin, Togo)
 * - Moov Money (West Africa)
 * - Free Money (Senegal)
 * - And many more...
 *
 * FEES:
 * =====
 * - Wave: 1% per transaction (lowest in Africa)
 * - Example: $10 withdrawal → User pays $0.10 fee
 * - Very affordable for users
 *
 * SPEED:
 * ======
 * - Instant (0-30 seconds)
 * - User sees money in account immediately
 * - No waiting, no pending status
 */

export default WaveClient;
