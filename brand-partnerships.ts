/**
 * Brand Partnerships - Collaborations sponsorisées
 * 
 * Gère :
 * - Création et gestion de campagnes de marque
 * - Invitations aux créateurs
 * - Contrats et conditions
 * - Paiements aux créateurs
 * - Suivi des performances
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour une campagne de marque
 */
export interface BrandCampaign {
  id: string;
  brandId: number;
  brandName: string;
  title: string;
  description: string;
  budget: number; // en cents
  currency: string;
  paymentPerCreator: number; // en cents
  requiredFollowers: number;
  requiredEngagementRate: number; // pourcentage
  category: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour une invitation à une campagne
 */
export interface CampaignInvitation {
  id: string;
  campaignId: string;
  creatorId: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  paymentAmount: number; // en cents
  deliverableUrl?: string;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * Interface pour un paiement de partenariat
 */
export interface PartnershipPayment {
  id: string;
  campaignId: string;
  creatorId: number;
  invitationId: string;
  amount: number; // en cents
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: 'stripe' | 'mtn' | 'orange' | 'wave' | 'airtel';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Classe pour gérer les Brand Partnerships
 */
export class BrandPartnershipsManager {
  private campaigns: Map<string, BrandCampaign> = new Map();
  private invitations: Map<string, CampaignInvitation> = new Map();
  private payments: Map<string, PartnershipPayment> = new Map();
  private campaignInvitations: Map<string, string[]> = new Map(); // campaignId -> invitationIds
  private creatorInvitations: Map<number, string[]> = new Map(); // creatorId -> invitationIds
  private creatorPayments: Map<number, string[]> = new Map(); // creatorId -> paymentIds

  /**
   * Créer une campagne de marque
   */
  createCampaign(
    brandId: number,
    brandName: string,
    title: string,
    description: string,
    budget: number,
    paymentPerCreator: number,
    requiredFollowers: number,
    requiredEngagementRate: number,
    category: string,
    startDate: Date,
    endDate: Date,
    currency: string = 'USD'
  ): BrandCampaign {
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const campaign: BrandCampaign = {
      id: campaignId,
      brandId,
      brandName,
      title,
      description,
      budget,
      currency,
      paymentPerCreator,
      requiredFollowers,
      requiredEngagementRate,
      category,
      startDate,
      endDate,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.campaigns.set(campaignId, campaign);
    this.campaignInvitations.set(campaignId, []);

    logger.info('Brand campaign created', {
      campaignId,
      brandId,
      title,
      budget,
    });

    return campaign;
  }

  /**
   * Obtenir une campagne
   */
  getCampaign(campaignId: string): BrandCampaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Activer une campagne
   */
  activateCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      logger.warn('Campaign not found', { campaignId });
      return false;
    }

    campaign.status = 'active';
    campaign.updatedAt = new Date();

    logger.info('Campaign activated', { campaignId, title: campaign.title });

    return true;
  }

  /**
   * Inviter un créateur à une campagne
   */
  inviteCreator(campaignId: string, creatorId: number): CampaignInvitation | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      logger.warn('Campaign not found', { campaignId });
      return null;
    }

    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const invitation: CampaignInvitation = {
      id: invitationId,
      campaignId,
      creatorId,
      status: 'pending',
      paymentAmount: campaign.paymentPerCreator,
      createdAt: new Date(),
    };

    this.invitations.set(invitationId, invitation);

    // Ajouter à la liste des invitations de la campagne
    this.campaignInvitations.get(campaignId)!.push(invitationId);

    // Ajouter à la liste des invitations du créateur
    if (!this.creatorInvitations.has(creatorId)) {
      this.creatorInvitations.set(creatorId, []);
    }
    this.creatorInvitations.get(creatorId)!.push(invitationId);

    logger.info('Creator invited to campaign', {
      invitationId,
      campaignId,
      creatorId,
    });

    return invitation;
  }

  /**
   * Obtenir une invitation
   */
  getInvitation(invitationId: string): CampaignInvitation | undefined {
    return this.invitations.get(invitationId);
  }

  /**
   * Accepter une invitation
   */
  acceptInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return false;
    }

    invitation.status = 'accepted';

    logger.info('Invitation accepted', {
      invitationId,
      campaignId: invitation.campaignId,
      creatorId: invitation.creatorId,
    });

    return true;
  }

  /**
   * Rejeter une invitation
   */
  rejectInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return false;
    }

    invitation.status = 'rejected';

    logger.info('Invitation rejected', {
      invitationId,
      campaignId: invitation.campaignId,
      creatorId: invitation.creatorId,
    });

    return true;
  }

  /**
   * Soumettre un livrable pour une invitation
   */
  submitDeliverable(invitationId: string, deliverableUrl: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return false;
    }

    if (invitation.status !== 'accepted') {
      logger.warn('Invitation not accepted', { invitationId, status: invitation.status });
      return false;
    }

    invitation.deliverableUrl = deliverableUrl;
    invitation.submittedAt = new Date();

    logger.info('Deliverable submitted', {
      invitationId,
      campaignId: invitation.campaignId,
    });

    return true;
  }

  /**
   * Approuver un livrable et créer un paiement
   */
  approveDeliverable(invitationId: string): PartnershipPayment | null {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return null;
    }

    if (!invitation.deliverableUrl) {
      logger.warn('No deliverable submitted', { invitationId });
      return null;
    }

    invitation.status = 'completed';
    invitation.completedAt = new Date();

    // Créer un paiement
    const campaign = this.campaigns.get(invitation.campaignId);
    if (!campaign) {
      logger.warn('Campaign not found', { campaignId: invitation.campaignId });
      return null;
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment: PartnershipPayment = {
      id: paymentId,
      campaignId: invitation.campaignId,
      creatorId: invitation.creatorId,
      invitationId,
      amount: invitation.paymentAmount,
      currency: campaign.currency,
      status: 'pending',
      createdAt: new Date(),
    };

    this.payments.set(paymentId, payment);

    // Ajouter à la liste des paiements du créateur
    if (!this.creatorPayments.has(invitation.creatorId)) {
      this.creatorPayments.set(invitation.creatorId, []);
    }
    this.creatorPayments.get(invitation.creatorId)!.push(paymentId);

    logger.info('Deliverable approved and payment created', {
      paymentId,
      invitationId,
      amount: payment.amount,
    });

    return payment;
  }

  /**
   * Obtenir les invitations d'un créateur
   */
  getCreatorInvitations(creatorId: number): CampaignInvitation[] {
    const invitationIds = this.creatorInvitations.get(creatorId) || [];
    return invitationIds
      .map((id) => this.invitations.get(id))
      .filter((i) => i !== undefined) as CampaignInvitation[];
  }

  /**
   * Obtenir les invitations d'une campagne
   */
  getCampaignInvitations(campaignId: string): CampaignInvitation[] {
    const invitationIds = this.campaignInvitations.get(campaignId) || [];
    return invitationIds
      .map((id) => this.invitations.get(id))
      .filter((i) => i !== undefined) as CampaignInvitation[];
  }

  /**
   * Obtenir les paiements d'un créateur
   */
  getCreatorPayments(creatorId: number): PartnershipPayment[] {
    const paymentIds = this.creatorPayments.get(creatorId) || [];
    return paymentIds
      .map((id) => this.payments.get(id))
      .filter((p) => p !== undefined) as PartnershipPayment[];
  }

  /**
   * Obtenir les revenus totaux d'un créateur
   */
  getCreatorPartnershipEarnings(creatorId: number): number {
    const payments = this.getCreatorPayments(creatorId);
    return payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Marquer un paiement comme complété
   */
  completePayment(paymentId: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      return false;
    }

    payment.status = 'completed';
    payment.completedAt = new Date();

    logger.info('Partnership payment completed', {
      paymentId,
      creatorId: payment.creatorId,
      amount: payment.amount,
    });

    return true;
  }

  /**
   * Obtenir les statistiques des partenariats
   */
  getPartnershipStats(): {
    totalCampaigns: number;
    totalInvitations: number;
    totalPayments: number;
    totalSpent: number;
  } {
    let totalPayments = 0;
    let totalSpent = 0;

    this.payments.forEach((payment) => {
      if (payment.status === 'completed') {
        totalPayments += 1;
        totalSpent += payment.amount;
      }
    });

    return {
      totalCampaigns: this.campaigns.size,
      totalInvitations: this.invitations.size,
      totalPayments,
      totalSpent,
    };
  }
}

// Singleton instance
let partnershipsManager: BrandPartnershipsManager | null = null;

export function getBrandPartnershipsManager(): BrandPartnershipsManager {
  if (!partnershipsManager) {
    partnershipsManager = new BrandPartnershipsManager();
  }
  return partnershipsManager;
}
